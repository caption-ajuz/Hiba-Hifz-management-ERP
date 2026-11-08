import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken, authenticate, AuthRequest, logAuditEvent } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Invalid input data',
      });
    }

    const { username, password } = parseResult.data;
    const cleanUser = username.trim().toLowerCase();

    // Find user by username, email, or referenceId
    const user = await User.findOne({
      $or: [
        { username: cleanUser },
        { email: cleanUser },
        { referenceId: cleanUser },
        { referenceId: username.trim() },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account deactivated. Please contact campus administration.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Password incorrect.',
      });
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user);

    await logAuditEvent('USER_LOGIN', user, 'User', user.id, { username: user.username }, req.ip);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        arabicName: user.arabicName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        title: user.title,
        referenceId: user.referenceId,
        studentId: user.studentId,
        linkedStudentIds: user.linkedStudentIds,
        assignedClassIds: user.assignedClassIds,
      },
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred during authentication.',
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const u = req.user;
  return res.json({
    success: true,
    user: {
      id: u.id,
      role: u.role,
      fullName: u.fullName,
      arabicName: u.arabicName,
      username: u.username,
      email: u.email,
      phone: u.phone,
      avatar: u.avatar,
      title: u.title,
      referenceId: u.referenceId,
      studentId: u.studentId,
      linkedStudentIds: u.linkedStudentIds,
      assignedClassIds: u.assignedClassIds,
    },
  });
});

// POST /api/auth/switch-role (For demo / authority switcher)
router.post('/switch-user', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Target user ID is required.' });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Requested profile not found.' });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        arabicName: user.arabicName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        title: user.title,
        referenceId: user.referenceId,
        studentId: user.studentId,
        linkedStudentIds: user.linkedStudentIds,
        assignedClassIds: user.assignedClassIds,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to switch profile.' });
  }
});

export default router;
