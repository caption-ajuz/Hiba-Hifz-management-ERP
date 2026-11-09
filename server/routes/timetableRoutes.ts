import { Router, Request, Response } from 'express';
import { TimetableSlot } from '../models/TimetableSlot';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const DEFAULT_TIMETABLE_SLOTS = [
  {
    id: 'slot_d1_1',
    day: 'D1',
    slotNumber: 1,
    time: '07:00 - 08:30',
    title: 'Sabq (السبق) · New Lesson Memorization',
    batch: 'Hifz Batch A (Hifz Ul Uloom)',
    room: 'Tahfeez Hall 101',
    mentor: 'Usthad Mohammed Ajash T.',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    tag: 'Sabq Focus',
    classId: 'batch-a',
  },
  {
    id: 'slot_d1_2',
    day: 'D1',
    slotNumber: 2,
    time: '09:00 - 10:30',
    title: 'Forenoon Murajath (المراجعة) · Recent Revision',
    batch: 'Hifz Batch A & B',
    room: 'Tahfeez Hall 101',
    mentor: 'Usthad Mohammed Ajash T.',
    color: 'bg-teal-50 border-teal-200 text-teal-950',
    tag: 'Revision',
    classId: 'batch-a',
  },
  {
    id: 'slot_d1_3',
    day: 'D1',
    slotNumber: 3,
    time: '11:00 - 12:30',
    title: 'Tajweed Rules, Makharij & Quranic Sciences',
    batch: 'Combined Hifz Department',
    room: 'Auditorium Hall',
    mentor: 'Dr. Abdul Wahab (Mudir) & Usthad Ajash',
    color: 'bg-sky-50 border-sky-200 text-sky-950',
    tag: 'Tajweed',
    classId: 'batch-a',
  },
  {
    id: 'slot_d1_4',
    day: 'D1',
    slotNumber: 4,
    time: '14:00 - 16:00',
    title: 'Manzil (المنزل) · Full Juz Cumulative Revision',
    batch: 'Hifz Batch A',
    room: 'Tahfeez Hall 101',
    mentor: 'Usthad Mohammed Ajash T.',
    color: 'bg-amber-50 border-amber-200 text-amber-950',
    tag: 'Manzil',
    classId: 'batch-a',
  },
  {
    id: 'slot_d1_5',
    day: 'D1',
    slotNumber: 5,
    time: '16:30 - 17:30',
    title: 'Sanad Verification & One-on-One Oral Testing',
    batch: 'Advanced Sanad Candidates',
    room: 'Library Sanctuary',
    mentor: 'Academic Advisor Dr. Sreenivasan K.P.',
    color: 'bg-purple-50 border-purple-200 text-purple-950',
    tag: 'Oral Exam',
    classId: 'batch-a',
  },
];

const slotSchema = z.object({
  day: z.string().default('D1'),
  slotNumber: z.number().default(1),
  time: z.string().min(1, 'Time range is required (e.g. 07:00 - 08:30)'),
  title: z.string().min(1, 'Title / subject is required'),
  batch: z.string().default('Hifz Batch A'),
  room: z.string().default('Tahfeez Hall 101'),
  mentor: z.string().default('Usthad Mohammed Ajash T.'),
  color: z.string().optional(),
  tag: z.string().default('Sabq Focus'),
  classId: z.string().optional(),
});

// GET /api/timetable
router.get('/', async (req: Request, res: Response) => {
  try {
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

// POST /api/timetable - Add new hour / period
router.post('/', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
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

    const newSlot = await TimetableSlot.create({
      ...data,
      id: slotId,
      color: data.color || 'bg-emerald-50 border-emerald-200 text-emerald-950',
    });

    await logAuditEvent('TIMETABLE_SLOT_CREATE', req.user, 'TimetableSlot', slotId, {
      title: newSlot.title,
      time: newSlot.time,
      day: newSlot.day,
    });

    return res.status(201).json({ success: true, data: newSlot });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to create timetable slot' });
  }
});

// PUT /api/timetable/:id - Edit hour / period
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await TimetableSlot.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Slot not found' });
    }

    const updated = await TimetableSlot.findOneAndUpdate({ id }, { $set: req.body }, { new: true });

    await logAuditEvent('TIMETABLE_SLOT_UPDATE', req.user, 'TimetableSlot', id, req.body);

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update timetable slot' });
  }
});

// DELETE /api/timetable/:id - Delete hour / period
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await TimetableSlot.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Slot not found' });
    }

    await TimetableSlot.deleteOne({ id });
    await logAuditEvent('TIMETABLE_SLOT_DELETE', req.user, 'TimetableSlot', id, { title: existing.title });

    return res.json({ success: true, message: 'Timetable hour deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete timetable slot' });
  }
});

export default router;
