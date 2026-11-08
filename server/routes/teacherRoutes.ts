import { Router, Request, Response } from 'express';
import { Teacher } from '../models/Teacher';
import { emitTeacherUpdated } from '../socket';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';

const router = Router();

// GET /api/teachers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const teachers = await Teacher.find().sort({ fullName: 1 }).lean();
    return res.json({ success: true, data: teachers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve teachers' });
  }
});

// GET /api/teachers/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const teacher = await Teacher.findOne({ id: req.params.id }).lean();
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
    return res.json({ success: true, data: teacher });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve teacher' });
  }
});

// PUT /api/teachers/:id
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await Teacher.findOneAndUpdate({ id }, { $set: req.body }, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
    emitTeacherUpdated(updated);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update teacher' });
  }
});

export default router;
