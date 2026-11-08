import { Router, Request, Response } from 'express';
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

// GET /api/students - List all or filtered with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { classId, search, status, page, limit } = req.query;

    const query: any = {};
    if (classId) query.classId = classId;
    if (status) query.accountStatus = status;

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { admissionNumber: searchRegex },
        { arabicName: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
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

// GET /api/students/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const student = await Student.findOne({ id: req.params.id }).lean();
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    return res.json({ success: true, data: student });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve student' });
  }
});

// POST /api/students - Create new student
router.post('/', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const parse = studentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid student data',
      });
    }

    const data = parse.data;
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
    });

    emitStudentUpdated(newStudent);
    await logAuditEvent('STUDENT_CREATE', req.user, 'Student', newStudent.id, {
      fullName: newStudent.fullName,
      admissionNumber: newStudent.admissionNumber,
    });

    return res.status(201).json({ success: true, data: newStudent });
  } catch (err: any) {
    console.error('[Students] Create error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create student' });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await Student.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    // If photo is replaced, clean up old photo from Cloudinary
    if (req.body.photoPublicId && existing.photoPublicId && req.body.photoPublicId !== existing.photoPublicId) {
      await deleteFromCloudinary(existing.photoPublicId);
    }

    const updated = await Student.findOneAndUpdate({ id }, { $set: req.body }, { new: true });

    if (updated) {
      emitStudentUpdated(updated);
      await logAuditEvent('STUDENT_UPDATE', req.user, 'Student', id, req.body);
    }

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update student' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await Student.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    if (existing.photoPublicId) {
      await deleteFromCloudinary(existing.photoPublicId);
    }

    await Student.deleteOne({ id });
    await logAuditEvent('STUDENT_DELETE', req.user, 'Student', id, { name: existing.fullName });

    return res.json({ success: true, message: 'Student record deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete student' });
  }
});

export default router;
