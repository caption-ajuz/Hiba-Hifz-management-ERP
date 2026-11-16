import { Router, Request, Response } from 'express';
import { CollegeEvent } from '../models/CollegeEvent';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { DEFAULT_EVENTS, isMongoReady, getRuntimeDb, saveRuntimeDb } from '../config/runtimeStore';
import { z } from 'zod';

const router = Router();

const eventSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  arabicTitle: z.string().optional(),
  description: z.string().default(''),
  category: z.enum(['Academic', 'Competition', 'Ceremony', 'Exam', 'Holiday', 'Majlis', 'Parent-Teacher Meeting', 'General']).default('General'),
  startDate: z.string().min(4, 'Start date is required'),
  endDate: z.string().optional(),
  startTime: z.string().default('09:00 AM'),
  endTime: z.string().default('12:00 PM'),
  venue: z.string().default('Markazul Hidaya Kombam'),
  campusId: z.string().default('campus-main'),
  targetAudience: z.enum(['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS']).default('ALL'),
  status: z.enum(['Scheduled', 'Ongoing', 'Completed', 'Postponed']).default('Scheduled'),
  isImportant: z.boolean().default(false),
});

// GET /api/events - List events
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (!isMongoReady()) {
      const events = [...getRuntimeDb().events].sort((a, b) =>
        `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`)
      );
      return res.json({ success: true, data: events });
    }

    let events = await CollegeEvent.find().sort({ startDate: 1, startTime: 1 }).lean();
    if (events.length === 0) {
      await CollegeEvent.insertMany(DEFAULT_EVENTS);
      events = await CollegeEvent.find().sort({ startDate: 1, startTime: 1 }).lean();
    }

    return res.json({ success: true, data: events });
  } catch (err: any) {
    console.error('[Events] Fetch error:', err);
    return res.json({ success: true, data: DEFAULT_EVENTS });
  }
});

// POST /api/events - MUDEER and USTHAD can add / schedule events (scoped to campus)
router.post('/', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const parse = eventSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid event data',
      });
    }

    const data = parse.data;
    const user = req.user!;
    const eventId = `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const campusId = user.campusId || data.campusId || 'campus-main';

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const newEvent = {
        ...data,
        id: eventId,
        campusId,
        createdBy: user.fullName,
        creatorRole: user.role,
      };
      db.events.push(newEvent);
      saveRuntimeDb(db);
      return res.status(201).json({ success: true, data: newEvent });
    }

    const newEvent = await CollegeEvent.create({
      ...data,
      id: eventId,
      campusId,
      createdBy: user.fullName,
      creatorRole: user.role,
    });

    await logAuditEvent('EVENT_CREATE', user, 'CollegeEvent', eventId, {
      title: newEvent.title,
      startDate: newEvent.startDate,
      status: newEvent.status,
    });

    return res.status(201).json({ success: true, data: newEvent });
  } catch (err: any) {
    console.error('[Events] Create error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create college event' });
  }
});

// PUT /api/events/:id - MUDEER and USTHAD can edit / reschedule events
router.put('/:id', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const idx = db.events.findIndex((e) => e.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'College event not found' });
      db.events[idx] = { ...db.events[idx], ...req.body };
      saveRuntimeDb(db);
      return res.json({ success: true, data: db.events[idx] });
    }

    const existing = await CollegeEvent.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'College event not found' });
    }

    const updated = await CollegeEvent.findOneAndUpdate({ id }, { $set: req.body }, { new: true });

    await logAuditEvent('EVENT_UPDATE', user, 'CollegeEvent', id, req.body);

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id - MUDEER and USTHAD can delete events
router.delete('/:id', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const existing = db.events.find((e) => e.id === id);
      if (!existing) return res.status(404).json({ success: false, error: 'Event not found' });
      db.events = db.events.filter((e) => e.id !== id);
      saveRuntimeDb(db);
      return res.json({ success: true, message: 'College event deleted successfully' });
    }

    const existing = await CollegeEvent.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    await CollegeEvent.deleteOne({ id });
    await logAuditEvent('EVENT_DELETE', user, 'CollegeEvent', id, { title: existing.title });

    return res.json({ success: true, message: 'College event deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete event' });
  }
});

export default router;
