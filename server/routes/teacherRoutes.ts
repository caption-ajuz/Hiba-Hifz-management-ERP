import { Router, Request, Response } from 'express';
import { Teacher } from '../models/Teacher';
import { User } from '../models/User';
import { ClassBatch } from '../models/ClassBatch';
import { emitTeacherUpdated } from '../socket';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
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

// GET /api/teachers - List teachers
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const teachers = await Teacher.find().sort({ fullName: 1 }).lean();
    return res.json({ success: true, data: teachers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve teachers' });
  }
});

// GET /api/teachers/:id
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const teacher = await Teacher.findOne({ id: req.params.id }).lean();
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }
    return res.json({ success: true, data: teacher });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve teacher' });
  }
});

// POST /api/teachers - Create Usthad Teacher & Auth Account (SUPER_ADMIN only)
router.post('/', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
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

    // Check duplicate Teacher ID
    const existingTeacherId = await Teacher.findOne({ teacherId: data.teacherId });
    if (existingTeacherId) {
      return res.status(409).json({
        success: false,
        error: `Teacher with ID '${data.teacherId}' already exists.`,
      });
    }

    // Check duplicate Username or Email in User collection
    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: `A user account with username '${cleanUsername}' or email '${cleanEmail}' already exists.`,
      });
    }

    const teacherDocId = `usr_teacher_${Date.now()}`;
    const avatar = data.photo || '/assets/images/avatar_usthad_male_1794118062835.jpg';

    // 1. Create Teacher Profile
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
      assignedCampusId: data.assignedCampusId,
      assignedClassIds: data.assignedClassIds,
      accountStatus: data.accountStatus,
      specialization: data.specialization,
    });

    // 2. Create User Authentication Record with hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const newUser = await User.create({
      id: teacherDocId,
      role: 'USTHAD',
      fullName: data.fullName,
      arabicName: data.arabicTitle,
      username: cleanUsername,
      email: cleanEmail,
      password: hashedPassword,
      phone: data.phone,
      avatar,
      avatarPublicId: data.photoPublicId,
      title: `Usthad · ${data.specialization}`,
      referenceId: data.teacherId,
      assignedClassIds: data.assignedClassIds,
      isActive: data.accountStatus === 'Active',
    });

    // 3. Update assigned ClassBatch records if specified
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

// PUT /api/teachers/:id - Update teacher profile & linked user account (SUPER_ADMIN only)
router.put('/:id', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await Teacher.findOne({ id });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    const updated = await Teacher.findOneAndUpdate({ id }, { $set: req.body }, { new: true });

    // Sync corresponding User account details if present
    const userUpdates: any = {};
    if (req.body.fullName) userUpdates.fullName = req.body.fullName;
    if (req.body.arabicTitle) userUpdates.arabicName = req.body.arabicTitle;
    if (req.body.phone) userUpdates.phone = req.body.phone;
    if (req.body.assignedClassIds) userUpdates.assignedClassIds = req.body.assignedClassIds;
    if (req.body.photo) userUpdates.avatar = req.body.photo;
    if (req.body.accountStatus) userUpdates.isActive = req.body.accountStatus === 'Active';

    if (Object.keys(userUpdates).length > 0) {
      await User.updateOne({ $or: [{ id }, { referenceId: existing.teacherId }] }, { $set: userUpdates });
    }

    // Update ClassBatch usthadId if classes updated
    if (req.body.assignedClassIds && Array.isArray(req.body.assignedClassIds)) {
      await ClassBatch.updateMany(
        { id: { $in: req.body.assignedClassIds } },
        { $set: { usthadId: id } }
      );
    }

    if (updated) {
      emitTeacherUpdated(updated);
      await logAuditEvent('TEACHER_UPDATE', req.user, 'Teacher', id, req.body);
    }

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update teacher' });
  }
});

// POST /api/teachers/:id/reset-password - Reset Usthad password (SUPER_ADMIN only)
router.post('/:id/reset-password', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const teacher = await Teacher.findOne({ id });
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher profile not found.' });
    }

    const user = await User.findOne({ $or: [{ id }, { referenceId: teacher.teacherId }] });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Linked user account not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await logAuditEvent('PASSWORD_RESET', req.user, 'User', user.id, {
      targetTeacherId: teacher.teacherId,
    });

    return res.json({ success: true, message: `Password for Usthad ${teacher.fullName} successfully updated.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
});

// DELETE /api/teachers/:id - Super Admin only
router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findOne({ id });
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
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
