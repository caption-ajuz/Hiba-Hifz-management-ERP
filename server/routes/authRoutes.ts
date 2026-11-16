import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { ClassBatch } from '../models/ClassBatch';
import { PasswordResetToken } from '../models/InstitutionModels';
import { generateToken, authenticate, AuthRequest, logAuditEvent } from '../middleware/auth';
import { isMongoReady, getRuntimeDb, saveRuntimeDb, sanitizeRuntimeUser } from '../config/runtimeStore';
import {
  resolveEffectiveAssignedClassIds,
  getStudentDobPasswordVariants,
  ensureStudentUserAccount,
  ensureParentUserAccountForStudent,
  normalizePersonName,
  phonesMatch,
} from '../utils/accessHelpers';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

const forgotRequestSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
});

const verifyOtpSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  otp: z.string().length(6, 'Verification code must be 6 digits'),
  phoneLast4: z.string().length(4, 'Enter the last 4 digits of your registered phone number'),
});

const confirmResetSchema = z.object({
  resetToken: z.string().min(16, 'Invalid reset token'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '******';
  return `${'*'.repeat(Math.max(6, digits.length - 4))}${digits.slice(-4)}`;
}

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
    const rawUser = username.trim();
    const rawPass = password.trim();
    const cleanUser = rawUser.toLowerCase();
    const escapedRegex = rawUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (isMongoReady()) {
      let user = await User.findOne({
        $or: [
          { username: cleanUser },
          { email: cleanUser },
          { referenceId: cleanUser },
          { referenceId: rawUser },
        ],
      });

      // Dynamic student auto-provisioning if Student record exists without a User account
      if (!user) {
        const matchedStudent = await Student.findOne({
          $or: [
            { admissionNumber: new RegExp(`^${escapedRegex}$`, 'i') },
            { id: rawUser },
          ],
        }).lean();

        if (matchedStudent) {
          const cls = await ClassBatch.findOne({ id: matchedStudent.classId }).select('name').lean();
          const provisioned = await ensureStudentUserAccount(matchedStudent as any, cls?.name);
          user = await User.findOne({ username: provisioned.username });
        }
      }

      // Check Parent Default Login: Student Name + Registered Mobile Number
      if (!user) {
        const allStudents = await Student.find().lean();
        const normInputName = normalizePersonName(rawUser);
        const normInputPassName = normalizePersonName(rawPass);
        const matchedParentStudent =
          allStudents.find(
            (s: any) =>
              normalizePersonName(s.fullName) === normInputName &&
              phonesMatch(s.parentPhone, rawPass)
          ) ||
          allStudents.find(
            (s: any) =>
              phonesMatch(s.parentPhone, rawUser) &&
              normalizePersonName(s.fullName) === normInputPassName
          );

        if (matchedParentStudent) {
          const ensuredParent = await ensureParentUserAccountForStudent(matchedParentStudent as any);
          if (ensuredParent) {
            const parentDoc = await User.findOne({ id: ensuredParent.userId });
            if (parentDoc) {
              const isSeededDefaultParent =
                parentDoc.id === 'usr_parent_01' && (await parentDoc.comparePassword('password123'));
              if (parentDoc.mustChangePassword === false && !isSeededDefaultParent) {
                return res.status(401).json({
                  success: false,
                  error: 'Your parent password has been updated. Please sign in with your custom password.',
                });
              }

              if (!parentDoc.isActive) {
                return res.status(403).json({
                  success: false,
                  error: 'Account deactivated. Please contact campus administration.',
                });
              }

              parentDoc.lastLoginAt = new Date();
              await parentDoc.save();

              const token = generateToken({
                id: parentDoc.id,
                role: parentDoc.role,
                username: parentDoc.username,
                fullName: parentDoc.fullName,
                campusId: parentDoc.campusId,
                studentId: parentDoc.studentId,
                assignedClassIds: parentDoc.assignedClassIds || [],
              });
              await logAuditEvent('USER_LOGIN', parentDoc, 'User', parentDoc.id, { via: 'parent_default_mobile' }, req.ip);

              return res.json({
                success: true,
                token,
                user: {
                  id: parentDoc.id,
                  role: parentDoc.role,
                  fullName: parentDoc.fullName,
                  arabicName: parentDoc.arabicName,
                  username: parentDoc.username,
                  email: parentDoc.email,
                  phone: parentDoc.phone,
                  avatar: parentDoc.avatar,
                  title: parentDoc.title,
                  referenceId: parentDoc.referenceId,
                  campusId: parentDoc.campusId,
                  studentId: parentDoc.studentId,
                  linkedStudentIds: parentDoc.linkedStudentIds,
                  assignedClassIds: parentDoc.assignedClassIds || [],
                  mustChangePassword: Boolean(parentDoc.mustChangePassword),
                },
              });
            }
          }
        }
      }

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

      let isMatch = await user.comparePassword(rawPass);

      // For student accounts still on default password, accept any canonical DOB or <AdmNo>@<DOB> format
      if (!isMatch && user.role === 'STUDENT' && user.mustChangePassword) {
        const stu = await Student.findOne({
          $or: [
            ...(user.studentId ? [{ id: user.studentId }] : []),
            { admissionNumber: user.referenceId || user.username },
          ],
        }).lean();
        if (stu) {
          const variants = getStudentDobPasswordVariants(stu.admissionNumber, stu.dateOfBirth);
          isMatch = variants.includes(rawPass);
        }
      }

      // For parent accounts still on default password, accept normalized registered mobile digits
      if (!isMatch && user.role === 'PARENT' && user.mustChangePassword && phonesMatch(user.phone, rawPass)) {
        isMatch = true;
      }

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials. Password incorrect.',
        });
      }

      user.lastLoginAt = new Date();
      await user.save();

      const effectiveClassIds = await resolveEffectiveAssignedClassIds(user);
      const token = generateToken({
        id: user.id,
        role: user.role,
        username: user.username,
        fullName: user.fullName,
        campusId: user.campusId,
        studentId: user.studentId,
        assignedClassIds: effectiveClassIds,
      });
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
          campusId: user.campusId,
          studentId: user.studentId,
          linkedStudentIds: user.linkedStudentIds,
          assignedClassIds: effectiveClassIds,
          mustChangePassword: Boolean(user.mustChangePassword),
        },
      });
    }

    // Runtime store mode
    const db = getRuntimeDb();
    let rtUser = db.users.find(
      (u) =>
        u.username.toLowerCase() === cleanUser ||
        u.email.toLowerCase() === cleanUser ||
        (u.referenceId && u.referenceId.toLowerCase() === cleanUser)
    );

    if (!rtUser) {
      const matchedStudent = db.students.find(
        (s) =>
          (s.admissionNumber || '').trim().toLowerCase() === cleanUser ||
          s.id === rawUser
      );
      if (matchedStudent) {
        const cls = db.classes.find((c) => c.id === matchedStudent.classId);
        const provisioned = await ensureStudentUserAccount(matchedStudent, cls?.name);
        saveRuntimeDb(db);
        rtUser = db.users.find((u) => u.username.toLowerCase() === provisioned.username.toLowerCase());
      }
    }

    if (!rtUser) {
      const normInputName = normalizePersonName(rawUser);
      const normInputPassName = normalizePersonName(rawPass);
      const matchedParentStudent =
        db.students.find(
          (s) =>
            normalizePersonName(s.fullName) === normInputName &&
            phonesMatch(s.parentPhone, rawPass)
        ) ||
        db.students.find(
          (s) =>
            phonesMatch(s.parentPhone, rawUser) &&
            normalizePersonName(s.fullName) === normInputPassName
        );

      if (matchedParentStudent) {
        const ensuredParent = await ensureParentUserAccountForStudent(matchedParentStudent);
        if (ensuredParent) {
          saveRuntimeDb(db);
          const parentDoc = db.users.find((u) => u.id === ensuredParent.userId);
          if (parentDoc) {
            const isSeededDefaultParent =
              parentDoc.id === 'usr_parent_01' && bcrypt.compareSync('password123', parentDoc.passwordHash);
            if (parentDoc.mustChangePassword === false && !isSeededDefaultParent) {
              return res.status(401).json({
                success: false,
                error: 'Your parent password has been updated. Please sign in with your custom password.',
              });
            }
            if (!parentDoc.isActive) {
              return res.status(403).json({
                success: false,
                error: 'Account deactivated. Please contact administration.',
              });
            }
            parentDoc.lastLoginAt = new Date().toISOString();
            saveRuntimeDb(db);
            const token = generateToken({
              id: parentDoc.id,
              role: parentDoc.role,
              username: parentDoc.username,
              fullName: parentDoc.fullName,
              campusId: parentDoc.campusId,
              studentId: parentDoc.studentId,
              assignedClassIds: parentDoc.assignedClassIds || [],
            });
            return res.json({
              success: true,
              token,
              user: sanitizeRuntimeUser(parentDoc),
            });
          }
        }
      }
    }

    if (!rtUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found.',
      });
    }

    if (!rtUser.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account deactivated. Please contact administration.',
      });
    }

    let isMatch = await bcrypt.compare(rawPass, rtUser.passwordHash);
    if (!isMatch && rtUser.role === 'STUDENT' && rtUser.mustChangePassword) {
      const stu = db.students.find(
        (s) =>
          (rtUser!.studentId && s.id === rtUser!.studentId) ||
          (s.admissionNumber || '').toLowerCase() === (rtUser!.referenceId || rtUser!.username).toLowerCase()
      );
      if (stu) {
        const variants = getStudentDobPasswordVariants(stu.admissionNumber, stu.dateOfBirth);
        isMatch = variants.includes(rawPass);
      }
    }

    if (!isMatch && rtUser.role === 'PARENT' && rtUser.mustChangePassword && phonesMatch(rtUser.phone, rawPass)) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Password incorrect.',
      });
    }

    rtUser.lastLoginAt = new Date().toISOString();
    saveRuntimeDb(db);

    const effectiveClassIds = await resolveEffectiveAssignedClassIds(rtUser);
    const token = generateToken({
      id: rtUser.id,
      role: rtUser.role,
      username: rtUser.username,
      fullName: rtUser.fullName,
      campusId: rtUser.campusId,
      studentId: rtUser.studentId,
      assignedClassIds: effectiveClassIds,
    });

    return res.json({
      success: true,
      token,
      user: {
        ...sanitizeRuntimeUser(rtUser),
        assignedClassIds: effectiveClassIds,
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
  const effectiveClassIds = await resolveEffectiveAssignedClassIds(u);
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
      campusId: u.campusId,
      studentId: u.studentId,
      linkedStudentIds: u.linkedStudentIds,
      assignedClassIds: effectiveClassIds,
      mustChangePassword: Boolean(u.mustChangePassword),
    },
  });
});

// POST /api/auth/switch-user - Strictly disabled to enforce strict platform isolation
router.post('/switch-user', (_req: Request, res: Response) => {
  return res.status(403).json({
    success: false,
    error: 'Cross-role profile switching is disabled. Please sign in with dedicated credentials.',
  });
});

// POST /api/auth/change-password - Authenticated password change (Mudeer & staff)
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parse = changePasswordSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid password payload.',
      });
    }

    const { currentPassword, newPassword } = parse.data;
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from your current password.',
      });
    }

    const reqUser = req.user!;

    if (isMongoReady()) {
      const userDoc = await User.findOne({ id: reqUser.id });
      if (!userDoc) {
        return res.status(404).json({ success: false, error: 'User account not found.' });
      }
      let isValid = await userDoc.comparePassword(currentPassword);
      if (!isValid && userDoc.role === 'STUDENT' && userDoc.mustChangePassword) {
        const stu = await Student.findOne({
          $or: [
            ...(userDoc.studentId ? [{ id: userDoc.studentId }] : []),
            { admissionNumber: userDoc.referenceId || userDoc.username },
          ],
        }).lean();
        if (stu) {
          isValid = getStudentDobPasswordVariants(stu.admissionNumber, stu.dateOfBirth).includes(currentPassword.trim());
        }
      }
      if (!isValid && userDoc.role === 'PARENT' && userDoc.mustChangePassword && phonesMatch(userDoc.phone, currentPassword)) {
        isValid = true;
      }
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect.',
        });
      }
      userDoc.password = newPassword;
      userDoc.mustChangePassword = false;
      await userDoc.save();
      await logAuditEvent('PASSWORD_CHANGED', reqUser, 'User', userDoc.id, { role: userDoc.role }, req.ip);
      return res.json({
        success: true,
        message: 'Your password has been updated securely.',
      });
    }

    const db = getRuntimeDb();
    const rtUser = db.users.find((u) => u.id === reqUser.id);
    if (!rtUser) {
      return res.status(404).json({ success: false, error: 'User account not found.' });
    }

    let isValid = await bcrypt.compare(currentPassword, rtUser.passwordHash);
    if (!isValid && rtUser.role === 'STUDENT' && rtUser.mustChangePassword) {
      const stu = db.students.find(
        (s) =>
          (rtUser.studentId && s.id === rtUser.studentId) ||
          (s.admissionNumber || '').toLowerCase() === (rtUser.referenceId || rtUser.username).toLowerCase()
      );
      if (stu) {
        isValid = getStudentDobPasswordVariants(stu.admissionNumber, stu.dateOfBirth).includes(currentPassword.trim());
      }
    }
    if (!isValid && rtUser.role === 'PARENT' && rtUser.mustChangePassword && phonesMatch(rtUser.phone, currentPassword)) {
      isValid = true;
    }
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect.',
      });
    }

    rtUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    rtUser.mustChangePassword = false;
    rtUser.updatedAt = new Date().toISOString();
    saveRuntimeDb(db);

    return res.json({
      success: true,
      message: 'Your password has been updated securely.',
    });
  } catch (err: any) {
    console.error('[Auth] Change password error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
});

// POST /api/auth/forgot-password/request - Step 1: Request 6-digit OTP verification
router.post('/forgot-password/request', async (req: Request, res: Response) => {
  try {
    const parse = forgotRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Username or email is required.',
      });
    }

    const cleanIdentifier = parse.data.identifier.trim().toLowerCase();
    let foundUser: { id: string; role: string; fullName: string; email: string; phone: string; isActive: boolean } | null = null;

    if (isMongoReady()) {
      const u = await User.findOne({
        $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }, { referenceId: cleanIdentifier }],
      }).lean();
      if (u) {
        foundUser = {
          id: u.id,
          role: u.role,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone || '',
          isActive: u.isActive,
        };
      }
    } else {
      const db = getRuntimeDb();
      const u = db.users.find(
        (usr) =>
          usr.username.toLowerCase() === cleanIdentifier ||
          usr.email.toLowerCase() === cleanIdentifier ||
          (usr.referenceId && usr.referenceId.toLowerCase() === cleanIdentifier)
      );
      if (u) {
        foundUser = {
          id: u.id,
          role: u.role,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone || '',
          isActive: u.isActive,
        };
      }
    }

    if (!foundUser || !foundUser.isActive) {
      return res.status(404).json({
        success: false,
        error: 'No active account found matching that username or email.',
      });
    }

    if (foundUser.role === 'HYBA_SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'HYBA Super Admin root credentials cannot be reset through self-service recovery.',
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = sha256(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const tokenId = `rst_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (isMongoReady()) {
      // Invalidate previous pending tokens for user
      await PasswordResetToken.updateMany({ userId: foundUser.id, used: false }, { $set: { used: true } });
      await PasswordResetToken.create({
        id: tokenId,
        userId: foundUser.id,
        otpHash,
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        verified: false,
        used: false,
      });
    } else {
      const db = getRuntimeDb();
      db.resetTokens = db.resetTokens.map((t) => (t.userId === foundUser!.id && !t.used ? { ...t, used: true } : t));
      db.resetTokens.push({
        id: tokenId,
        userId: foundUser.id,
        otpHash,
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        maxAttempts: 5,
        verified: false,
        used: false,
        createdAt: new Date().toISOString(),
      });
      saveRuntimeDb(db);
    }

    return res.json({
      success: true,
      data: {
        maskedEmail: maskEmail(foundUser.email),
        maskedPhone: maskPhone(foundUser.phone),
        fullName: foundUser.fullName,
        role: foundUser.role,
        expiresInSeconds: 600,
        // Included for sandbox verification when no external SMTP/SMS gateway is configured
        previewOtp: otp,
      },
    });
  } catch (err: any) {
    console.error('[Auth] Forgot password request error:', err);
    return res.status(500).json({ success: false, error: 'Failed to initiate password reset.' });
  }
});

// POST /api/auth/forgot-password/verify-otp - Step 2: Verify 6-digit OTP + Phone last 4 digits
router.post('/forgot-password/verify-otp', async (req: Request, res: Response) => {
  try {
    const parse = verifyOtpSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid verification input.',
      });
    }

    const { identifier, otp, phoneLast4 } = parse.data;
    const cleanIdentifier = identifier.trim().toLowerCase();

    if (isMongoReady()) {
      const user = await User.findOne({
        $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }, { referenceId: cleanIdentifier }],
      }).lean();

      if (!user) {
        return res.status(404).json({ success: false, error: 'Account not found.' });
      }

      const tokenDoc = await PasswordResetToken.findOne({ userId: user.id, used: false }).sort({ createdAt: -1 });
      if (!tokenDoc) {
        return res.status(400).json({ success: false, error: 'No active reset request found. Please request a new code.' });
      }

      if (new Date(tokenDoc.expiresAt).getTime() < Date.now()) {
        tokenDoc.used = true;
        await tokenDoc.save();
        return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
      }

      if (tokenDoc.attempts >= tokenDoc.maxAttempts) {
        tokenDoc.used = true;
        await tokenDoc.save();
        return res.status(429).json({ success: false, error: 'Maximum verification attempts exceeded. Please request a new code.' });
      }

      const registeredDigits = (user.phone || '').replace(/\D/g, '');
      const phoneMatches = registeredDigits.length < 4 || registeredDigits.slice(-4) === phoneLast4.trim();

      if (!phoneMatches || tokenDoc.otpHash !== sha256(otp.trim())) {
        tokenDoc.attempts += 1;
        await tokenDoc.save();
        const remaining = Math.max(0, tokenDoc.maxAttempts - tokenDoc.attempts);
        return res.status(401).json({
          success: false,
          error: !phoneMatches
            ? `Registered phone verification mismatch. ${remaining} attempt(s) remaining.`
            : `Invalid verification code. ${remaining} attempt(s) remaining.`,
        });
      }

      const resetToken = crypto.randomBytes(24).toString('hex');
      tokenDoc.verified = true;
      tokenDoc.resetTokenHash = sha256(resetToken);
      tokenDoc.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await tokenDoc.save();

      return res.json({
        success: true,
        data: { resetToken, expiresInSeconds: 300 },
      });
    }

    // Runtime store mode
    const db = getRuntimeDb();
    const user = db.users.find(
      (u) =>
        u.username.toLowerCase() === cleanIdentifier ||
        u.email.toLowerCase() === cleanIdentifier ||
        (u.referenceId && u.referenceId.toLowerCase() === cleanIdentifier)
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    const tokenIdx = [...db.resetTokens]
      .reverse()
      .findIndex((t) => t.userId === user.id && !t.used);

    if (tokenIdx === -1) {
      return res.status(400).json({ success: false, error: 'No active reset request found. Please request a new code.' });
    }

    const actualIdx = db.resetTokens.length - 1 - tokenIdx;
    const tokenDoc = db.resetTokens[actualIdx];

    if (new Date(tokenDoc.expiresAt).getTime() < Date.now()) {
      tokenDoc.used = true;
      saveRuntimeDb(db);
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
    }

    if (tokenDoc.attempts >= tokenDoc.maxAttempts) {
      tokenDoc.used = true;
      saveRuntimeDb(db);
      return res.status(429).json({ success: false, error: 'Maximum verification attempts exceeded. Please request a new code.' });
    }

    const registeredDigits = (user.phone || '').replace(/\D/g, '');
    const phoneMatches = registeredDigits.length < 4 || registeredDigits.slice(-4) === phoneLast4.trim();

    if (!phoneMatches || tokenDoc.otpHash !== sha256(otp.trim())) {
      tokenDoc.attempts += 1;
      saveRuntimeDb(db);
      const remaining = Math.max(0, tokenDoc.maxAttempts - tokenDoc.attempts);
      return res.status(401).json({
        success: false,
        error: !phoneMatches
          ? `Registered phone verification mismatch. ${remaining} attempt(s) remaining.`
          : `Invalid verification code. ${remaining} attempt(s) remaining.`,
      });
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    tokenDoc.verified = true;
    tokenDoc.resetTokenHash = sha256(resetToken);
    tokenDoc.expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    saveRuntimeDb(db);

    return res.json({
      success: true,
      data: { resetToken, expiresInSeconds: 300 },
    });
  } catch (err: any) {
    console.error('[Auth] Verify OTP error:', err);
    return res.status(500).json({ success: false, error: 'Verification failed.' });
  }
});

// POST /api/auth/forgot-password/confirm - Step 3: Set new password using verified single-use token
router.post('/forgot-password/confirm', async (req: Request, res: Response) => {
  try {
    const parse = confirmResetSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid password reset request.',
      });
    }

    const { resetToken, newPassword } = parse.data;
    const tokenHash = sha256(resetToken.trim());

    if (isMongoReady()) {
      const tokenDoc = await PasswordResetToken.findOne({
        resetTokenHash: tokenHash,
        verified: true,
        used: false,
      });

      if (!tokenDoc || new Date(tokenDoc.expiresAt).getTime() < Date.now()) {
        return res.status(400).json({
          success: false,
          error: 'Reset session expired or invalid. Please restart the password recovery flow.',
        });
      }

      const userDoc = await User.findOne({ id: tokenDoc.userId });
      if (!userDoc) {
        return res.status(404).json({ success: false, error: 'User account no longer exists.' });
      }

      userDoc.password = newPassword;
      await userDoc.save();

      tokenDoc.used = true;
      await tokenDoc.save();

      await logAuditEvent('PASSWORD_RESET_COMPLETED', undefined, 'User', userDoc.id, { role: userDoc.role }, req.ip);

      return res.json({
        success: true,
        message: 'Password reset completed securely. You can now sign in with your new password.',
      });
    }

    // Runtime store mode
    const db = getRuntimeDb();
    const tokenDoc = db.resetTokens.find(
      (t) => t.resetTokenHash === tokenHash && t.verified && !t.used
    );

    if (!tokenDoc || new Date(tokenDoc.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'Reset session expired or invalid. Please restart the password recovery flow.',
      });
    }

    const rtUser = db.users.find((u) => u.id === tokenDoc.userId);
    if (!rtUser) {
      return res.status(404).json({ success: false, error: 'User account no longer exists.' });
    }

    rtUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    rtUser.updatedAt = new Date().toISOString();
    tokenDoc.used = true;
    saveRuntimeDb(db);

    return res.json({
      success: true,
      message: 'Password reset completed securely. You can now sign in with your new password.',
    });
  } catch (err: any) {
    console.error('[Auth] Confirm password reset error:', err);
    return res.status(500).json({ success: false, error: 'Failed to complete password reset.' });
  }
});

export default router;
