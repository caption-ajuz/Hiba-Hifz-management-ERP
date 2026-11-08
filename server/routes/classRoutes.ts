import { Router, Request, Response } from 'express';
import { ClassBatch } from '../models/ClassBatch';

const router = Router();

// GET /api/classes
router.get('/', async (_req: Request, res: Response) => {
  try {
    const classes = await ClassBatch.find().lean();
    return res.json({ success: true, data: classes });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve classes' });
  }
});

// GET /api/classes/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const cls = await ClassBatch.findOne({ id: req.params.id }).lean();
    if (!cls) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    return res.json({ success: true, data: cls });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve class' });
  }
});

export default router;
