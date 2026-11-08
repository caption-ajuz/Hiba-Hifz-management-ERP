import { Router, Request, Response } from 'express';
import { HifzRecord } from '../models/HifzRecord';
import { Student } from '../models/Student';
import { emitHifzRecordCreated, emitHifzRecordUpdated } from '../socket';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const hifzRecordSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1),
  teacherId: z.string().min(1),
  classId: z.string().optional(),
  date: z.string().min(1),
  recordType: z.enum(['SABQ', 'SABQI', 'MURAJATH', 'MANZIL']),
  surahNumber: z.number().optional(),
  surahName: z.string().optional(),
  surahArabic: z.string().optional(),
  startAyah: z.number().optional(),
  endAyah: z.number().optional(),
  juzNumber: z.number().optional(),
  juzName: z.string().optional(),
  surahRangeText: z.string().optional(),
  performance: z.enum(['Excellent', 'Good', 'Average', 'Needs Improvement']).default('Good'),
  mistakeCount: z.number().default(0),
  status: z.enum(['Passed', 'Revision Required', 'Not Passed']).default('Passed'),
  teacherRemarks: z.string().default(''),
  nextLessonConfirmed: z.boolean().default(false),
  nextLessonPosition: z.string().optional(),
  academicYear: z.string().default('2026 - 2027'),
});

// GET /api/hifz - List records with filtering & pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId, teacherId, recordType, date, page, limit } = req.query;

    const query: any = {};
    if (studentId) query.studentId = studentId;
    if (teacherId) query.teacherId = teacherId;
    if (recordType) query.recordType = recordType;
    if (date) query.date = date;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      HifzRecord.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      HifzRecord.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error('[Hifz] Query error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve Hifz records' });
  }
});

// POST /api/hifz - Create Hifz record (Sabaq, Sabqi, Murajath, Manzil)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const parse = hifzRecordSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid Hifz record payload',
      });
    }

    const data = parse.data;
    const recordId = data.id || `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newRecord = await HifzRecord.create({
      ...data,
      id: recordId,
    });

    // If Sabq was passed with Ayah counts, optionally update student's totalMemorizedAyahs
    if (data.recordType === 'SABQ' && data.status === 'Passed' && data.startAyah && data.endAyah) {
      const ayahsLearned = Math.max(1, data.endAyah - data.startAyah + 1);
      await Student.updateOne(
        { id: data.studentId },
        { $inc: { totalMemorizedAyahs: ayahsLearned } }
      );
    }

    // If Manzil was passed and juzNumber is provided, add to student completedJuzList if not present
    if (data.recordType === 'MANZIL' && data.status === 'Passed' && data.juzNumber) {
      await Student.updateOne(
        { id: data.studentId },
        { $addToSet: { completedJuzList: data.juzNumber } }
      );
    }

    // Emit real-time event immediately
    emitHifzRecordCreated(newRecord);

    await logAuditEvent('HIFZ_RECORD_CREATE', req.user, 'HifzRecord', recordId, {
      studentId: data.studentId,
      recordType: data.recordType,
      status: data.status,
    });

    return res.status(201).json({
      success: true,
      message: 'Hifz record saved and broadcasted successfully in real-time.',
      data: newRecord,
    });
  } catch (err: any) {
    console.error('[Hifz] Create record error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record Hifz evaluation' });
  }
});

// PUT /api/hifz/:id
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await HifzRecord.findOneAndUpdate(
      { id },
      { $set: req.body },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Hifz record not found' });
    }

    emitHifzRecordUpdated(updated);
    await logAuditEvent('HIFZ_RECORD_UPDATE', req.user, 'HifzRecord', id, req.body);

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update Hifz record' });
  }
});

export default router;
