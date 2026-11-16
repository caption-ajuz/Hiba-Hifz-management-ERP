import { Router, Response } from 'express';
import { AttendanceSessionModel, AttendanceItem } from '../models/Attendance';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { Teacher } from '../models/Teacher';
import { emitAttendanceUpdated } from '../socket';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { isMongoReady, getRuntimeDb, saveRuntimeDb } from '../config/runtimeStore';
import { resolveEffectiveAssignedClassIds } from '../utils/accessHelpers';
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
  description: z.string().optional(),
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

    if (user.role === 'USTHAD') {
      const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
      const allowed = effectiveClassIds.includes(strClassId);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: You can only view attendance sessions for your assigned classes.',
        });
      }
    }

    const hour = parseInt(sessionHour as string, 10) || 1;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const session = db.attendanceSessions.find(
        (s) => s.classId === strClassId && s.date === String(date) && s.sessionHour === hour
      );
      return res.json({ success: true, data: session || null });
    }

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

// POST /api/attendance/session - Save or update attendance session (MUDEER or USTHAD only)
router.post('/session', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const parse = saveSessionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid session payload',
      });
    }

    const { classId, date, sessionHour, sessionName, usthadId, topic, description, records, academicYear } =
      parse.data;

    if (user.role === 'USTHAD') {
      const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
      const isAssigned = effectiveClassIds.includes(classId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: `Access forbidden: You are not assigned to class batch ${classId}.`,
        });
      }
    }

    const fallbackSessionId = req.body.id || `att_${classId}_${date}_h${sessionHour}`;
    const effectiveUsthadId = user.role === 'USTHAD' ? user.id : usthadId;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      if (user.role === 'MUDEER' && user.campusId) {
        const cls = db.classes.find((c) => c.id === classId);
        if (cls && cls.campusId !== user.campusId) {
          return res.status(403).json({ success: false, error: 'Access forbidden: Class belongs to another campus.' });
        }
      }

      const existingIdx = db.attendanceSessions.findIndex(
        (s) => s.classId === classId && s.date === date && s.sessionHour === sessionHour
      );
      const resolvedSessionId =
        existingIdx >= 0 && db.attendanceSessions[existingIdx]?.id
          ? db.attendanceSessions[existingIdx].id
          : fallbackSessionId;

      const sessionObj = {
        id: resolvedSessionId,
        classId,
        date,
        sessionHour,
        sessionName,
        usthadId: effectiveUsthadId,
        topic: topic || '',
        description: description || '',
        records,
        academicYear,
        submittedAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) db.attendanceSessions[existingIdx] = sessionObj;
      else db.attendanceSessions.push(sessionObj);

      for (const [studentId, status] of Object.entries(records)) {
        const itemIdx = db.attendanceItems.findIndex(
          (item) => item.studentId === studentId && item.date === date && item.sessionHour === sessionHour
        );
        const itemObj = {
          id: `att_item_${studentId}_${date}_h${sessionHour}`,
          studentId,
          classId,
          date,
          sessionHour,
          status,
          markedByUsthadId: user.id,
          academicYear,
        };
        if (itemIdx >= 0) db.attendanceItems[itemIdx] = itemObj;
        else db.attendanceItems.push(itemObj);

        const markedItems = db.attendanceItems.filter(
          (i) => i.studentId === studentId && i.status !== 'NOT_MARKED'
        );
        if (markedItems.length > 0) {
          const present = markedItems.filter((i) => i.status === 'PRESENT' || i.status === 'LATE').length;
          const stu = db.students.find((s) => s.id === studentId);
          if (stu) stu.attendanceRate = Math.round((present / markedItems.length) * 100);
        }
      }

      saveRuntimeDb(db);
      emitAttendanceUpdated({
        classId,
        date,
        sessionHour,
        sessionName,
        topic: topic || '',
        description: description || '',
        records,
        updatedBy: user.fullName || 'Usthad',
      });

      return res.json({
        success: true,
        message: 'Attendance recorded and synchronized successfully.',
        data: sessionObj,
      });
    }

    const sessionDoc = await AttendanceSessionModel.findOneAndUpdate(
      { classId, date, sessionHour },
      {
        $set: {
          classId,
          date,
          sessionHour,
          sessionName,
          usthadId: effectiveUsthadId,
          topic: topic || '',
          description: description || '',
          records,
          academicYear,
          submittedAt: new Date(),
        },
        $setOnInsert: {
          id: fallbackSessionId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

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

    setTimeout(async () => {
      try {
        const studentIds = Object.keys(records);
        for (const sid of studentIds) {
          const totalRecords = await AttendanceItem.countDocuments({
            studentId: sid,
            status: { $ne: 'NOT_MARKED' },
          });
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

    emitAttendanceUpdated({
      classId,
      date,
      sessionHour,
      sessionName,
      topic: topic || '',
      description: description || '',
      records,
      updatedBy: user.fullName || 'Usthad',
    });

    await logAuditEvent('ATTENDANCE_SUBMIT', user, 'AttendanceSession', sessionDoc?.id || fallbackSessionId, {
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
      const student = isMongoReady()
        ? await Student.findOne({ id }).lean()
        : getRuntimeDb().students.find((s) => s.id === id);

      if (!student) {
        return res.status(404).json({ success: false, error: 'Student not found.' });
      }
      const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
      const isAssigned =
        effectiveClassIds.includes(student.classId) ||
        student.assignedTeacherId === user.id ||
        student.assignedTeacherId === user.referenceId;
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: 'Access forbidden: Usthad can only view attendance of assigned students.',
        });
      }
    }

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const rawRecords = db.attendanceItems
        .filter((i) => i.studentId === id)
        .sort((a, b) => `${b.date}-${b.sessionHour}`.localeCompare(`${a.date}-${a.sessionHour}`))
        .slice(0, 500);

      const enriched = rawRecords.map((item) => {
        const session = db.attendanceSessions.find(
          (s) => s.classId === item.classId && s.date === item.date && s.sessionHour === item.sessionHour
        );
        const mentorId = session?.usthadId || item.markedByUsthadId;
        const mentor =
          db.users.find((u) => u.id === mentorId || u.referenceId === mentorId) ||
          db.teachers.find((t) => t.id === mentorId || t.teacherId === mentorId);
        return {
          ...item,
          sessionName: session?.sessionName || `Hour ${item.sessionHour}`,
          topic: session?.topic || '',
          description: session?.description || '',
          markedByName: mentor?.fullName || '',
        };
      });

      return res.json({ success: true, data: enriched });
    }

    const rawRecords = await AttendanceItem.find({ studentId: id })
      .sort({ date: -1, sessionHour: -1 })
      .limit(500)
      .lean();

    const uniqueKeys = Array.from(
      new Set(rawRecords.map((r) => `${r.classId}__${r.date}__${r.sessionHour}`))
    );
    const sessionConditions = uniqueKeys.map((k) => {
      const [classId, date, hr] = k.split('__');
      return { classId, date, sessionHour: Number(hr) };
    });

    const [sessions, users, teachers] = await Promise.all([
      sessionConditions.length > 0
        ? AttendanceSessionModel.find({ $or: sessionConditions }).lean()
        : Promise.resolve([]),
      User.find({ role: { $in: ['USTHAD', 'MUDEER'] } }).select('id referenceId fullName').lean(),
      Teacher.find().select('id teacherId fullName').lean(),
    ]);

    const enriched = rawRecords.map((item) => {
      const session = sessions.find(
        (s) => s.classId === item.classId && s.date === item.date && s.sessionHour === item.sessionHour
      );
      const mentorId = session?.usthadId || item.markedByUsthadId;
      const mentor =
        users.find((u) => u.id === mentorId || u.referenceId === mentorId) ||
        teachers.find((t) => t.id === mentorId || t.teacherId === mentorId);
      return {
        ...item,
        sessionName: session?.sessionName || `Hour ${item.sessionHour}`,
        topic: session?.topic || '',
        description: session?.description || '',
        markedByName: mentor?.fullName || '',
      };
    });

    return res.json({ success: true, data: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve student attendance history' });
  }
});

export default router;
