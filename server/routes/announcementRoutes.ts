import { Router, Request, Response } from 'express';
import { Announcement } from '../models/Announcement';
import { emitAnnouncementCreated } from '../socket';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { isMongoReady, getRuntimeDb, saveRuntimeDb } from '../config/runtimeStore';

const router = Router();

// GET /api/announcements
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (!isMongoReady()) {
      const list = [...getRuntimeDb().announcements]
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 30);
      return res.json({ success: true, data: list });
    }

    const list = await Announcement.find().sort({ date: -1, createdAt: -1 }).limit(30).lean();
    return res.json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve announcements' });
  }
});

// POST /api/announcements
router.post('/', authenticate, authorize('MUDEER', 'HYBA_SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, date, category, isImportant, imageUrl, imagePublicId } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const payload = {
      id: `ann_${Date.now()}`,
      title,
      content,
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'General',
      author: req.user?.fullName || 'Mudir Office',
      isImportant: Boolean(isImportant),
      imageUrl,
      imagePublicId,
    };

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      db.announcements.unshift(payload);
      saveRuntimeDb(db);
      emitAnnouncementCreated(payload);
      return res.status(201).json({ success: true, data: payload });
    }

    const ann = await Announcement.create(payload);
    emitAnnouncementCreated(ann);

    return res.status(201).json({ success: true, data: ann });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to create announcement' });
  }
});

export default router;
