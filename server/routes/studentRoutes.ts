import { Router, Response } from 'express';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { ClassBatch } from '../models/ClassBatch';
import { deleteFromCloudinary } from '../config/cloudinary';
import { emitStudentUpdated } from '../socket';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { isMongoReady, getRuntimeDb, saveRuntimeDb } from '../config/runtimeStore';
import {
  resolveEffectiveAssignedClassIds,
  resolveCampusBatchFromValue,
  normalizeDobString,
  buildDefaultStudentPassword,
  ensureStudentUserAccount,
} from '../utils/accessHelpers';
import { z } from 'zod';

const router = Router();

const studentSchema = z.object({
  id: z.string().optional(),
  rollNumber: z.number().min(1),
  admissionNumber: z.string().min(1),
  fullName: z.string().min(1),
  arabicName: z.string().optional(),
  photo: z.string().optional(),
  photoPublicId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female']).default('Male'),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  parentEmail: z.string().optional(),
  admissionDate: z.string().optional(),
  campusId: z.string().default('campus-main'),
  classId: z.string().min(1),
  assignedTeacherId: z.string().optional(),
  accountStatus: z.enum(['Active', 'On Leave', 'Completed']).default('Active'),
  currentJuz: z.number().min(1).max(30).default(1),
  completedJuzList: z.array(z.number()).default([]),
  totalMemorizedAyahs: z.number().default(0),
  attendanceRate: z.number().default(95),
});

function getRowField(row: Record<string, any>, candidates: string[]): string {
  const entries = Object.entries(row || {});
  for (const cand of candidates) {
    if (row[cand] !== undefined && row[cand] !== null && String(row[cand]).trim() !== '') {
      return String(row[cand]).trim();
    }
    const lowerCand = cand.toLowerCase().replace(/[\s_-]+/g, '');
    const found = entries.find(([k]) => k.toLowerCase().replace(/[\s_-]+/g, '') === lowerCand);
    if (found && found[1] !== undefined && found[1] !== null && String(found[1]).trim() !== '') {
      return String(found[1]).trim();
    }
  }
  return '';
}

// GET /api/students - List all or filtered with strict RBAC & campus scoping
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { classId, campusId, search, status, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 100));
    const skip = (pageNum - 1) * limitNum;

    const effectiveClassIds =
      user.role === 'USTHAD' ? await resolveEffectiveAssignedClassIds(user) : [];

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      let list = [...db.students];

      if (status) list = list.filter((s) => s.accountStatus === status);

      if (user.role === 'STUDENT') {
        list = list.filter((s) => s.id === (user.studentId || '__none__'));
      } else if (user.role === 'PARENT') {
        const linked = user.linkedStudentIds || [];
        list = list.filter((s) => linked.includes(s.id));
      } else if (user.role === 'USTHAD') {
        if (user.campusId) list = list.filter((s) => s.campusId === user.campusId);
        if (classId) {
          if (!effectiveClassIds.includes(String(classId))) {
            return res.status(403).json({
              success: false,
              error: 'Access forbidden: You may only view students in your assigned classes.',
            });
          }
          list = list.filter((s) => s.classId === String(classId));
        } else {
          list = list.filter(
            (s) =>
              effectiveClassIds.includes(s.classId) ||
              s.assignedTeacherId === user.id ||
              (user.referenceId && s.assignedTeacherId === user.referenceId)
          );
        }
      } else if (user.role === 'MUDEER') {
        if (user.campusId) list = list.filter((s) => s.campusId === user.campusId);
        if (classId) list = list.filter((s) => s.classId === String(classId));
      } else {
        // HYBA_SUPER_ADMIN
        if (campusId) list = list.filter((s) => s.campusId === String(campusId));
        if (classId) list = list.filter((s) => s.classId === String(classId));
      }

      if (search && typeof search === 'string') {
        const q = search.trim().toLowerCase();
        list = list.filter(
          (s) =>
            (s.fullName || '').toLowerCase().includes(q) ||
            (s.admissionNumber || '').toLowerCase().includes(q) ||
            (s.arabicName || '').toLowerCase().includes(q) ||
            (s.parentName || '').toLowerCase().includes(q)
        );
      }

      list.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
      const total = list.length;
      const sliced = list.slice(skip, skip + limitNum);

      return res.json({
        success: true,
        data: sliced,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    const query: any = {};
    if (status) query.accountStatus = status;

    if (user.role === 'STUDENT') {
      query.id = user.studentId || '__none__';
    } else if (user.role === 'PARENT') {
      query.id = { $in: user.linkedStudentIds || [] };
    } else if (user.role === 'USTHAD') {
      if (user.campusId) query.campusId = user.campusId;
      if (classId) {
        const allowed = effectiveClassIds.includes(String(classId));
        if (!allowed) {
          return res.status(403).json({
            success: false,
            error: 'Access forbidden: You may only view students in your assigned classes.',
          });
        }
        query.classId = String(classId);
      } else {
        const orClauses: any[] = [
          { classId: { $in: effectiveClassIds } },
          { assignedTeacherId: user.id },
        ];
        if (user.referenceId) {
          orClauses.push({ assignedTeacherId: user.referenceId });
        }
        query.$or = orClauses;
      }
    } else if (user.role === 'MUDEER') {
      if (user.campusId) query.campusId = user.campusId;
      if (classId) query.classId = classId;
    } else {
      // HYBA_SUPER_ADMIN
      if (campusId) query.campusId = campusId;
      if (classId) query.classId = classId;
    }

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchCondition = {
        $or: [
          { fullName: searchRegex },
          { admissionNumber: searchRegex },
          { arabicName: searchRegex },
          { parentName: searchRegex },
        ],
      };

      if (query.$or) {
        query.$and = [{ $or: query.$or }, searchCondition];
        delete query.$or;
      } else {
        query.$or = searchCondition.$or;
      }
    }

    const [students, total] = await Promise.all([
      Student.find(query).sort({ rollNumber: 1 }).skip(skip).limit(limitNum).lean(),
      Student.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: students,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error('[Students] Error fetching students:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve students' });
  }
});

// GET /api/students/:id - Retrieve single student with RBAC
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (user.role === 'STUDENT' && user.studentId !== id) {
      return res.status(403).json({ success: false, error: 'Access forbidden: You may only view your own profile.' });
    }

    if (user.role === 'PARENT' && (!user.linkedStudentIds || !user.linkedStudentIds.includes(id))) {
      return res.status(403).json({ success: false, error: 'Access forbidden: You may only view linked children.' });
    }

    const student = isMongoReady()
      ? await Student.findOne({ id }).lean()
      : getRuntimeDb().students.find((s) => s.id === id);

    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (user.role === 'MUDEER' && user.campusId && student.campusId !== user.campusId) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Student belongs to another campus.' });
    }

    if (user.role === 'USTHAD') {
      const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
      const isAssigned =
        effectiveClassIds.includes(student.classId) ||
        student.assignedTeacherId === user.id ||
        student.assignedTeacherId === user.referenceId;
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Student is not in your assigned roster.' });
      }
    }

    return res.json({ success: true, data: student });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve student' });
  }
});

// POST /api/students - Create new student (MUDEER for own campus, or USTHAD for assigned classes)
router.post('/', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const parse = studentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid student data',
      });
    }

    const data = parse.data;
    const effectiveCampusId = user.campusId || data.campusId || 'campus-main';
    const normalizedDob = normalizeDobString(data.dateOfBirth);
    const studentId = data.id || `std_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const matchedClass = resolveCampusBatchFromValue(effectiveCampusId, data.classId, db.classes);
      const resolvedClassId = matchedClass?.id || data.classId;

      if (user.role === 'USTHAD') {
        const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
        if (!effectiveClassIds.includes(resolvedClassId)) {
          return res.status(403).json({
            success: false,
            error: `Access forbidden: You may only enroll students into your assigned classes (${effectiveClassIds.join(', ')}).`,
          });
        }
      }

      if (db.students.some((s) => s.admissionNumber.toLowerCase() === data.admissionNumber.trim().toLowerCase())) {
        return res.status(409).json({
          success: false,
          error: `A student with Admission No. ${data.admissionNumber} already exists.`,
        });
      }

      const newStudent = {
        ...data,
        id: studentId,
        dateOfBirth: normalizedDob,
        campusId: effectiveCampusId,
        classId: resolvedClassId,
        assignedTeacherId: matchedClass?.usthadId || (user.role === 'USTHAD' ? user.id : data.assignedTeacherId || 'usr_teacher_01'),
      };
      db.students.push(newStudent);
      const accountInfo = await ensureStudentUserAccount(newStudent, matchedClass?.name);
      saveRuntimeDb(db);
      emitStudentUpdated(newStudent);
      return res.status(201).json({
        success: true,
        data: newStudent,
        studentCredentials: accountInfo,
      });
    }

    const allClasses = await ClassBatch.find({ campusId: effectiveCampusId }).lean();
    const matchedClass = resolveCampusBatchFromValue(effectiveCampusId, data.classId, allClasses);
    const resolvedClassId = matchedClass?.id || data.classId;

    if (user.role === 'USTHAD') {
      const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
      if (!effectiveClassIds.includes(resolvedClassId)) {
        return res.status(403).json({
          success: false,
          error: `Access forbidden: You may only enroll students into your assigned classes (${effectiveClassIds.join(', ')}).`,
        });
      }
    }

    const existing = await Student.findOne({ admissionNumber: data.admissionNumber.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `A student with Admission No. ${data.admissionNumber} already exists.`,
      });
    }

    const newStudent = await Student.create({
      ...data,
      id: studentId,
      dateOfBirth: normalizedDob,
      campusId: effectiveCampusId,
      classId: resolvedClassId,
      assignedTeacherId: matchedClass?.usthadId || (user.role === 'USTHAD' ? user.id : data.assignedTeacherId || 'usr_teacher_01'),
    });

    const accountInfo = await ensureStudentUserAccount(newStudent, matchedClass?.name);

    emitStudentUpdated(newStudent);
    await logAuditEvent('STUDENT_CREATE', user, 'Student', newStudent.id, {
      fullName: newStudent.fullName,
      admissionNumber: newStudent.admissionNumber,
      classId: newStudent.classId,
      campusId: effectiveCampusId,
    });

    return res.status(201).json({
      success: true,
      data: newStudent,
      studentCredentials: accountInfo,
    });
  } catch (err: any) {
    console.error('[Students] Create error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create student' });
  }
});

// PUT /api/students/:id - Update student (MUDEER within campus, assigned USTHAD, or STUDENT self photo)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    if (user.role === 'HYBA_SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'HYBA Super Admin manages campuses and Mudeers; student edits are handled by Campus Mudeer.',
      });
    }

    const effectiveClassIds =
      user.role === 'USTHAD' ? await resolveEffectiveAssignedClassIds(user) : [];

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const idx = db.students.findIndex((s) => s.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Student not found' });
      const existing = db.students[idx];

      if (user.role === 'MUDEER' && user.campusId && existing.campusId !== user.campusId) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Student belongs to another campus.' });
      }
      if (user.role === 'STUDENT') {
        if (user.studentId !== id) {
          return res.status(403).json({ success: false, error: 'Access forbidden: You can only edit your own profile.' });
        }
        const allowedKeys = ['photo', 'photoPublicId', 'phone'];
        const filteredBody: any = {};
        for (const k of allowedKeys) {
          if (req.body[k] !== undefined) filteredBody[k] = req.body[k];
        }
        req.body = filteredBody;
      } else if (user.role === 'PARENT') {
        return res.status(403).json({ success: false, error: 'Access forbidden: Parents have read-only access.' });
      } else if (user.role === 'USTHAD') {
        const isAssigned =
          effectiveClassIds.includes(existing.classId) ||
          existing.assignedTeacherId === user.id ||
          existing.assignedTeacherId === user.referenceId;
        if (!isAssigned) {
          return res.status(403).json({ success: false, error: 'Access forbidden: You can only update assigned students.' });
        }
      }

      const payload = { ...req.body };
      if (user.role === 'MUDEER' && user.campusId) {
        payload.campusId = user.campusId;
      }

      // Automatically synchronize assignedTeacherId when batch/classId changes
      if (payload.classId) {
        const targetClass = resolveCampusBatchFromValue(existing.campusId, payload.classId, db.classes);
        if (targetClass) {
          payload.classId = targetClass.id;
          payload.assignedTeacherId = targetClass.usthadId;
        }
        const linkedUser = db.users.find((u) => u.studentId === id || u.referenceId === existing.admissionNumber);
        if (linkedUser) {
          linkedUser.assignedClassIds = [payload.classId];
          if (targetClass?.name) linkedUser.title = `Student · ${targetClass.name}`;
        }
      }

      db.students[idx] = { ...existing, ...payload };
      saveRuntimeDb(db);
      emitStudentUpdated(db.students[idx]);
      return res.json({ success: true, data: db.students[idx] });
    }

    const existing = await Student.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (user.role === 'MUDEER' && user.campusId && existing.campusId !== user.campusId) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Student belongs to another campus.' });
    }

    if (user.role === 'STUDENT') {
      if (user.studentId !== id) {
        return res.status(403).json({ success: false, error: 'Access forbidden: You can only edit your own profile.' });
      }
      const allowedKeys = ['photo', 'photoPublicId', 'phone'];
      const filteredBody: any = {};
      for (const k of allowedKeys) {
        if (req.body[k] !== undefined) filteredBody[k] = req.body[k];
      }
      req.body = filteredBody;
    } else if (user.role === 'PARENT') {
      return res.status(403).json({ success: false, error: 'Access forbidden: Parents have read-only access.' });
    } else if (user.role === 'USTHAD') {
      const isAssigned =
        effectiveClassIds.includes(existing.classId) ||
        existing.assignedTeacherId === user.id ||
        existing.assignedTeacherId === user.referenceId;
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: 'Access forbidden: You can only update assigned students.' });
      }
    }

    if (req.body.photoPublicId && existing.photoPublicId && req.body.photoPublicId !== existing.photoPublicId) {
      await deleteFromCloudinary(existing.photoPublicId);
    }

    const payload = { ...req.body };
    if (user.role === 'MUDEER' && user.campusId) {
      payload.campusId = user.campusId;
    }

    if (payload.classId) {
      const campusClasses = await ClassBatch.find({ campusId: existing.campusId }).lean();
      const targetClass = resolveCampusBatchFromValue(existing.campusId, payload.classId, campusClasses);
      if (targetClass) {
        payload.classId = targetClass.id;
        payload.assignedTeacherId = targetClass.usthadId;
        await User.updateOne(
          { $or: [{ studentId: id }, { referenceId: existing.admissionNumber }] },
          { $set: { assignedClassIds: [targetClass.id], title: `Student · ${targetClass.name}` } }
        );
      }
    }

    const updated = await Student.findOneAndUpdate({ id }, { $set: payload }, { new: true });

    if (updated) {
      emitStudentUpdated(updated);
      await logAuditEvent('STUDENT_UPDATE', user, 'Student', id, payload);
    }

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update student' });
  }
});

// DELETE /api/students/:id - MUDEER (within campus) or assigned USTHAD
router.delete('/:id', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const effectiveClassIds =
      user.role === 'USTHAD' ? await resolveEffectiveAssignedClassIds(user) : [];

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const existing = db.students.find((s) => s.id === id);
      if (!existing) return res.status(404).json({ success: false, error: 'Student not found' });

      if (user.role === 'MUDEER' && user.campusId && existing.campusId !== user.campusId) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Student belongs to another campus.' });
      }
      if (user.role === 'USTHAD') {
        const isAssigned =
          effectiveClassIds.includes(existing.classId) ||
          existing.assignedTeacherId === user.id ||
          existing.assignedTeacherId === user.referenceId;
        if (!isAssigned) {
          return res.status(403).json({
            success: false,
            error: 'Access forbidden: You can only delete students in your assigned classes.',
          });
        }
      }

      db.students = db.students.filter((s) => s.id !== id);
      db.users = db.users.filter(
        (u) => u.id !== id && u.referenceId !== existing.admissionNumber && u.studentId !== id
      );
      saveRuntimeDb(db);
      return res.json({ success: true, message: 'Student record deleted successfully' });
    }

    const existing = await Student.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (user.role === 'MUDEER' && user.campusId && existing.campusId !== user.campusId) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Student belongs to another campus.' });
    }

    if (user.role === 'USTHAD') {
      const isAssigned =
        effectiveClassIds.includes(existing.classId) ||
        existing.assignedTeacherId === user.id ||
        existing.assignedTeacherId === user.referenceId;
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: You can only delete students in your assigned classes.',
        });
      }
    }

    if (existing.photoPublicId) {
      await deleteFromCloudinary(existing.photoPublicId);
    }

    await Student.deleteOne({ id });
    await User.deleteOne({ $or: [{ id }, { referenceId: existing.admissionNumber }, { studentId: id }] });

    await logAuditEvent('STUDENT_DELETE', req.user, 'Student', id, { name: existing.fullName });

    return res.json({ success: true, message: 'Student record deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete student' });
  }
});

// POST /api/students/import-csv - Reliable CSV Import scoped to MUDEER campus or USTHAD classes
router.post('/import-csv', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { rows, isCommit } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid or empty CSV payload.' });
    }

    const totalRows = rows.length;
    const successfulRows: any[] = [];
    const duplicateRows: any[] = [];
    const failedRows: any[] = [];

    const existingStudents = isMongoReady()
      ? await Student.find().select('admissionNumber rollNumber classId id').lean()
      : getRuntimeDb().students;

    const allClasses = isMongoReady()
      ? await ClassBatch.find().lean()
      : getRuntimeDb().classes;

    const effectiveClassIds =
      user.role === 'USTHAD' ? await resolveEffectiveAssignedClassIds(user) : [];

    const existingAdmMap = new Set(
      existingStudents.map((s: any) => String(s.admissionNumber || '').toLowerCase().trim())
    );
    const seenBatchAdm = new Set<string>();
    const startingRoll = existingStudents.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const fullName = getRowField(row, ['full_name', 'Full Name', 'student_name', 'Student Name', 'name', 'Name']);
      const admissionNumber = getRowField(row, [
        'admission_number',
        'Admission Number',
        'Admission No',
        'admission_no',
        'student_id',
        'Student ID',
        'Adm No',
      ]);
      const rollRaw = getRowField(row, ['roll_number', 'Roll Number', 'roll', 'Roll', 'roll_no']);
      const rollNumber = parseInt(rollRaw || '0', 10) || startingRoll + rowNum;
      const rawDob = getRowField(row, ['date_of_birth', 'Date of Birth', 'dob', 'DOB']);
      const dob = normalizeDobString(rawDob);
      const rawGender = getRowField(row, ['gender', 'Gender']);
      const gender = rawGender.toLowerCase() === 'female' ? 'Female' : 'Male';
      const parentName = getRowField(row, ['parent_name', 'Parent Name', 'guardian_name', 'Guardian Name', 'guardian']);
      const parentPhone = getRowField(row, ['parent_phone', 'Parent Phone', 'phone', 'Phone', 'mobile', 'Mobile']);
      const campusId = user.campusId || getRowField(row, ['campus_id', 'campus', 'Campus']) || 'campus-main';
      const rawBatchValue = getRowField(row, ['batch', 'Batch', 'batch_name', 'Batch Name', 'class', 'class_id', 'Class']);

      if (!fullName || !admissionNumber) {
        failedRows.push({
          rowNumber: rowNum,
          admissionNumber,
          fullName,
          error: 'Missing required full_name or admission_number.',
        });
        continue;
      }

      const matchedClass = resolveCampusBatchFromValue(campusId, rawBatchValue, allClasses);
      if (rawBatchValue && !matchedClass) {
        failedRows.push({
          rowNumber: rowNum,
          admissionNumber,
          fullName,
          error: `Batch '${rawBatchValue}' not recognized in campus. Use A, B, or an existing batch name.`,
        });
        continue;
      }

      const classId = matchedClass?.id || 'batch-a';

      if (user.role === 'USTHAD') {
        const isClassAllowed = effectiveClassIds.includes(classId);
        if (!isClassAllowed) {
          failedRows.push({
            rowNumber: rowNum,
            admissionNumber,
            fullName,
            error: `Batch '${matchedClass?.name || classId}' is outside your permitted Usthad scope.`,
          });
          continue;
        }
      }

      const lowerAdm = admissionNumber.toLowerCase();
      if (existingAdmMap.has(lowerAdm) || seenBatchAdm.has(lowerAdm)) {
        duplicateRows.push({
          rowNumber: rowNum,
          admissionNumber,
          fullName,
          error: `Admission number '${admissionNumber}' already exists in database or import file.`,
        });
        continue;
      }

      seenBatchAdm.add(lowerAdm);

      const arabicName = getRowField(row, ['arabic_name', 'Arabic Name']) || fullName;
      const currentJuz = parseInt(getRowField(row, ['current_juz', 'Current Juz']) || '1', 10) || 1;
      const defaultPassword = buildDefaultStudentPassword(admissionNumber, dob);

      successfulRows.push({
        id: `std_csv_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
        rollNumber,
        admissionNumber,
        fullName,
        arabicName,
        photo: '/assets/images/avatar_student_male_1794118079992.jpg',
        dateOfBirth: dob,
        gender,
        parentName: parentName || 'Parent / Guardian',
        parentPhone: parentPhone || '+91 94470 00000',
        parentEmail: `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@gmail.com`,
        admissionDate: new Date().toISOString().split('T')[0],
        campusId,
        classId,
        assignedTeacherId: matchedClass?.usthadId || (user.role === 'USTHAD' ? user.id : 'usr_teacher_01'),
        accountStatus: 'Active',
        currentJuz,
        completedJuzList: [],
        totalMemorizedAyahs: 0,
        attendanceRate: 100,
        // Metadata stripped before DB insert
        _batchLabel: matchedClass?.name || classId,
        _defaultPassword: defaultPassword,
      });
    }

    const studentsToPersist = successfulRows.map(({ _batchLabel, _defaultPassword, ...rest }) => rest);

    if (isCommit && studentsToPersist.length > 0) {
      if (isMongoReady()) {
        await Student.insertMany(studentsToPersist);
        for (const s of successfulRows) {
          await ensureStudentUserAccount(s, s._batchLabel);
        }
        await logAuditEvent('CSV_STUDENT_IMPORT', user, 'Student', undefined, {
          totalRows,
          imported: studentsToPersist.length,
          duplicates: duplicateRows.length,
          failed: failedRows.length,
        });
      } else {
        const db = getRuntimeDb();
        db.students.push(...studentsToPersist);
        for (const s of successfulRows) {
          await ensureStudentUserAccount(s, s._batchLabel);
        }
        saveRuntimeDb(db);
      }
    }

    return res.json({
      success: true,
      summary: {
        totalRows,
        successfulCount: successfulRows.length,
        duplicateCount: duplicateRows.length,
        failedCount: failedRows.length,
        isCommitted: Boolean(isCommit),
        defaultPasswordRule: '<AdmissionNumber>@<YYYY-MM-DD>',
      },
      successfulRows: isCommit
        ? []
        : successfulRows.slice(0, 50).map((s) => ({
            id: s.id,
            admissionNumber: s.admissionNumber,
            fullName: s.fullName,
            dateOfBirth: s.dateOfBirth,
            classId: s.classId,
            batchLabel: s._batchLabel,
            defaultPasswordPreview: s._defaultPassword,
          })),
      duplicateRows,
      failedRows,
    });
  } catch (err: any) {
    console.error('[Students] CSV Import error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process CSV import.' });
  }
});

// GET /api/students/export/csv - Role-based & campus-scoped CSV Export
router.get('/export/csv', authenticate, authorize('HYBA_SUPER_ADMIN', 'MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { campusId, classId } = req.query;
    const effectiveClassIds =
      user.role === 'USTHAD' ? await resolveEffectiveAssignedClassIds(user) : [];

    let students: any[] = [];
    if (!isMongoReady()) {
      students = [...getRuntimeDb().students];
      if (user.role === 'USTHAD') {
        if (classId) {
          if (!effectiveClassIds.includes(String(classId))) {
            return res.status(403).json({ success: false, error: 'Forbidden class filter.' });
          }
          students = students.filter((s) => s.classId === String(classId));
        } else {
          students = students.filter((s) => effectiveClassIds.includes(s.classId));
        }
      } else if (user.role === 'MUDEER') {
        if (user.campusId) students = students.filter((s) => s.campusId === user.campusId);
        if (classId) students = students.filter((s) => s.classId === String(classId));
      } else {
        if (campusId) students = students.filter((s) => s.campusId === String(campusId));
        if (classId) students = students.filter((s) => s.classId === String(classId));
      }
      students.sort((a, b) => (a.rollNumber || 0) - (b.rollNumber || 0));
    } else {
      const query: any = {};
      if (user.role === 'USTHAD') {
        if (classId) {
          if (!effectiveClassIds.includes(String(classId))) {
            return res.status(403).json({ success: false, error: 'Forbidden class filter.' });
          }
          query.classId = String(classId);
        } else {
          query.classId = { $in: effectiveClassIds };
        }
      } else if (user.role === 'MUDEER') {
        if (user.campusId) query.campusId = user.campusId;
        if (classId) query.classId = classId;
      } else {
        if (campusId) query.campusId = campusId;
        if (classId) query.classId = classId;
      }
      students = await Student.find(query).sort({ rollNumber: 1 }).lean();
    }

    const header = [
      'admission_number',
      'full_name',
      'arabic_name',
      'roll_number',
      'date_of_birth',
      'gender',
      'batch',
      'parent_name',
      'parent_phone',
      'current_juz',
      'attendance_rate',
      'account_status',
    ].join(',');

    const rows = students.map((s) => {
      return [
        `"${s.admissionNumber}"`,
        `"${(s.fullName || '').replace(/"/g, '""')}"`,
        `"${(s.arabicName || '').replace(/"/g, '""')}"`,
        s.rollNumber,
        `"${s.dateOfBirth || ''}"`,
        `"${s.gender}"`,
        `"${s.classId}"`,
        `"${(s.parentName || '').replace(/"/g, '""')}"`,
        `"${s.parentPhone || ''}"`,
        s.currentJuz || 1,
        s.attendanceRate || 100,
        `"${s.accountStatus || 'Active'}"`,
      ].join(',');
    });

    const csvContent = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hyba_students_${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('[Students] CSV Export error:', err);
    return res.status(500).json({ success: false, error: 'Failed to export CSV.' });
  }
});

export default router;

