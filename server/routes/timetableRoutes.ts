import { Router, Request, Response } from 'express';
import { TimetableSlot } from '../models/TimetableSlot';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { DEFAULT_TIMETABLE_SLOTS, isMongoReady, getRuntimeDb, saveRuntimeDb } from '../config/runtimeStore';
import { emitTimetableUpdated } from '../socket';
import { z } from 'zod';

const router = Router();

const slotSchema = z.object({
  day: z.string().default('D1'),
  slotNumber: z.coerce.number().min(1).max(12).default(1),
  time: z.string().min(1, 'Time range is required (e.g. 07:00 - 08:30)'),
  title: z.string().min(1, 'Title / subject is required'),
  batch: z.string().default('Hifz Batch A'),
  room: z.string().default('Tahfeez Hall 101'),
  mentor: z.string().default('Usthad Mohammed Ajash'),
  color: z.string().optional(),
  tag: z.string().default('Sabq Focus'),
  classId: z.string().optional(),
  campusId: z.string().optional(),
});

const updateSlotSchema = slotSchema.partial();

// GET /api/timetable
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (!isMongoReady()) {
      const slots = [...getRuntimeDb().timetableSlots].sort((a, b) => {
        const dayDiff = String(a.day).localeCompare(String(b.day));
        if (dayDiff !== 0) return dayDiff;
        return Number(a.slotNumber || 0) - Number(b.slotNumber || 0);
      });
      return res.json({ success: true, data: slots });
    }

    let slots = await TimetableSlot.find().sort({ day: 1, slotNumber: 1 }).lean();

    if (slots.length === 0) {
      await TimetableSlot.insertMany(DEFAULT_TIMETABLE_SLOTS);
      slots = await TimetableSlot.find().sort({ day: 1, slotNumber: 1 }).lean();
    }

    return res.json({ success: true, data: slots });
  } catch (err: any) {
    return res.json({ success: true, data: DEFAULT_TIMETABLE_SLOTS });
  }
});

// POST /api/timetable - Add new hour / period (MUDEER or USTHAD)
router.post('/', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const parse = slotSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid slot data',
      });
    }

    const data = parse.data;
    const slotId = `slot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const campusId = req.user?.campusId || data.campusId || 'campus-main';

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const newSlot = {
        ...data,
        id: slotId,
        campusId,
        color: data.color || 'bg-emerald-50 border-emerald-200 text-emerald-950',
      };
      db.timetableSlots.push(newSlot);
      saveRuntimeDb(db);
      emitTimetableUpdated(db.timetableSlots);
      return res.status(201).json({ success: true, data: newSlot });
    }

    const newSlot = await TimetableSlot.create({
      ...data,
      id: slotId,
      campusId,
      color: data.color || 'bg-emerald-50 border-emerald-200 text-emerald-950',
    });

    await logAuditEvent('TIMETABLE_SLOT_CREATE', req.user, 'TimetableSlot', slotId, {
      title: newSlot.title,
      time: newSlot.time,
      day: newSlot.day,
    });

    emitTimetableUpdated();
    return res.status(201).json({ success: true, data: newSlot });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to create timetable slot' });
  }
});

// PUT /api/timetable/:id - Edit hour / period
router.put('/:id', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parse = updateSlotSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid timetable slot update data',
      });
    }
    const updates = parse.data;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const idx = db.timetableSlots.findIndex((s) => s.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Timetable period not found' });
      db.timetableSlots[idx] = { ...db.timetableSlots[idx], ...updates };
      saveRuntimeDb(db);
      emitTimetableUpdated(db.timetableSlots);
      return res.json({ success: true, data: db.timetableSlots[idx] });
    }

    const existing = await TimetableSlot.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Timetable period not found' });
    }

    const updated = await TimetableSlot.findOneAndUpdate({ id }, { $set: updates }, { new: true });

    await logAuditEvent('TIMETABLE_SLOT_UPDATE', req.user, 'TimetableSlot', id, updates);
    emitTimetableUpdated();

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[Timetable] Update error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update timetable slot' });
  }
});

// DELETE /api/timetable/:id - Delete hour / period
router.delete('/:id', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const existing = db.timetableSlots.find((s) => s.id === id);
      if (!existing) return res.status(404).json({ success: false, error: 'Timetable period not found' });
      db.timetableSlots = db.timetableSlots.filter((s) => s.id !== id);
      saveRuntimeDb(db);
      emitTimetableUpdated(db.timetableSlots);
      return res.json({ success: true, message: 'Timetable hour deleted successfully' });
    }

    const existing = await TimetableSlot.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Timetable period not found' });
    }

    await TimetableSlot.deleteOne({ id });
    await logAuditEvent('TIMETABLE_SLOT_DELETE', req.user, 'TimetableSlot', id, { title: existing.title });
    emitTimetableUpdated();

    return res.json({ success: true, message: 'Timetable hour deleted successfully' });
  } catch (err: any) {
    console.error('[Timetable] Delete error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete timetable slot' });
  }
});

export default router;
