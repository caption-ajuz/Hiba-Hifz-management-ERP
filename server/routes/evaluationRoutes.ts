import { Router, Request, Response } from 'express';
import { TeacherEvaluationModel } from '../models/InstitutionModels';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/evaluations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId, teacherId } = req.query;
    const query: any = {};
    if (studentId) query.studentId = studentId;
    if (teacherId) query.teacherId = teacherId;

    const evals = await TeacherEvaluationModel.find(query).lean();
    return res.json({ success: true, data: evals });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve evaluations' });
  }
});

// POST /api/evaluations/:id/complete
router.post('/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { ratings } = req.body;

    const updated = await TeacherEvaluationModel.findOneAndUpdate(
      { id },
      {
        status: 'Completed',
        ratings,
        date: new Date().toISOString().split('T')[0],
      },
      { new: true }
    );

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to complete evaluation' });
  }
});

export default router;
