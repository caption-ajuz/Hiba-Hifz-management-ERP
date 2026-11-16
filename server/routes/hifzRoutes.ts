import { Router, Response } from 'express';
import { HifzRecord } from '../models/HifzRecord';
import { Student } from '../models/Student';
import { emitHifzRecordCreated, emitHifzRecordUpdated } from '../socket';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { isMongoReady, getRuntimeDb, saveRuntimeDb } from '../config/runtimeStore';
import { resolveEffectiveAssignedClassIds } from '../utils/accessHelpers';
import { z } from 'zod';

const router = Router();

const hifzRecordSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1),
  teacherId: z.string().min(1),
  classId: z.string().optional(),
  date: z.string().min(1),
  recordType: z.enum(['SABQ', 'SABQI', 'MURAJATH', 'MANZIL']),
  surahNumber: z.number().optional(),
  surahName: z.string().optional(),
  surahArabic: z.string().optional(),
  startAyah: z.number().optional(),
  endAyah: z.number().optional(),
  juzNumber: z.number().optional(),
  juzName: z.string().optional(),
  surahRangeText: z.string().optional(),
  performance: z.enum(['Excellent', 'Good', 'Average', 'Needs Improvement']).default('Good'),
  mistakeCount: z.number().default(0),
  status: z.enum(['Passed', 'Revision Required', 'Not Passed']).default('Passed'),
  teacherRemarks: z.string().default(''),
  nextLessonConfirmed: z.boolean().default(false),
  nextLessonPosition: z.string().optional(),
  academicYear: z.string().default('2026 - 2027'),
});

async function isStudentAssignedToUsthad(
  usthadId: string,
  assignedClassIds: string[] | undefined,
  studentId: string
): Promise<boolean> {
  const student = isMongoReady()
    ? await Student.findOne({ id: studentId }).lean()
    : getRuntimeDb().students.find((s) => s.id === studentId);
  if (!student) return false;
  if (student.assignedTeacherId === usthadId) return true;
  if (assignedClassIds && assignedClassIds.includes(student.classId)) return true;
  return false;
}

// GET /api/hifz - List records with role-scoped & campus-scoped filtering
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { studentId, recordType, date, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string) || 200));
    const skip = (pageNum - 1) * limitNum;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      let list = [...db.hifzRecords];
      if (recordType) list = list.filter((r) => r.recordType === recordType);
      if (date) list = list.filter((r) => r.date === date);

      if (user.role === 'STUDENT') {
        list = list.filter((r) => r.studentId === (user.studentId || '__none__'));
      } else if (user.role === 'PARENT') {
        const linked = user.linkedStudentIds || [];
        if (studentId) {
          if (!linked.includes(String(studentId))) {
            return res.status(403).json({
              success: false,
              error: 'Access forbidden: You may only view Hifz records of your linked children.',
            });
          }
          list = list.filter((r) => r.studentId === String(studentId));
        } else {
          list = list.filter((r) => linked.includes(r.studentId));
        }
      } else if (user.role === 'USTHAD') {
        const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
        if (studentId) {
          const assigned = await isStudentAssignedToUsthad(user.id, effectiveClassIds, String(studentId));
          if (!assigned) {
            return res.status(403).json({
              success: false,
              error: 'Access forbidden: Student is not assigned to your mentorship.',
            });
          }
          list = list.filter((r) => r.studentId === String(studentId));
        } else {
          const myStudentIds = db.students
            .filter((s) => s.assignedTeacherId === user.id || effectiveClassIds.includes(s.classId))
            .map((s) => s.id);
          list = list.filter((r) => myStudentIds.includes(r.studentId));
        }
      } else if (user.role === 'MUDEER') {
        if (user.campusId) {
          const campusStudentIds = db.students
            .filter((s) => s.campusId === user.campusId)
            .map((s) => s.id);
          list = list.filter((r) => campusStudentIds.includes(r.studentId));
        }
        if (studentId) list = list.filter((r) => r.studentId === String(studentId));
      } else {
        if (studentId) list = list.filter((r) => r.studentId === String(studentId));
      }

      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const total = list.length;
      return res.json({
        success: true,
        data: list.slice(skip, skip + limitNum),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    const query: any = {};
    if (recordType) query.recordType = recordType;
    if (date) query.date = date;

    if (user.role === 'STUDENT') {
      query.studentId = user.studentId || '__none__';
    } else if (user.role === 'PARENT') {
      const linked = user.linkedStudentIds || [];
      if (studentId) {
        if (!linked.includes(String(studentId))) {
          return res.status(403).json({
            success: false,
            error: 'Access forbidden: You may only view Hifz records of your linked children.',
          });
        }
        query.studentId = String(studentId);
      } else {
        query.studentId = { $in: linked };
      }
    } else if (user.role === 'USTHAD') {
      const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
      if (studentId) {
        const assigned = await isStudentAssignedToUsthad(user.id, effectiveClassIds, String(studentId));
        if (!assigned) {
          return res.status(403).json({
            success: false,
            error: 'Access forbidden: Student is not assigned to your mentorship.',
          });
        }
        query.studentId = String(studentId);
      } else {
        const myStudents = await Student.find({
          $or: [
            { assignedTeacherId: user.id },
            { classId: { $in: effectiveClassIds } },
          ],
        })
          .select('id')
          .lean();
        query.studentId = { $in: myStudents.map((s) => s.id) };
      }
    } else if (user.role === 'MUDEER') {
      if (user.campusId) {
        const campusStudents = await Student.find({ campusId: user.campusId }).select('id').lean();
        const campusStudentIds = campusStudents.map((s) => s.id);
        if (studentId) {
          if (!campusStudentIds.includes(String(studentId))) {
            return res.status(403).json({ success: false, error: 'Access forbidden: Student belongs to another campus.' });
          }
          query.studentId = String(studentId);
        } else {
          query.studentId = { $in: campusStudentIds };
        }
      } else if (studentId) {
        query.studentId = String(studentId);
      }
    } else {
      if (studentId) query.studentId = String(studentId);
    }

    const [records, total] = await Promise.all([
      HifzRecord.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      HifzRecord.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error('[Hifz] Query error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve Hifz records' });
  }
});

// POST /api/hifz - Create Hifz record (MUDEER or assigned USTHAD only)
router.post('/', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const parse = hifzRecordSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid Hifz record payload',
      });
    }

    const data = parse.data;

    if (user.role === 'USTHAD') {
      const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
      const assigned = await isStudentAssignedToUsthad(user.id, effectiveClassIds, data.studentId);
      if (!assigned) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: You can only record Hifz evaluation for your assigned students.',
        });
      }
    }

    const recordId = data.id || `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const student = db.students.find((s) => s.id === data.studentId);
      if (user.role === 'MUDEER' && user.campusId && student && student.campusId !== user.campusId) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Student belongs to another campus.' });
      }
      const newRecord = {
        ...data,
        teacherId: user.role === 'USTHAD' ? user.id : data.teacherId,
        id: recordId,
      };
      db.hifzRecords.unshift(newRecord);
      if (student && data.recordType === 'SABQ' && data.status === 'Passed' && data.startAyah && data.endAyah) {
        const ayahsLearned = Math.max(1, data.endAyah - data.startAyah + 1);
        student.totalMemorizedAyahs = (student.totalMemorizedAyahs || 0) + ayahsLearned;
      }
      if (student && data.recordType === 'MANZIL' && data.status === 'Passed' && data.juzNumber) {
        if (!student.completedJuzList.includes(data.juzNumber)) {
          student.completedJuzList.push(data.juzNumber);
        }
      }
      saveRuntimeDb(db);
      emitHifzRecordCreated(newRecord);
      return res.status(201).json({
        success: true,
        message: 'Hifz record saved and broadcasted successfully.',
        data: newRecord,
      });
    }

    if (user.role === 'MUDEER' && user.campusId) {
      const student = await Student.findOne({ id: data.studentId }).lean();
      if (student && student.campusId !== user.campusId) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Student belongs to another campus.' });
      }
    }

    const newRecord = await HifzRecord.create({
      ...data,
      teacherId: user.role === 'USTHAD' ? user.id : data.teacherId,
      id: recordId,
    });

    if (data.recordType === 'SABQ' && data.status === 'Passed' && data.startAyah && data.endAyah) {
      const ayahsLearned = Math.max(1, data.endAyah - data.startAyah + 1);
      await Student.updateOne({ id: data.studentId }, { $inc: { totalMemorizedAyahs: ayahsLearned } });
    }

    if (data.recordType === 'MANZIL' && data.status === 'Passed' && data.juzNumber) {
      await Student.updateOne({ id: data.studentId }, { $addToSet: { completedJuzList: data.juzNumber } });
    }

    emitHifzRecordCreated(newRecord);

    await logAuditEvent('HIFZ_RECORD_CREATE', user, 'HifzRecord', recordId, {
      studentId: data.studentId,
      recordType: data.recordType,
      status: data.status,
    });

    return res.status(201).json({
      success: true,
      message: 'Hifz record saved and broadcasted successfully.',
      data: newRecord,
    });
  } catch (err: any) {
    console.error('[Hifz] Create record error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record Hifz evaluation' });
  }
});

// PUT /api/hifz/:id - Update Hifz record (MUDEER or assigned USTHAD only)
router.put('/:id', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const idx = db.hifzRecords.findIndex((r) => r.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Hifz record not found' });
      const existing = db.hifzRecords[idx];
      if (user.role === 'USTHAD') {
        const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
        const assigned = await isStudentAssignedToUsthad(user.id, effectiveClassIds, existing.studentId);
        if (!assigned) {
          return res.status(403).json({
            success: false,
            error: 'Access forbidden: You cannot modify records of unassigned students.',
          });
        }
      }
      db.hifzRecords[idx] = { ...existing, ...req.body };
      saveRuntimeDb(db);
      emitHifzRecordUpdated(db.hifzRecords[idx]);
      return res.json({ success: true, data: db.hifzRecords[idx] });
    }

    const existing = await HifzRecord.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Hifz record not found' });
    }

    if (user.role === 'USTHAD') {
      const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
      const assigned = await isStudentAssignedToUsthad(user.id, effectiveClassIds, existing.studentId);
      if (!assigned) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: You cannot modify records of unassigned students.',
        });
      }
    }

    const updated = await HifzRecord.findOneAndUpdate({ id }, { $set: req.body }, { new: true });

    if (updated) {
      emitHifzRecordUpdated(updated);
      await logAuditEvent('HIFZ_RECORD_UPDATE', user, 'HifzRecord', id, req.body);
    }

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update Hifz record' });
  }
});

export default router;
