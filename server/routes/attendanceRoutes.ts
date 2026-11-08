import { Router, Request, Response } from 'express';
import { AttendanceSessionModel, AttendanceItem } from '../models/Attendance';
import { Student } from '../models/Student';
import { emitAttendanceUpdated } from '../socket';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const saveSessionSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1),
  date: z.string().min(1), // YYYY-MM-DD
  sessionHour: z.number().min(1).max(5),
  sessionName: z.string().min(1),
  usthadId: z.string().min(1),
  topic: z.string().optional(),
  records: z.record(z.string(), z.enum(['PRESENT', 'ABSENT', 'LATE', 'NOT_MARKED'])),
  academicYear: z.string().default('2026 - 2027'),
});

// GET /api/attendance/session - Retrieve attendance session by class, date, and hour
router.get('/session', async (req: Request, res: Response) => {
  try {
    const { classId, date, sessionHour } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ success: false, error: 'classId and date are required parameters' });
    }

    const hour = parseInt(sessionHour as string) || 1;

    const session = await AttendanceSessionModel.findOne({
      classId: String(classId),
      date: String(date),
      sessionHour: hour,
    }).lean();

    return res.json({ success: true, data: session || null });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve attendance session' });
  }
});

// POST /api/attendance/session - Save or update attendance session
router.post('/session', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const parse = saveSessionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid session payload',
      });
    }

    const { classId, date, sessionHour, sessionName, usthadId, topic, records, academicYear } = parse.data;
    const sessionId = req.body.id || `att_${classId}_${date}_h${sessionHour}`;

    // 1. Upsert AttendanceSessionModel
    const sessionDoc = await AttendanceSessionModel.findOneAndUpdate(
      { classId, date, sessionHour },
      {
        id: sessionId,
        classId,
        date,
        sessionHour,
        sessionName,
        usthadId,
        topic,
        records,
        academicYear,
        submittedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 2. Atomic Upsert for individual student AttendanceItem records (Preventing duplicates with unique compound index)
    const bulkOps = Object.entries(records).map(([studentId, status]) => ({
      updateOne: {
        filter: { studentId, date, sessionHour },
        update: {
          $set: {
            studentId,
            classId,
            date,
            sessionHour,
            status,
            markedByUsthadId: usthadId,
            academicYear,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await AttendanceItem.bulkWrite(bulkOps);
    }

    // 3. Recalculate attendance rates for students in background
    setTimeout(async () => {
      try {
        const studentIds = Object.keys(records);
        for (const sid of studentIds) {
          const totalRecords = await AttendanceItem.countDocuments({ studentId: sid });
          const presentRecords = await AttendanceItem.countDocuments({
            studentId: sid,
            status: { $in: ['PRESENT', 'LATE'] },
          });
          if (totalRecords > 0) {
            const rate = Math.round((presentRecords / totalRecords) * 100);
            await Student.updateOne({ id: sid }, { attendanceRate: rate });
          }
        }
      } catch (err) {
        console.error('[Attendance] Rate recalculation error:', err);
      }
    }, 100);

    // 4. Emit real-time WebSocket event after successful database persistence!
    emitAttendanceUpdated({
      classId,
      date,
      sessionHour,
      records,
      updatedBy: req.user?.fullName || 'Usthad',
    });

    await logAuditEvent('ATTENDANCE_SUBMIT', req.user, 'AttendanceSession', sessionId, {
      classId,
      date,
      sessionHour,
      studentCount: Object.keys(records).length,
    });

    return res.json({
      success: true,
      message: 'Attendance recorded and synchronized successfully in MongoDB Atlas.',
      data: sessionDoc,
    });
  } catch (err: any) {
    console.error('[Attendance] Error saving session:', err);
    return res.status(500).json({ success: false, error: 'Database failure during attendance submission' });
  }
});

// GET /api/attendance/student/:id - Student attendance history
router.get('/student/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const records = await AttendanceItem.find({ studentId: id })
      .sort({ date: -1, sessionHour: -1 })
      .limit(60)
      .lean();

    return res.json({ success: true, data: records });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve student attendance history' });
  }
});

export default router;
