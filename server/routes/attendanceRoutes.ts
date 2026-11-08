import { Router, Response } from 'express';
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
router.get('/session', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { classId, date, sessionHour } = req.query;
    if (!classId || !date) {
      return res.status(400).json({ success: false, error: 'classId and date are required parameters' });
    }

    const user = req.user!;
    const strClassId = String(classId);

    // RBAC validation for session retrieval
    if (user.role === 'USTHAD') {
      const allowed = user.assignedClassIds && user.assignedClassIds.includes(strClassId);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: You can only view attendance sessions for your assigned classes.',
        });
      }
    }

    const hour = parseInt(sessionHour as string) || 1;

    const session = await AttendanceSessionModel.findOne({
      classId: strClassId,
      date: String(date),
      sessionHour: hour,
    }).lean();

    return res.json({ success: true, data: session || null });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve attendance session' });
  }
});

// POST /api/attendance/session - Save or update attendance session (SUPER_ADMIN or USTHAD only)
router.post('/session', authenticate, authorize('SUPER_ADMIN', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const parse = saveSessionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid session payload',
      });
    }

    const { classId, date, sessionHour, sessionName, usthadId, topic, records, academicYear } = parse.data;

    // Strict Scope Validation: Usthad can only mark attendance for their assigned classes!
    if (user.role === 'USTHAD') {
      const isAssigned = user.assignedClassIds && user.assignedClassIds.includes(classId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: `Access forbidden: You are not assigned to class batch ${classId}.`,
        });
      }
    }

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
        usthadId: user.role === 'USTHAD' ? user.id : usthadId,
        topic,
        records,
        academicYear,
        submittedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 2. Atomic Upsert for individual student AttendanceItem records
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
            markedByUsthadId: user.id,
            academicYear,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await AttendanceItem.bulkWrite(bulkOps);
    }

    // 3. Recalculate attendance rates for affected students
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

    // 4. Emit real-time WebSocket event
    emitAttendanceUpdated({
      classId,
      date,
      sessionHour,
      records,
      updatedBy: user.fullName || 'Usthad',
    });

    await logAuditEvent('ATTENDANCE_SUBMIT', user, 'AttendanceSession', sessionId, {
      classId,
      date,
      sessionHour,
      studentCount: Object.keys(records).length,
    });

    return res.json({
      success: true,
      message: 'Attendance recorded and synchronized successfully.',
      data: sessionDoc,
    });
  } catch (err: any) {
    console.error('[Attendance] Error saving session:', err);
    return res.status(500).json({ success: false, error: 'Database failure during attendance submission' });
  }
});

// GET /api/attendance/student/:id - Student attendance history with strict RBAC access checks
router.get('/student/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    // RBAC ownership check
    if (user.role === 'STUDENT') {
      if (user.studentId !== id) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: Students may only view their own attendance history.',
        });
      }
    } else if (user.role === 'PARENT') {
      const isLinked = user.linkedStudentIds && user.linkedStudentIds.includes(id);
      if (!isLinked) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: Parents may only view attendance history of their linked children.',
        });
      }
    } else if (user.role === 'USTHAD') {
      const student = await Student.findOne({ id }).lean();
      if (!student) {
        return res.status(404).json({ success: false, error: 'Student not found.' });
      }
      const isAssigned =
        (user.assignedClassIds && user.assignedClassIds.includes(student.classId)) ||
        student.assignedTeacherId === user.id ||
        student.assignedTeacherId === user.referenceId;
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: Usthad can only view attendance of assigned students.',
        });
      }
    }

    const records = await AttendanceItem.find({ studentId: id })
      .sort({ date: -1, sessionHour: -1 })
      .limit(90)
      .lean();

    return res.json({ success: true, data: records });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve student attendance history' });
  }
});

export default router;
