import { Router, Response } from 'express';
import { ClassBatch } from '../models/ClassBatch';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';
import { User } from '../models/User';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { isMongoReady, getRuntimeDb, saveRuntimeDb } from '../config/runtimeStore';
import { resolveEffectiveAssignedClassIds } from '../utils/accessHelpers';
import { z } from 'zod';

const router = Router();

const classSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Class name is required'),
  arabicName: z.string().optional(),
  campusId: z.string().default('campus-main'),
  usthadId: z.string().min(1, 'Usthad mentor assignment is required'),
  roomNumber: z.string().optional(),
  academicYear: z.string().default('2026 - 2027'),
  capacity: z.number().min(1).default(30),
});

// GET /api/classes - List all or filtered by campus (MUDEER strictly scoped to assigned campus)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { campusId } = req.query;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      let classes = [...db.classes];

      if (user.role === 'MUDEER' || user.role === 'USTHAD') {
        if (user.campusId) classes = classes.filter((c) => c.campusId === user.campusId);
      } else if (campusId) {
        classes = classes.filter((c) => c.campusId === String(campusId));
      }

      const withCounts = classes.map((cls) => ({
        ...cls,
        totalStudents: db.students.filter((s) => s.classId === cls.id).length,
      }));
      return res.json({ success: true, data: withCounts });
    }

    const query: any = {};
    if (user.role === 'MUDEER' || user.role === 'USTHAD') {
      if (user.campusId) query.campusId = user.campusId;
    } else if (campusId) {
      query.campusId = campusId;
    }

    const classes = await ClassBatch.find(query).lean();
    const classesWithStudentCounts = await Promise.all(
      classes.map(async (cls) => {
        const count = await Student.countDocuments({ classId: cls.id });
        return { ...cls, totalStudents: count };
      })
    );

    return res.json({ success: true, data: classesWithStudentCounts });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve classes' });
  }
});

// GET /api/classes/mentors/list - Returns Campus Usthads + Campus Mudeer(s) as eligible batch faculty
router.get('/mentors/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const targetCampusId = user.role === 'MUDEER' || user.role === 'USTHAD'
      ? user.campusId
      : (req.query.campusId as string | undefined);

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const teachers = db.teachers.filter(
        (t) => !targetCampusId || t.assignedCampusId === targetCampusId
      );
      const mudeers = db.users
        .filter((u) => u.role === 'MUDEER' && (!targetCampusId || u.campusId === targetCampusId))
        .map((m) => ({
          id: m.id,
          teacherId: m.referenceId || 'MUDEER',
          fullName: m.fullName,
          arabicTitle: m.arabicName || m.fullName,
          photo: m.avatar || '/assets/images/avatar_mudir_male_1794118044233.jpg',
          phone: m.phone || '',
          email: m.email || '',
          qualification: 'Campus Mudeer · Faculty',
          experienceYears: 15,
          assignedCampusId: m.campusId || 'campus-main',
          assignedClassIds: db.classes.filter((c) => c.usthadId === m.id).map((c) => c.id),
          accountStatus: 'Active' as const,
          specialization: 'Campus Administration & Hifz Supervision',
          roleType: 'MUDEER' as const,
        }));

      const merged = [
        ...mudeers,
        ...teachers
          .filter((t) => !mudeers.some((m) => m.id === t.id))
          .map((t) => ({ ...t, roleType: 'USTHAD' as const })),
      ];
      return res.json({ success: true, data: merged });
    }

    const teacherQuery: any = targetCampusId ? { assignedCampusId: targetCampusId } : {};
    const mudeerQuery: any = { role: 'MUDEER', ...(targetCampusId ? { campusId: targetCampusId } : {}) };

    const [teachers, mudeerUsers, campusClasses] = await Promise.all([
      Teacher.find(teacherQuery).sort({ fullName: 1 }).lean(),
      User.find(mudeerQuery).lean(),
      ClassBatch.find(targetCampusId ? { campusId: targetCampusId } : {}).lean(),
    ]);

    const mudeers = mudeerUsers.map((m: any) => ({
      id: m.id,
      teacherId: m.referenceId || 'MUDEER',
      fullName: m.fullName,
      arabicTitle: m.arabicName || m.fullName,
      photo: m.avatar || '/assets/images/avatar_mudir_male_1794118044233.jpg',
      phone: m.phone || '',
      email: m.email || '',
      qualification: 'Campus Mudeer · Faculty',
      experienceYears: 15,
      assignedCampusId: m.campusId || 'campus-main',
      assignedClassIds: campusClasses.filter((c: any) => c.usthadId === m.id).map((c: any) => c.id),
      accountStatus: 'Active' as const,
      specialization: 'Campus Administration & Hifz Supervision',
      roleType: 'MUDEER' as const,
    }));

    const merged = [
      ...mudeers,
      ...teachers
        .filter((t: any) => !mudeers.some((m) => m.id === t.id))
        .map((t: any) => ({ ...t, roleType: 'USTHAD' as const })),
    ];

    return res.json({ success: true, data: merged });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve faculty mentors' });
  }
});

// GET /api/classes/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const cls = db.classes.find((c) => c.id === req.params.id);
      if (!cls) return res.status(404).json({ success: false, error: 'Class not found' });
      if (user.role === 'MUDEER' && user.campusId && cls.campusId !== user.campusId) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Class belongs to another campus.' });
      }
      const count = db.students.filter((s) => s.classId === cls.id).length;
      return res.json({ success: true, data: { ...cls, totalStudents: count } });
    }

    const cls = await ClassBatch.findOne({ id: req.params.id }).lean();
    if (!cls) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    if (user.role === 'MUDEER' && user.campusId && cls.campusId !== user.campusId) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Class belongs to another campus.' });
    }
    const count = await Student.countDocuments({ classId: cls.id });
    return res.json({ success: true, data: { ...cls, totalStudents: count } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve class' });
  }
});

// POST /api/classes - Create new class (MUDEER within campus or USTHAD)
router.post('/', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const parse = classSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid class data',
      });
    }

    const data = parse.data;
    const user = req.user!;
    const classId = data.id || `batch-${Date.now().toString(36)}`;
    const effectiveCampusId = user.campusId || data.campusId || 'campus-main';
    const targetUsthadId = user.role === 'USTHAD' ? (data.usthadId || user.id) : data.usthadId;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const newClass = {
        ...data,
        id: classId,
        campusId: effectiveCampusId,
        usthadId: targetUsthadId,
        totalStudents: 0,
      };
      db.classes.push(newClass);
      const t = db.teachers.find((tc) => tc.id === targetUsthadId);
      if (t && !t.assignedClassIds.includes(classId)) t.assignedClassIds.push(classId);
      const targetUser = db.users.find((usr) => usr.id === targetUsthadId);
      if (targetUser) {
        targetUser.assignedClassIds = Array.from(new Set([...(targetUser.assignedClassIds || []), classId]));
      }
      saveRuntimeDb(db);
      return res.status(201).json({ success: true, data: newClass });
    }

    const newClass = await ClassBatch.create({
      ...data,
      id: classId,
      campusId: effectiveCampusId,
      usthadId: targetUsthadId,
      totalStudents: 0,
    });

    await Teacher.updateOne(
      { id: targetUsthadId },
      { $addToSet: { assignedClassIds: classId } }
    );
    await User.updateOne(
      { id: targetUsthadId },
      { $addToSet: { assignedClassIds: classId } }
    );

    await logAuditEvent('CLASS_CREATE', req.user, 'ClassBatch', classId, {
      name: newClass.name,
      usthadId: newClass.usthadId,
      campusId: newClass.campusId,
    });

    return res.status(201).json({ success: true, data: newClass });
  } catch (err: any) {
    console.error('[Classes] Create class error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create class' });
  }
});

// PUT /api/classes/:id - Update class (MUDEER within campus or assigned USTHAD)
router.put('/:id', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const effectiveClassIds = user.role === 'USTHAD' ? await resolveEffectiveAssignedClassIds(user) : [];

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const idx = db.classes.findIndex((c) => c.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Class not found' });
      const existing = db.classes[idx];

      if (user.role === 'MUDEER' && user.campusId && existing.campusId !== user.campusId) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Class belongs to another campus.' });
      }
      if (user.role === 'USTHAD') {
        const isAssigned = effectiveClassIds.includes(id);
        if (!isAssigned && existing.usthadId !== user.id) {
          return res.status(403).json({ success: false, error: 'Access forbidden: You can only edit your assigned classes.' });
        }
      }

      const payload = { ...req.body };
      if (user.campusId) payload.campusId = user.campusId;

      db.classes[idx] = { ...existing, ...payload };
      if (payload.usthadId && payload.usthadId !== existing.usthadId) {
        const oldT = db.teachers.find((t) => t.id === existing.usthadId);
        if (oldT) oldT.assignedClassIds = (oldT.assignedClassIds || []).filter((cid: string) => cid !== id);
        const newT = db.teachers.find((t) => t.id === payload.usthadId);
        if (newT && !newT.assignedClassIds.includes(id)) newT.assignedClassIds.push(id);

        const oldU = db.users.find((u) => u.id === existing.usthadId);
        if (oldU) oldU.assignedClassIds = (oldU.assignedClassIds || []).filter((cid: string) => cid !== id);
        const newU = db.users.find((u) => u.id === payload.usthadId);
        if (newU) newU.assignedClassIds = Array.from(new Set([...(newU.assignedClassIds || []), id]));

        // Keep students in this batch aligned with new mentor
        db.students = db.students.map((s) =>
          s.classId === id ? { ...s, assignedTeacherId: payload.usthadId } : s
        );
      }
      saveRuntimeDb(db);
      return res.json({ success: true, data: db.classes[idx] });
    }

    const existing = await ClassBatch.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    if (user.role === 'MUDEER' && user.campusId && existing.campusId !== user.campusId) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Class belongs to another campus.' });
    }

    if (user.role === 'USTHAD') {
      const isAssigned = effectiveClassIds.includes(id);
      if (!isAssigned && existing.usthadId !== user.id) {
        return res.status(403).json({ success: false, error: 'Access forbidden: You can only edit your assigned classes.' });
      }
    }

    const payload = { ...req.body };
    if (user.campusId) payload.campusId = user.campusId;

    const updated = await ClassBatch.findOneAndUpdate({ id }, { $set: payload }, { new: true });

    if (payload.usthadId && payload.usthadId !== existing.usthadId) {
      await Promise.all([
        Teacher.updateOne({ id: existing.usthadId }, { $pull: { assignedClassIds: id } }),
        Teacher.updateOne({ id: payload.usthadId }, { $addToSet: { assignedClassIds: id } }),
        User.updateOne({ id: existing.usthadId }, { $pull: { assignedClassIds: id } }),
        User.updateOne({ id: payload.usthadId }, { $addToSet: { assignedClassIds: id } }),
        Student.updateMany({ classId: id }, { $set: { assignedTeacherId: payload.usthadId } }),
      ]);
    }

    await logAuditEvent('CLASS_UPDATE', req.user, 'ClassBatch', id, payload);

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update class' });
  }
});

// DELETE /api/classes/:id - MUDEER within campus or assigned USTHAD (with 0 students check)
router.delete('/:id', authenticate, authorize('MUDEER', 'USTHAD'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const existing = db.classes.find((c) => c.id === id);
      if (!existing) return res.status(404).json({ success: false, error: 'Class not found' });

      if (user.role === 'MUDEER' && user.campusId && existing.campusId !== user.campusId) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Class belongs to another campus.' });
      }
      if (user.role === 'USTHAD') {
        const isAssigned = user.assignedClassIds && user.assignedClassIds.includes(id);
        if (!isAssigned && existing.usthadId !== user.id) {
          return res.status(403).json({ success: false, error: 'Access forbidden: You can only delete your assigned classes.' });
        }
      }

      const studentsInClass = db.students.filter((s) => s.classId === id).length;
      if (studentsInClass > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete class batch: ${studentsInClass} students are currently assigned to this batch. Please reassign them first.`,
        });
      }

      db.classes = db.classes.filter((c) => c.id !== id);
      db.teachers = db.teachers.map((t) => ({
        ...t,
        assignedClassIds: (t.assignedClassIds || []).filter((cid: string) => cid !== id),
      }));
      saveRuntimeDb(db);
      return res.json({ success: true, message: 'Class deleted successfully' });
    }

    const existing = await ClassBatch.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    if (user.role === 'MUDEER' && user.campusId && existing.campusId !== user.campusId) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Class belongs to another campus.' });
    }

    if (user.role === 'USTHAD') {
      const isAssigned = user.assignedClassIds && user.assignedClassIds.includes(id);
      if (!isAssigned && existing.usthadId !== user.id) {
        return res.status(403).json({ success: false, error: 'Access forbidden: You can only delete your assigned classes.' });
      }
    }

    const studentsInClass = await Student.countDocuments({ classId: id });
    if (studentsInClass > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete class batch: ${studentsInClass} students are currently assigned to this batch. Please reassign them first.`,
      });
    }

    await ClassBatch.deleteOne({ id });
    await Teacher.updateMany({}, { $pull: { assignedClassIds: id } });

    await logAuditEvent('CLASS_DELETE', req.user, 'ClassBatch', id);

    return res.json({ success: true, message: 'Class deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete class' });
  }
});

export default router;
