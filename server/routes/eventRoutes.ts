import { Router, Request, Response } from 'express';
import { CollegeEvent } from '../models/CollegeEvent';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const DEFAULT_EVENTS = [
  {
    id: 'evt_01',
    title: 'Annual Hifz Convocation & Sanad Award Ceremony 2026',
    arabicTitle: 'حفل تخريج حفظة كتاب الله وتسليم السند المبارك',
    description: 'Honoring graduate Huffaz with verified Sanad and Ijazah recitation certifications under the patronage of Markaz Examination Board.',
    category: 'Ceremony',
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    startTime: '09:00 AM',
    endTime: '01:30 PM',
    venue: 'Markaz Central Grand Convention Hall, Main Campus',
    campusId: 'campus-main',
    targetAudience: 'ALL',
    status: 'Scheduled',
    createdBy: 'Sheikh Dr. Abdul Wahab Al-Qasimi',
    creatorRole: 'SUPER_ADMIN',
    isImportant: true,
  },
  {
    id: 'evt_02',
    title: 'Inter-Batch Tajweed & Qira’at Competition',
    arabicTitle: 'مسابقة التجويد والقراءات بين الشعب القرآنية',
    description: 'Comprehensive recitation contest focusing on Ahkam At-Tajweed, Tarteel, Waqf and Ibtida across all Tahfeez batches.',
    category: 'Competition',
    startDate: '2026-11-25',
    endDate: '2026-11-25',
    startTime: '08:30 AM',
    endTime: '12:30 PM',
    venue: 'Tahfeez Auditorium, Campus Hall A',
    campusId: 'campus-main',
    targetAudience: 'STUDENTS',
    status: 'Scheduled',
    createdBy: 'Usthad Mohammed Ajash T.',
    creatorRole: 'USTHAD',
    isImportant: false,
  },
  {
    id: 'evt_03',
    title: 'Parents & Guardians Academic Review Majlis',
    arabicTitle: 'المجلس الأكاديمي المشترك لأولياء الأمور والمشايخ',
    description: 'Semester 1 progress review meeting with mentors, individual student progress discussion, and spiritual guidance for guardians.',
    category: 'Parent-Teacher Meeting',
    startDate: '2026-11-28',
    endDate: '2026-11-28',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    venue: 'Conference Center & Library Hall',
    campusId: 'campus-main',
    targetAudience: 'PARENTS',
    status: 'Scheduled',
    createdBy: 'Usthad Mohammed Ajash T.',
    creatorRole: 'USTHAD',
    isImportant: true,
  },
  {
    id: 'evt_04',
    title: 'Quarterly Juz Memorization & Sanad Oral Examination',
    arabicTitle: 'امتحان الحفظ الفصلي واختبار الأجزاء الشفوي',
    description: 'External evaluation panel verifying 5-Juz, 10-Juz, and 20-Juz milestones for official registry promotion.',
    category: 'Exam',
    startDate: '2026-12-05',
    endDate: '2026-12-07',
    startTime: '07:30 AM',
    endTime: '04:00 PM',
    venue: 'Academic Examination Board Room 102',
    campusId: 'campus-main',
    targetAudience: 'STUDENTS',
    status: 'Scheduled',
    createdBy: 'Mudir Office',
    creatorRole: 'SUPER_ADMIN',
    isImportant: true,
  },
];

const eventSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  arabicTitle: z.string().optional(),
  description: z.string().default(''),
  category: z.enum(['Academic', 'Competition', 'Ceremony', 'Holiday', 'Majlis', 'Parent-Teacher Meeting', 'General']).default('General'),
  startDate: z.string().min(4, 'Start date is required'),
  endDate: z.string().optional(),
  startTime: z.string().default('09:00 AM'),
  endTime: z.string().default('12:00 PM'),
  venue: z.string().default('Markazul Hidayathil Islamiyya Main Campus'),
  campusId: z.string().default('campus-main'),
  targetAudience: z.enum(['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS']).default('ALL'),
  status: z.enum(['Scheduled', 'Ongoing', 'Completed', 'Postponed']).default('Scheduled'),
  isImportant: z.boolean().default(false),
});

// GET /api/events - List all events
router.get('/', async (req: Request, res: Response) => {
  try {
    let events = await CollegeEvent.find().sort({ startDate: 1, startTime: 1 }).lean();

    // If collection is empty, seed defaults
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

// POST /api/events - Super Admin and Usthad can add / schedule events
router.post('/', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
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

    const newEvent = await CollegeEvent.create({
      ...data,
      id: eventId,
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

// PUT /api/events/:id - Super Admin and Usthad can edit / reschedule events
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
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

// DELETE /api/events/:id - Super Admin and Usthad can delete events
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
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
