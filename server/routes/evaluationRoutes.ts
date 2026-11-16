import { Router, Request, Response } from 'express';
import { TeacherEvaluationModel } from '../models/InstitutionModels';
import { authenticate, AuthRequest } from '../middleware/auth';
import { isMongoReady } from '../config/runtimeStore';
import { MOCK_EVALUATIONS } from '../../src/data/mockData';

const router = Router();
let runtimeEvaluations = JSON.parse(JSON.stringify(MOCK_EVALUATIONS));

// GET /api/evaluations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId, teacherId } = req.query;

    if (!isMongoReady()) {
      let evals = [...runtimeEvaluations];
      if (studentId) evals = evals.filter((e: any) => e.studentId === studentId);
      if (teacherId) evals = evals.filter((e: any) => e.teacherId === teacherId);
      return res.json({ success: true, data: evals });
    }

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

    if (!isMongoReady()) {
      const idx = runtimeEvaluations.findIndex((e: any) => e.id === id);
      if (idx >= 0) {
        runtimeEvaluations[idx] = {
          ...runtimeEvaluations[idx],
          status: 'Completed',
          ratings,
          date: new Date().toISOString().split('T')[0],
        };
      }
      return res.json({ success: true, data: runtimeEvaluations[idx] || null });
    }

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
