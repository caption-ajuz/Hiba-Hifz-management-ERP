import { Router, Response } from 'express';
import { HifzRecord } from '../models/HifzRecord';
import { Student } from '../models/Student';
import { emitHifzRecordCreated, emitHifzRecordUpdated } from '../socket';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
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

// Helper: check if a student is assigned to an Usthad
async function isStudentAssignedToUsthad(usthadId: string, assignedClassIds: string[] | undefined, studentId: string): Promise<boolean> {
  const student = await Student.findOne({ id: studentId }).lean();
  if (!student) return false;
  if (student.assignedTeacherId === usthadId) return true;
  if (assignedClassIds && assignedClassIds.includes(student.classId)) return true;
  return false;
}

// GET /api/hifz - List records with role-scoped filtering & pagination
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { studentId, recordType, date, page, limit } = req.query;

    const query: any = {};
    if (recordType) query.recordType = recordType;
    if (date) query.date = date;

    // Strict Role-Based Query Isolation:
    if (user.role === 'STUDENT') {
      // Students can ONLY ever view their own records
      query.studentId = user.studentId || '__none__';
    } else if (user.role === 'PARENT') {
      // Parents can ONLY view records for their linked children
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
      // Usthad can only view records for students in their assigned classes or assigned directly to them
      if (studentId) {
        const assigned = await isStudentAssignedToUsthad(user.id, user.assignedClassIds, String(studentId));
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
            { classId: { $in: user.assignedClassIds || [] } },
          ],
        }).select('id').lean();
        const myStudentIds = myStudents.map((s) => s.id);
        query.studentId = { $in: myStudentIds };
      }
    } else {
      // SUPER_ADMIN can view all, or filter by specific studentId if requested
      if (studentId) query.studentId = String(studentId);
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

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

// POST /api/hifz - Create Hifz record (Sabaq, Sabqi, Murajath, Manzil)
// SUPER_ADMIN or assigned USTHAD only! Parents & Students forbidden!
router.post('/', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
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

    // Verify Usthad is authorized for this student
    if (user.role === 'USTHAD') {
      const assigned = await isStudentAssignedToUsthad(user.id, user.assignedClassIds, data.studentId);
      if (!assigned) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: You can only record Hifz evaluation for your assigned students.',
        });
      }
    }

    const recordId = data.id || `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newRecord = await HifzRecord.create({
      ...data,
      teacherId: user.role === 'USTHAD' ? user.id : data.teacherId,
      id: recordId,
    });

    // If Sabq was passed with Ayah counts, update student's totalMemorizedAyahs
    if (data.recordType === 'SABQ' && data.status === 'Passed' && data.startAyah && data.endAyah) {
      const ayahsLearned = Math.max(1, data.endAyah - data.startAyah + 1);
      await Student.updateOne(
        { id: data.studentId },
        { $inc: { totalMemorizedAyahs: ayahsLearned } }
      );
    }

    // If Manzil was passed and juzNumber is provided, add to student completedJuzList if not present
    if (data.recordType === 'MANZIL' && data.status === 'Passed' && data.juzNumber) {
      await Student.updateOne(
        { id: data.studentId },
        { $addToSet: { completedJuzList: data.juzNumber } }
      );
    }

    // Emit real-time event immediately
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

// PUT /api/hifz/:id - Update Hifz record (SUPER_ADMIN or assigned USTHAD only)
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const existing = await HifzRecord.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Hifz record not found' });
    }

    if (user.role === 'USTHAD') {
      const assigned = await isStudentAssignedToUsthad(user.id, user.assignedClassIds, existing.studentId);
      if (!assigned) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: You cannot modify records of unassigned students.',
        });
      }
    }

    const updated = await HifzRecord.findOneAndUpdate(
      { id },
      { $set: req.body },
      { new: true }
    );

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
