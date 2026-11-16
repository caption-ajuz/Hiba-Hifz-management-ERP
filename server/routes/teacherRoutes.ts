import { Router, Response } from 'express';
import { Teacher } from '../models/Teacher';
import { User } from '../models/User';
import { ClassBatch } from '../models/ClassBatch';
import { emitTeacherUpdated } from '../socket';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import { isMongoReady, getRuntimeDb, saveRuntimeDb } from '../config/runtimeStore';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const router = Router();

const createTeacherSchema = z.object({
  fullName: z.string().min(2, 'Full Name is required'),
  arabicTitle: z.string().optional(),
  teacherId: z.string().min(2, 'Teacher ID is required'),
  phone: z.string().min(5, 'Phone Number is required'),
  email: z.string().email('Valid Email is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  assignedCampusId: z.string().default('campus-main'),
  assignedClassIds: z.array(z.string()).default([]),
  qualification: z.string().default('Hafiz & Qari'),
  experienceYears: z.number().default(0),
  specialization: z.string().default('Hifz & Tajweed'),
  accountStatus: z.enum(['Active', 'On Leave']).default('Active'),
  photo: z.string().optional(),
  photoPublicId: z.string().optional(),
});

// GET /api/teachers - List teachers scoped to MUDEER campus (HYBA_SUPER_ADMIN sees all)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { campusId } = req.query;

    if (!isMongoReady()) {
      let teachers = [...getRuntimeDb().teachers];
      if (user.role === 'MUDEER' || user.role === 'USTHAD') {
        if (user.campusId) {
          teachers = teachers.filter((t) => t.assignedCampusId === user.campusId);
        }
      } else if (campusId) {
        teachers = teachers.filter((t) => t.assignedCampusId === String(campusId));
      }
      teachers.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      return res.json({ success: true, data: teachers });
    }

    const query: any = {};
    if (user.role === 'MUDEER' || user.role === 'USTHAD') {
      if (user.campusId) query.assignedCampusId = user.campusId;
    } else if (campusId) {
      query.assignedCampusId = String(campusId);
    }

    const teachers = await Teacher.find(query).sort({ fullName: 1 }).lean();
    return res.json({ success: true, data: teachers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve teachers' });
  }
});

// GET /api/teachers/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const teacher = isMongoReady()
      ? await Teacher.findOne({ id: req.params.id }).lean()
      : getRuntimeDb().teachers.find((t) => t.id === req.params.id);

    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
    if (user.role === 'MUDEER' && user.campusId && teacher.assignedCampusId !== user.campusId) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Teacher belongs to another campus.' });
    }
    return res.json({ success: true, data: teacher });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve teacher' });
  }
});

// POST /api/teachers - Create Usthad Teacher & Auth Account (MUDEER only, scoped to their campus)
router.post('/', authenticate, authorize('MUDEER'), async (req: AuthRequest, res: Response) => {
  try {
    const parse = createTeacherSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid teacher payload',
      });
    }

    const data = parse.data;
    const cleanUsername = data.username.toLowerCase().trim();
    const cleanEmail = data.email.toLowerCase().trim();
    const effectiveCampusId = req.user?.campusId || data.assignedCampusId || 'campus-main';
    const teacherDocId = `usr_teacher_${Date.now()}`;
    const avatar = data.photo || '/assets/images/avatar_usthad_male_1794118062835.jpg';

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      if (db.teachers.some((t) => t.teacherId === data.teacherId)) {
        return res.status(409).json({
          success: false,
          error: `Teacher with ID '${data.teacherId}' already exists.`,
        });
      }
      if (db.users.some((u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail)) {
        return res.status(409).json({
          success: false,
          error: `A user account with username '${cleanUsername}' or email '${cleanEmail}' already exists.`,
        });
      }

      const newTeacher = {
        id: teacherDocId,
        teacherId: data.teacherId,
        fullName: data.fullName,
        arabicTitle: data.arabicTitle || `الأستاذ ${data.fullName}`,
        photo: avatar,
        photoPublicId: data.photoPublicId,
        phone: data.phone,
        email: cleanEmail,
        qualification: data.qualification,
        experienceYears: data.experienceYears,
        assignedCampusId: effectiveCampusId,
        assignedClassIds: data.assignedClassIds,
        accountStatus: data.accountStatus,
        specialization: data.specialization,
      };
      db.teachers.push(newTeacher);

      const newUser = {
        id: teacherDocId,
        role: 'USTHAD' as const,
        fullName: data.fullName,
        arabicName: data.arabicTitle,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash: bcrypt.hashSync(data.password, 10),
        phone: data.phone,
        avatar,
        avatarPublicId: data.photoPublicId,
        title: `Usthad · ${data.specialization}`,
        referenceId: data.teacherId,
        campusId: effectiveCampusId,
        assignedClassIds: data.assignedClassIds,
        isActive: data.accountStatus === 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.users.push(newUser);

      if (data.assignedClassIds.length > 0) {
        db.classes = db.classes.map((c) =>
          data.assignedClassIds.includes(c.id) ? { ...c, usthadId: teacherDocId } : c
        );
      }

      saveRuntimeDb(db);
      emitTeacherUpdated(newTeacher);

      return res.status(201).json({
        success: true,
        message: 'Usthad account created and authenticated successfully.',
        data: {
          teacher: newTeacher,
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
          },
        },
      });
    }

    const existingTeacherId = await Teacher.findOne({ teacherId: data.teacherId });
    if (existingTeacherId) {
      return res.status(409).json({
        success: false,
        error: `Teacher with ID '${data.teacherId}' already exists.`,
      });
    }

    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: `A user account with username '${cleanUsername}' or email '${cleanEmail}' already exists.`,
      });
    }

    const newTeacher = await Teacher.create({
      id: teacherDocId,
      teacherId: data.teacherId,
      fullName: data.fullName,
      arabicTitle: data.arabicTitle || `الأستاذ ${data.fullName}`,
      photo: avatar,
      photoPublicId: data.photoPublicId,
      phone: data.phone,
      email: cleanEmail,
      qualification: data.qualification,
      experienceYears: data.experienceYears,
      assignedCampusId: effectiveCampusId,
      assignedClassIds: data.assignedClassIds,
      accountStatus: data.accountStatus,
      specialization: data.specialization,
    });

    const newUser = await User.create({
      id: teacherDocId,
      role: 'USTHAD',
      fullName: data.fullName,
      arabicName: data.arabicTitle,
      username: cleanUsername,
      email: cleanEmail,
      password: data.password,
      phone: data.phone,
      avatar,
      avatarPublicId: data.photoPublicId,
      title: `Usthad · ${data.specialization}`,
      referenceId: data.teacherId,
      campusId: effectiveCampusId,
      assignedClassIds: data.assignedClassIds,
      isActive: data.accountStatus === 'Active',
    });

    if (data.assignedClassIds.length > 0) {
      await ClassBatch.updateMany(
        { id: { $in: data.assignedClassIds } },
        { $set: { usthadId: teacherDocId } }
      );
    }

    emitTeacherUpdated(newTeacher);

    await logAuditEvent('TEACHER_CREATE', req.user, 'Teacher', teacherDocId, {
      fullName: newTeacher.fullName,
      teacherId: newTeacher.teacherId,
      username: cleanUsername,
      campusId: effectiveCampusId,
      assignedClasses: data.assignedClassIds,
    });

    return res.status(201).json({
      success: true,
      message: 'Usthad account created and authenticated successfully.',
      data: {
        teacher: newTeacher,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      },
    });
  } catch (err: any) {
    console.error('[Teachers] Create teacher error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create Usthad account.' });
  }
});

// PUT /api/teachers/:id - Update teacher profile & linked user account (MUDEER only, within campus)
router.put('/:id', authenticate, authorize('MUDEER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const idx = db.teachers.findIndex((t) => t.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Teacher not found' });
      const existing = db.teachers[idx];

      if (user.campusId && existing.assignedCampusId !== user.campusId) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Teacher belongs to another campus.' });
      }

      const payload = { ...req.body };
      if (user.campusId) payload.assignedCampusId = user.campusId;

      db.teachers[idx] = { ...existing, ...payload };
      const u = db.users.find((usr) => usr.id === id || usr.referenceId === existing.teacherId);
      if (u) {
        if (payload.fullName) u.fullName = payload.fullName;
        if (payload.arabicTitle) u.arabicName = payload.arabicTitle;
        if (payload.phone) u.phone = payload.phone;
        if (payload.assignedClassIds) u.assignedClassIds = payload.assignedClassIds;
        if (payload.photo) u.avatar = payload.photo;
        if (payload.accountStatus) u.isActive = payload.accountStatus === 'Active';
      }
      if (Array.isArray(payload.assignedClassIds)) {
        const nextIds: string[] = payload.assignedClassIds;
        db.classes = db.classes.map((c) => {
          if (nextIds.includes(c.id)) {
            return { ...c, usthadId: id };
          }
          return c;
        });
        // Pull reassigned classes from other teachers/users
        db.teachers = db.teachers.map((t) =>
          t.id === id
            ? t
            : { ...t, assignedClassIds: (t.assignedClassIds || []).filter((cid: string) => !nextIds.includes(cid)) }
        );
        db.users = db.users.map((usr) =>
          usr.id === id
            ? usr
            : { ...usr, assignedClassIds: (usr.assignedClassIds || []).filter((cid: string) => !nextIds.includes(cid)) }
        );
        // Update students in those batches
        db.students = db.students.map((s) =>
          nextIds.includes(s.classId) ? { ...s, assignedTeacherId: id } : s
        );
      }
      saveRuntimeDb(db);
      emitTeacherUpdated(db.teachers[idx]);
      return res.json({ success: true, data: db.teachers[idx] });
    }

    const existing = await Teacher.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    if (user.campusId && existing.assignedCampusId !== user.campusId) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Teacher belongs to another campus.' });
    }

    const payload = { ...req.body };
    if (user.campusId) payload.assignedCampusId = user.campusId;

    const updated = await Teacher.findOneAndUpdate({ id }, { $set: payload }, { new: true });

    const userUpdates: any = {};
    if (payload.fullName) userUpdates.fullName = payload.fullName;
    if (payload.arabicTitle) userUpdates.arabicName = payload.arabicTitle;
    if (payload.phone) userUpdates.phone = payload.phone;
    if (payload.assignedClassIds) userUpdates.assignedClassIds = payload.assignedClassIds;
    if (payload.photo) userUpdates.avatar = payload.photo;
    if (payload.accountStatus) userUpdates.isActive = payload.accountStatus === 'Active';

    if (Object.keys(userUpdates).length > 0) {
      await User.updateOne({ $or: [{ id }, { referenceId: existing.teacherId }] }, { $set: userUpdates });
    }

    if (payload.assignedClassIds && Array.isArray(payload.assignedClassIds)) {
      const nextIds: string[] = payload.assignedClassIds;
      await Promise.all([
        ClassBatch.updateMany({ id: { $in: nextIds } }, { $set: { usthadId: id } }),
        Teacher.updateMany({ id: { $ne: id } }, { $pull: { assignedClassIds: { $in: nextIds } } }),
        User.updateMany({ id: { $ne: id } }, { $pull: { assignedClassIds: { $in: nextIds } } }),
      ]);
    }

    if (updated) {
      emitTeacherUpdated(updated);
      await logAuditEvent('TEACHER_UPDATE', req.user, 'Teacher', id, payload);
    }

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update teacher' });
  }
});

// POST /api/teachers/:id/reset-password - Reset Usthad password (MUDEER within campus)
router.post('/:id/reset-password', authenticate, authorize('MUDEER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const reqUser = req.user!;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const teacher = db.teachers.find((t) => t.id === id);
      if (!teacher) return res.status(404).json({ success: false, error: 'Teacher profile not found.' });
      if (reqUser.campusId && teacher.assignedCampusId !== reqUser.campusId) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Teacher belongs to another campus.' });
      }
      const user = db.users.find((u) => u.id === id || u.referenceId === teacher.teacherId);
      if (!user) return res.status(404).json({ success: false, error: 'Linked user account not found.' });
      user.passwordHash = bcrypt.hashSync(newPassword, 10);
      user.updatedAt = new Date().toISOString();
      saveRuntimeDb(db);
      return res.json({ success: true, message: `Password for Usthad ${teacher.fullName} successfully updated.` });
    }

    const teacher = await Teacher.findOne({ id });
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher profile not found.' });
    }
    if (reqUser.campusId && teacher.assignedCampusId !== reqUser.campusId) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Teacher belongs to another campus.' });
    }

    const user = await User.findOne({ $or: [{ id }, { referenceId: teacher.teacherId }] });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Linked user account not found.' });
    }

    user.password = newPassword;
    await user.save();

    await logAuditEvent('PASSWORD_RESET', req.user, 'User', user.id, {
      targetTeacherId: teacher.teacherId,
    });

    return res.json({ success: true, message: `Password for Usthad ${teacher.fullName} successfully updated.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
});

// DELETE /api/teachers/:id - MUDEER only (within campus)
router.delete('/:id', authenticate, authorize('MUDEER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reqUser = req.user!;

    if (!isMongoReady()) {
      const db = getRuntimeDb();
      const teacher = db.teachers.find((t) => t.id === id);
      if (!teacher) return res.status(404).json({ success: false, error: 'Teacher not found' });
      if (reqUser.campusId && teacher.assignedCampusId !== reqUser.campusId) {
        return res.status(403).json({ success: false, error: 'Access forbidden: Teacher belongs to another campus.' });
      }
      db.teachers = db.teachers.filter((t) => t.id !== id);
      db.users = db.users.filter((u) => u.id !== id && u.referenceId !== teacher.teacherId);
      saveRuntimeDb(db);
      return res.json({ success: true, message: 'Teacher and authentication account deleted successfully.' });
    }

    const teacher = await Teacher.findOne({ id });
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
    if (reqUser.campusId && teacher.assignedCampusId !== reqUser.campusId) {
      return res.status(403).json({ success: false, error: 'Access forbidden: Teacher belongs to another campus.' });
    }

    await Teacher.deleteOne({ id });
    await User.deleteOne({ $or: [{ id }, { referenceId: teacher.teacherId }] });

    await logAuditEvent('TEACHER_DELETE', req.user, 'Teacher', id, { name: teacher.fullName });

    return res.json({ success: true, message: 'Teacher and authentication account deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete teacher' });
  }
});

export default router;
