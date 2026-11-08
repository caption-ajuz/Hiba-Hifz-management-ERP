import { Router, Request, Response } from 'express';
import { ClassBatch } from '../models/ClassBatch';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const classSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Class name is required'),
  arabicName: z.string().optional(),
  campusId: z.string().default('campus-main'),
  usthadId: z.string().min(1, 'Usthad mentor assignment is required'),
  roomNumber: z.string().optional(),
  academicYear: z.string().default('2026 - 2027'),
  capacity: z.number().min(1).default(30),
});

// GET /api/classes - List all or filtered by campus
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { campusId } = req.query;
    const query: any = {};
    if (campusId) query.campusId = campusId;

    const classes = await ClassBatch.find(query).lean();

    // Dynamically calculate accurate totalStudents from Student collection
    const classesWithStudentCounts = await Promise.all(
      classes.map(async (cls) => {
        const count = await Student.countDocuments({ classId: cls.id });
        return { ...cls, totalStudents: count };
      })
    );

    return res.json({ success: true, data: classesWithStudentCounts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve classes' });
  }
});

// GET /api/classes/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const cls = await ClassBatch.findOne({ id: req.params.id }).lean();
    if (!cls) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    const count = await Student.countDocuments({ classId: cls.id });
    return res.json({ success: true, data: { ...cls, totalStudents: count } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve class' });
  }
});

// POST /api/classes - Create new class (SUPER_ADMIN only)
router.post('/', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parse = classSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid class data',
      });
    }

    const data = parse.data;
    const classId = data.id || `batch-${Date.now().toString(36)}`;

    const newClass = await ClassBatch.create({
      ...data,
      id: classId,
      totalStudents: 0,
    });

    // Also update Teacher's assignedClassIds if not already present
    await Teacher.updateOne(
      { id: data.usthadId },
      { $addToSet: { assignedClassIds: classId } }
    );

    await logAuditEvent('CLASS_CREATE', req.user, 'ClassBatch', classId, {
      name: newClass.name,
      usthadId: newClass.usthadId,
      campusId: newClass.campusId,
    });

    return res.status(201).json({ success: true, data: newClass });
  } catch (err: any) {
    console.error('[Classes] Create class error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create class' });
  }
});

// PUT /api/classes/:id - Update class (SUPER_ADMIN only)
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await ClassBatch.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    const updated = await ClassBatch.findOneAndUpdate({ id }, { $set: req.body }, { new: true });

    // If teacher assignment changed, sync assignedClassIds
    if (req.body.usthadId && req.body.usthadId !== existing.usthadId) {
      await Teacher.updateOne({ id: existing.usthadId }, { $pull: { assignedClassIds: id } });
      await Teacher.updateOne({ id: req.body.usthadId }, { $addToSet: { assignedClassIds: id } });
    }

    await logAuditEvent('CLASS_UPDATE', req.user, 'ClassBatch', id, req.body);

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update class' });
  }
});

// DELETE /api/classes/:id - Super Admin only
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentsInClass = await Student.countDocuments({ classId: id });
    if (studentsInClass > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete class batch: ${studentsInClass} students are currently assigned to this batch. Please reassign them first.`,
      });
    }

    await ClassBatch.deleteOne({ id });
    await Teacher.updateMany({}, { $pull: { assignedClassIds: id } });

    await logAuditEvent('CLASS_DELETE', req.user, 'ClassBatch', id);

    return res.json({ success: true, message: 'Class deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete class' });
  }
});

export default router;
