import { Router, Response } from 'express';
import { Student } from '../models/Student';
import { deleteFromCloudinary } from '../config/cloudinary';
import { emitStudentUpdated } from '../socket';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
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
  assignedTeacherId: z.string().min(1),
  accountStatus: z.enum(['Active', 'On Leave', 'Completed']).default('Active'),
  currentJuz: z.number().min(1).max(30).default(1),
  completedJuzList: z.array(z.number()).default([]),
  totalMemorizedAyahs: z.number().default(0),
  attendanceRate: z.number().default(95),
});

// GET /api/students - List all or filtered with strict RBAC scoping
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { classId, campusId, search, status, page, limit } = req.query;

    const query: any = {};
    if (status) query.accountStatus = status;
    if (campusId) query.campusId = campusId;

    // RBAC Scoping
    if (user.role === 'STUDENT') {
      query.id = user.studentId || '__none__';
    } else if (user.role === 'PARENT') {
      query.id = { $in: user.linkedStudentIds || [] };
    } else if (user.role === 'USTHAD') {
      if (classId) {
        // Verify Usthad has assignment to this class
        const allowed = user.assignedClassIds?.includes(String(classId));
        if (!allowed) {
          return res.status(403).json({
            success: false,
            error: 'Access forbidden: You may only view students in your assigned classes.',
          });
        }
        query.classId = String(classId);
      } else {
        // Default to all classes assigned to the Usthad
        query.$or = [
          { classId: { $in: user.assignedClassIds || [] } },
          { assignedTeacherId: user.id },
          { assignedTeacherId: user.referenceId },
        ];
      }
    } else {
      // SUPER_ADMIN
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

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 100));
    const skip = (pageNum - 1) * limitNum;

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

    const student = await Student.findOne({ id }).lean();
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (user.role === 'USTHAD') {
      const isAssigned =
        (user.assignedClassIds && user.assignedClassIds.includes(student.classId)) ||
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

// POST /api/students - Create new student (SUPER_ADMIN or USTHAD for assigned classes)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
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

    // Usthad enrollment scope check
    if (user.role === 'USTHAD') {
      const allowed = user.assignedClassIds && user.assignedClassIds.includes(data.classId);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: `Access forbidden: You may only enroll students into your assigned classes (${(user.assignedClassIds || []).join(', ')}).`,
        });
      }
    }

    const studentId = data.id || `std_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Check unique admissionNumber
    const existing = await Student.findOne({ admissionNumber: data.admissionNumber });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `A student with Admission No. ${data.admissionNumber} already exists.`,
      });
    }

    const newStudent = await Student.create({
      ...data,
      id: studentId,
      assignedTeacherId: user.role === 'USTHAD' ? user.id : data.assignedTeacherId,
    });

    emitStudentUpdated(newStudent);
    await logAuditEvent('STUDENT_CREATE', user, 'Student', newStudent.id, {
      fullName: newStudent.fullName,
      admissionNumber: newStudent.admissionNumber,
      classId: newStudent.classId,
    });

    return res.status(201).json({ success: true, data: newStudent });
  } catch (err: any) {
    console.error('[Students] Create error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create student' });
  }
});

// PUT /api/students/:id - Update student (SUPER_ADMIN, assigned USTHAD, or STUDENT updating self photo)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const existing = await Student.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // Role verification
    if (user.role === 'STUDENT') {
      if (user.studentId !== id) {
        return res.status(403).json({ success: false, error: 'Access forbidden: You can only edit your own profile.' });
      }
      // Students can ONLY update photo and phone
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
        (user.assignedClassIds && user.assignedClassIds.includes(existing.classId)) ||
        existing.assignedTeacherId === user.id ||
        existing.assignedTeacherId === user.referenceId;
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: 'Access forbidden: You can only update assigned students.' });
      }
    }

    // Clean up old photo if replaced
    if (req.body.photoPublicId && existing.photoPublicId && req.body.photoPublicId !== existing.photoPublicId) {
      await deleteFromCloudinary(existing.photoPublicId);
    }

    const updated = await Student.findOneAndUpdate({ id }, { $set: req.body }, { new: true });

    if (updated) {
      emitStudentUpdated(updated);
      await logAuditEvent('STUDENT_UPDATE', user, 'Student', id, req.body);
    }

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update student' });
  }
});

// DELETE /api/students/:id - Super Admin or assigned Usthad
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const existing = await Student.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (user.role === 'USTHAD') {
      const isAssigned =
        (user.assignedClassIds && user.assignedClassIds.includes(existing.classId)) ||
        existing.assignedTeacherId === user.id;
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
    const { User } = await import('../models/User');
    await User.deleteOne({ $or: [{ id }, { referenceId: existing.admissionNumber }, { studentId: id }] });

    await logAuditEvent('STUDENT_DELETE', req.user, 'Student', id, { name: existing.fullName });

    return res.json({ success: true, message: 'Student record deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete student' });
  }
});


// POST /api/students/import-csv - Reliable CSV Import with validation and duplicate detection
router.post('/import-csv', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
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

    // Pre-fetch all existing admission numbers and student IDs
    const existingStudents = await Student.find().select('admissionNumber rollNumber classId id').lean();
    const existingAdmMap = new Set(existingStudents.map((s) => s.admissionNumber.toLowerCase().trim()));
    const seenBatchAdm = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Normalize fields from possible headers
      const fullName = (row.full_name || row['Full Name'] || row.name || '').trim();
      const admissionNumber = (row.admission_number || row.student_id || row['Admission Number'] || row['Student ID'] || '').trim();
      const rollNumber = parseInt(row.roll_number || row.roll || row['Roll Number'] || '0') || rowNum;
      const dob = (row.date_of_birth || row.dob || row['Date of Birth'] || '2012-01-01').trim();
      const gender = (row.gender || row['Gender'] || 'Male').trim() === 'Female' ? 'Female' : 'Male';
      const phone = (row.phone || row['Phone'] || '').trim();
      const parentName = (row.parent_name || row['Parent Name'] || row.guardian || '').trim();
      const parentPhone = (row.parent_phone || row['Parent Phone'] || phone || '').trim();
      const campusId = (row.campus || row.campus_id || row['Campus'] || 'campus-main').trim();
      const classId = (row.class || row.class_id || row['Class'] || 'batch-a').trim();

      // Required field validation
      if (!fullName || !admissionNumber) {
        failedRows.push({
          rowNumber: rowNum,
          admissionNumber,
          fullName,
          error: 'Missing required full_name or admission_number.',
        });
        continue;
      }

      // Check Usthad permissions for target class
      if (user.role === 'USTHAD') {
        const isClassAllowed = user.assignedClassIds && user.assignedClassIds.includes(classId);
        if (!isClassAllowed) {
          failedRows.push({
            rowNumber: rowNum,
            admissionNumber,
            fullName,
            error: `Class '${classId}' is outside your permitted Usthad scope.`,
          });
          continue;
        }
      }

      // Check duplicate admission number in DB or current import batch
      const lowerAdm = admissionNumber.toLowerCase();
      if (existingAdmMap.has(lowerAdm) || seenBatchAdm.has(lowerAdm)) {
        duplicateRows.push({
          rowNumber: rowNum,
          admissionNumber,
          fullName,
          error: `Admission number '${admissionNumber}' already exists in database or batch.`,
        });
        continue;
      }

      seenBatchAdm.add(lowerAdm);

      const parsedStudent = {
        id: `std_csv_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
        rollNumber,
        admissionNumber,
        fullName,
        arabicName: row.arabic_name || row['Arabic Name'] || fullName,
        photo: '/assets/images/avatar_student_male_1794118079992.jpg',
        dateOfBirth: dob,
        gender,
        parentName: parentName || 'Parent / Guardian',
        parentPhone: parentPhone || '+91 94470 00000',
        parentEmail: `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@gmail.com`,
        admissionDate: new Date().toISOString().split('T')[0],
        campusId,
        classId,
        assignedTeacherId: user.role === 'USTHAD' ? user.id : 'usr_teacher_01',
        accountStatus: 'Active',
        currentJuz: parseInt(row.current_juz || row['Current Juz'] || '1') || 1,
        completedJuzList: [30],
        totalMemorizedAyahs: 564,
        attendanceRate: 100,
      };

      successfulRows.push(parsedStudent);
    }

    // If isCommit is true and there are successful rows, insert into database
    if (isCommit && successfulRows.length > 0) {
      await Student.insertMany(successfulRows);
      await logAuditEvent('CSV_STUDENT_IMPORT', user, 'Student', undefined, {
        totalRows,
        imported: successfulRows.length,
        duplicates: duplicateRows.length,
        failed: failedRows.length,
      });
    }

    return res.json({
      success: true,
      summary: {
        totalRows,
        successfulCount: successfulRows.length,
        duplicateCount: duplicateRows.length,
        failedCount: failedRows.length,
        isCommitted: Boolean(isCommit),
      },
      successfulRows: isCommit ? [] : successfulRows.slice(0, 50), // preview sample
      duplicateRows,
      failedRows,
    });
  } catch (err: any) {
    console.error('[Students] CSV Import error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process CSV import.' });
  }
});

// GET /api/students/export-csv - Role-based Student CSV Export (Never exposes credentials or hashes)
router.get('/export/csv', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { campusId, classId } = req.query;

    const query: any = {};
    if (user.role === 'USTHAD') {
      if (classId) {
        if (!user.assignedClassIds?.includes(String(classId))) {
          return res.status(403).json({ success: false, error: 'Forbidden class filter.' });
        }
        query.classId = String(classId);
      } else {
        query.classId = { $in: user.assignedClassIds || [] };
      }
    } else {
      if (campusId) query.campusId = campusId;
      if (classId) query.classId = classId;
    }

    const students = await Student.find(query).sort({ rollNumber: 1 }).lean();

    const header = [
      'student_id',
      'full_name',
      'arabic_name',
      'admission_number',
      'roll_number',
      'date_of_birth',
      'gender',
      'class_id',
      'campus_id',
      'parent_name',
      'parent_phone',
      'current_juz',
      'attendance_rate',
      'account_status',
    ].join(',');

    const rows = students.map((s) => {
      return [
        `"${s.id}"`,
        `"${(s.fullName || '').replace(/"/g, '""')}"`,
        `"${(s.arabicName || '').replace(/"/g, '""')}"`,
        `"${s.admissionNumber}"`,
        s.rollNumber,
        `"${s.dateOfBirth || ''}"`,
        `"${s.gender}"`,
        `"${s.classId}"`,
        `"${s.campusId}"`,
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
