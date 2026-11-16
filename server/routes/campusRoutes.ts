import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Campus } from '../models/Campus';
import { Student } from '../models/Student';
import { Teacher } from '../models/Teacher';
import { ClassBatch } from '../models/ClassBatch';
import { User } from '../models/User';
import { authenticate, AuthRequest, authorize, logAuditEvent } from '../middleware/auth';
import {
  DEFAULT_CAMPUSES,
  isMongoReady,
  getRuntimeDb,
  saveRuntimeDb,
} from '../config/runtimeStore';

const router = Router();

const createCampusSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Campus Name is required'),
  code: z.string().min(2, 'Campus Code is required'),
  arabicName: z.string().optional(),
  address: z.string().min(2, 'Campus Address is required'),
  phone: z.string().min(5, 'Contact Phone is required'),
  email: z.string().email('Valid Campus Email is required'),
  logo: z.string().optional(),
  bannerUrl: z.string().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active'),
  establishedYear: z.string().default('2026'),
  // Mudeer selection & credential creation
  mudeerMode: z.enum(['new', 'existing']).default('new'),
  existingTeacherId: z.string().optional(),
  mudeerName: z.string().optional(),
  mudeerArabicName: z.string().optional(),
  mudeerEmail: z.string().optional(),
  mudeerPhone: z.string().optional(),
  mudeerUsername: z.string().min(3, 'Mudeer username must be at least 3 characters'),
  mudeerPassword: z.string().min(8, 'Mudeer password must be at least 8 characters'),
});

const assignMudeerSchema = z.object({
  mudeerMode: z.enum(['new', 'existing']).default('new'),
  existingTeacherId: z.string().optional(),
  mudeerName: z.string().optional(),
  mudeerArabicName: z.string().optional(),
  mudeerEmail: z.string().optional(),
  mudeerPhone: z.string().optional(),
  mudeerUsername: z.string().min(3, 'Mudeer username must be at least 3 characters'),
  mudeerPassword: z.string().optional(),
});

// GET /api/campuses - HYBA_SUPER_ADMIN sees all campuses; other roles see only their assigned campus
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const isSuperAdmin = user.role === 'HYBA_SUPER_ADMIN';

    if (isMongoReady()) {
      let campuses = await Campus.find().sort({ createdAt: 1 }).lean();
      if (campuses.length === 0) {
        await Campus.insertMany(DEFAULT_CAMPUSES);
        campuses = await Campus.find().sort({ createdAt: 1 }).lean();
      }

      const filtered = isSuperAdmin
        ? campuses
        : campuses.filter((c) => !user.campusId || c.id === user.campusId);

      const enhanced = await Promise.all(
        filtered.map(async (campus) => {
          const [studentCount, teacherCount, classCount] = await Promise.all([
            Student.countDocuments({ campusId: campus.id }),
            Teacher.countDocuments({ assignedCampusId: campus.id }),
            ClassBatch.countDocuments({ campusId: campus.id }),
          ]);

          return {
            ...campus,
            studentCount,
            teacherCount,
            classCount,
          };
        })
      );

      return res.json({ success: true, data: enhanced });
    }

    // Runtime store mode
    const db = getRuntimeDb();
    const filtered = isSuperAdmin
      ? db.campuses
      : db.campuses.filter((c) => !user.campusId || c.id === user.campusId);

    const enhanced = filtered.map((campus) => {
      const mudeerUser = db.users.find(
        (u) => u.role === 'MUDEER' && (u.campusId === campus.id || u.id === campus.mudeerUserId)
      );
      return {
        ...campus,
        principalName: mudeerUser?.fullName || campus.principalName,
        mudeerUserId: mudeerUser?.id || campus.mudeerUserId,
        mudeerUsername: mudeerUser?.username || campus.mudeerUsername,
        mudeerEmail: mudeerUser?.email || campus.mudeerEmail,
        mudeerPhone: mudeerUser?.phone || campus.mudeerPhone,
        studentCount: db.students.filter((s) => s.campusId === campus.id).length,
        teacherCount: db.teachers.filter((t) => t.assignedCampusId === campus.id).length,
        classCount: db.classes.filter((c) => c.campusId === campus.id).length,
      };
    });

    return res.json({ success: true, data: enhanced });
  } catch (err: any) {
    console.error('[Campuses] Error fetching campuses:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve campuses.' });
  }
});

// GET /api/campuses/:id/details - HYBA_SUPER_ADMIN or assigned MUDEER only
router.get('/:id/details', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    if (user.role !== 'HYBA_SUPER_ADMIN' && (user.role !== 'MUDEER' || user.campusId !== id)) {
      return res.status(403).json({
        success: false,
        error: 'Access forbidden: You may only inspect your assigned campus.',
      });
    }

    if (isMongoReady()) {
      const campus = await Campus.findOne({ id }).lean();
      if (!campus) {
        return res.status(404).json({ success: false, error: 'Campus not found' });
      }

      const [students, teachers, classes] = await Promise.all([
        Student.find({ campusId: id }).sort({ rollNumber: 1 }).lean(),
        Teacher.find({ assignedCampusId: id }).sort({ fullName: 1 }).lean(),
        ClassBatch.find({ campusId: id }).lean(),
      ]);

      return res.json({
        success: true,
        data: { campus, students, teachers, classes },
      });
    }

    const db = getRuntimeDb();
    const campus = db.campuses.find((c) => c.id === id);
    if (!campus) {
      return res.status(404).json({ success: false, error: 'Campus not found' });
    }

    const students = db.students.filter((s) => s.campusId === id);
    const teachers = db.teachers.filter((t) => t.assignedCampusId === id);
    const classes = db.classes.filter((c) => c.campusId === id);

    return res.json({
      success: true,
      data: { campus, students, teachers, classes },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve campus roster' });
  }
});

// POST /api/campuses - HYBA_SUPER_ADMIN ONLY: Create Campus + Assign Mudeer & Credentials
router.post('/', authenticate, authorize('HYBA_SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parse = createCampusSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid campus payload',
      });
    }

    const data = parse.data;
    const cleanCode = data.code.toUpperCase().trim();
    const cleanUsername = data.mudeerUsername.toLowerCase().trim();
    const campusId = data.id || `campus-${Date.now().toString(36)}`;

    if (data.mudeerMode === 'existing' && !data.existingTeacherId) {
      return res.status(400).json({
        success: false,
        error: 'Please select a teacher/Usthad to assign as Campus Mudeer.',
      });
    }

    if (data.mudeerMode === 'new' && (!data.mudeerName || data.mudeerName.trim().length < 2)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter the Mudeer full name.',
      });
    }

    if (isMongoReady()) {
      const existingCampus = await Campus.findOne({ code: cleanCode });
      if (existingCampus) {
        return res.status(409).json({
          success: false,
          error: `A campus with code '${cleanCode}' already exists.`,
        });
      }

      let targetTeacher: any = null;
      if (data.mudeerMode === 'existing') {
        targetTeacher = await Teacher.findOne({ id: data.existingTeacherId }).lean();
        if (!targetTeacher) {
          return res.status(404).json({ success: false, error: 'Selected teacher profile not found.' });
        }
      }

      const mudeerFullName =
        data.mudeerMode === 'existing' ? targetTeacher.fullName : data.mudeerName!.trim();
      const mudeerArabicName =
        data.mudeerMode === 'existing' ? targetTeacher.arabicTitle : data.mudeerArabicName?.trim() || '';
      const mudeerEmail = (
        data.mudeerEmail?.trim() ||
        (data.mudeerMode === 'existing' ? targetTeacher.email : '') ||
        `${cleanUsername}@markazulhidaya.edu.in`
      ).toLowerCase();
      const mudeerPhone =
        data.mudeerPhone?.trim() ||
        (data.mudeerMode === 'existing' ? targetTeacher.phone : '') ||
        data.phone;

      // Ensure username is not taken by another user
      const excludeId = data.mudeerMode === 'existing' ? targetTeacher.id : '__none__';
      const usernameTaken = await User.findOne({ username: cleanUsername, id: { $ne: excludeId } });
      if (usernameTaken) {
        return res.status(409).json({
          success: false,
          error: `Username '${cleanUsername}' is already in use. Please choose another Mudeer username.`,
        });
      }

      const emailTaken = await User.findOne({ email: mudeerEmail, id: { $ne: excludeId } });
      if (emailTaken) {
        return res.status(409).json({
          success: false,
          error: `Email '${mudeerEmail}' is already linked to another user account.`,
        });
      }

      let mudeerUserId = '';
      if (data.mudeerMode === 'existing') {
        const existingUser = await User.findOne({ id: targetTeacher.id });
        if (existingUser) {
          existingUser.role = 'MUDEER';
          existingUser.username = cleanUsername;
          existingUser.password = data.mudeerPassword;
          existingUser.campusId = campusId;
          existingUser.title = `Campus Mudeer · ${data.name.trim()}`;
          existingUser.isActive = true;
          await existingUser.save();
          mudeerUserId = existingUser.id;
        } else {
          mudeerUserId = `usr_mudeer_${Date.now().toString(36)}`;
          await User.create({
            id: mudeerUserId,
            role: 'MUDEER',
            fullName: mudeerFullName,
            arabicName: mudeerArabicName,
            username: cleanUsername,
            email: mudeerEmail,
            password: data.mudeerPassword,
            phone: mudeerPhone,
            avatar: targetTeacher.photo || '/assets/images/avatar_mudir_male_1794118044233.jpg',
            title: `Campus Mudeer · ${data.name.trim()}`,
            referenceId: targetTeacher.teacherId || `MUD-${cleanCode}`,
            campusId,
            isActive: true,
          });
        }
        await Teacher.updateOne({ id: targetTeacher.id }, { $set: { assignedCampusId: campusId } });
      } else {
        mudeerUserId = `usr_mudeer_${Date.now().toString(36)}`;
        await User.create({
          id: mudeerUserId,
          role: 'MUDEER',
          fullName: mudeerFullName,
          arabicName: mudeerArabicName,
          username: cleanUsername,
          email: mudeerEmail,
          password: data.mudeerPassword,
          phone: mudeerPhone,
          avatar: '/assets/images/avatar_mudir_male_1794118044233.jpg',
          title: `Campus Mudeer · ${data.name.trim()}`,
          referenceId: `MUD-${cleanCode}`,
          campusId,
          isActive: true,
        });
      }

      const newCampus = await Campus.create({
        id: campusId,
        name: data.name.trim(),
        code: cleanCode,
        arabicName: data.arabicName?.trim() || '',
        address: data.address.trim(),
        phone: data.phone.trim(),
        email: data.email.toLowerCase().trim(),
        logo: data.logo || '/assets/aistudio/__Hidaya_Updates_01__20261021_215417_1e0cd263.jpg',
        bannerUrl: data.bannerUrl || '/assets/images/campus_architecture_bg_1794109156055.jpg',
        status: data.status,
        establishedYear: data.establishedYear,
        principalName: mudeerFullName,
        mudeerUserId,
        mudeerUsername: cleanUsername,
        mudeerEmail,
        mudeerPhone,
      });

      await logAuditEvent('CAMPUS_CREATE', req.user, 'Campus', campusId, {
        name: newCampus.name,
        code: newCampus.code,
        mudeerUsername: cleanUsername,
      });

      return res.status(201).json({
        success: true,
        data: {
          ...newCampus.toObject(),
          studentCount: 0,
          teacherCount: data.mudeerMode === 'existing' ? 1 : 0,
          classCount: 0,
        },
        mudeer: {
          id: mudeerUserId,
          fullName: mudeerFullName,
          username: cleanUsername,
          email: mudeerEmail,
          phone: mudeerPhone,
          role: 'MUDEER',
          campusId,
        },
      });
    }

    // Runtime store mode
    const db = getRuntimeDb();
    const existingCampus = db.campuses.find((c) => c.code.toUpperCase() === cleanCode);
    if (existingCampus) {
      return res.status(409).json({
        success: false,
        error: `A campus with code '${cleanCode}' already exists.`,
      });
    }

    let targetTeacher: any = null;
    if (data.mudeerMode === 'existing') {
      targetTeacher = db.teachers.find((t) => t.id === data.existingTeacherId);
      if (!targetTeacher) {
        return res.status(404).json({ success: false, error: 'Selected teacher profile not found.' });
      }
    }

    const mudeerFullName =
      data.mudeerMode === 'existing' ? targetTeacher.fullName : data.mudeerName!.trim();
    const mudeerArabicName =
      data.mudeerMode === 'existing' ? targetTeacher.arabicTitle : data.mudeerArabicName?.trim() || '';
    const mudeerEmail = (
      data.mudeerEmail?.trim() ||
      (data.mudeerMode === 'existing' ? targetTeacher.email : '') ||
      `${cleanUsername}@markazulhidaya.edu.in`
    ).toLowerCase();
    const mudeerPhone =
      data.mudeerPhone?.trim() ||
      (data.mudeerMode === 'existing' ? targetTeacher.phone : '') ||
      data.phone;

    const excludeId = data.mudeerMode === 'existing' ? targetTeacher.id : '__none__';
    if (db.users.some((u) => u.username.toLowerCase() === cleanUsername && u.id !== excludeId)) {
      return res.status(409).json({
        success: false,
        error: `Username '${cleanUsername}' is already in use. Please choose another Mudeer username.`,
      });
    }
    if (db.users.some((u) => u.email.toLowerCase() === mudeerEmail && u.id !== excludeId)) {
      return res.status(409).json({
        success: false,
        error: `Email '${mudeerEmail}' is already linked to another user account.`,
      });
    }

    const passwordHash = bcrypt.hashSync(data.mudeerPassword, 10);
    let mudeerUserId = '';

    if (data.mudeerMode === 'existing') {
      const existingUser = db.users.find((u) => u.id === targetTeacher.id);
      if (existingUser) {
        existingUser.role = 'MUDEER';
        existingUser.username = cleanUsername;
        existingUser.passwordHash = passwordHash;
        existingUser.campusId = campusId;
        existingUser.title = `Campus Mudeer · ${data.name.trim()}`;
        existingUser.isActive = true;
        existingUser.updatedAt = new Date().toISOString();
        mudeerUserId = existingUser.id;
      } else {
        mudeerUserId = `usr_mudeer_${Date.now().toString(36)}`;
        db.users.push({
          id: mudeerUserId,
          role: 'MUDEER',
          fullName: mudeerFullName,
          arabicName: mudeerArabicName,
          username: cleanUsername,
          email: mudeerEmail,
          passwordHash,
          phone: mudeerPhone,
          avatar: targetTeacher.photo || '/assets/images/avatar_mudir_male_1794118044233.jpg',
          title: `Campus Mudeer · ${data.name.trim()}`,
          referenceId: targetTeacher.teacherId || `MUD-${cleanCode}`,
          campusId,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      targetTeacher.assignedCampusId = campusId;
    } else {
      mudeerUserId = `usr_mudeer_${Date.now().toString(36)}`;
      db.users.push({
        id: mudeerUserId,
        role: 'MUDEER',
        fullName: mudeerFullName,
        arabicName: mudeerArabicName,
        username: cleanUsername,
        email: mudeerEmail,
        passwordHash,
        phone: mudeerPhone,
        avatar: '/assets/images/avatar_mudir_male_1794118044233.jpg',
        title: `Campus Mudeer · ${data.name.trim()}`,
        referenceId: `MUD-${cleanCode}`,
        campusId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    const newCampus = {
      id: campusId,
      name: data.name.trim(),
      code: cleanCode,
      arabicName: data.arabicName?.trim() || '',
      address: data.address.trim(),
      phone: data.phone.trim(),
      email: data.email.toLowerCase().trim(),
      logo: data.logo || '/assets/aistudio/__Hidaya_Updates_01__20261021_215417_1e0cd263.jpg',
      bannerUrl: data.bannerUrl || '/assets/images/campus_architecture_bg_1794109156055.jpg',
      status: data.status,
      establishedYear: data.establishedYear,
      principalName: mudeerFullName,
      mudeerUserId,
      mudeerUsername: cleanUsername,
      mudeerEmail,
      mudeerPhone,
    };

    db.campuses.push(newCampus);
    saveRuntimeDb(db);

    return res.status(201).json({
      success: true,
      data: {
        ...newCampus,
        studentCount: 0,
        teacherCount: data.mudeerMode === 'existing' ? 1 : 0,
        classCount: 0,
      },
      mudeer: {
        id: mudeerUserId,
        fullName: mudeerFullName,
        username: cleanUsername,
        email: mudeerEmail,
        phone: mudeerPhone,
        role: 'MUDEER',
        campusId,
      },
    });
  } catch (err: any) {
    console.error('[Campuses] Error creating campus:', err);
    return res.status(500).json({ success: false, error: 'Failed to create campus' });
  }
});

// PUT /api/campuses/:id/mudeer - HYBA_SUPER_ADMIN ONLY: Select/Update Mudeer & credentials for a campus
router.put('/:id/mudeer', authenticate, authorize('HYBA_SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parse = assignMudeerSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.issues[0]?.message || 'Invalid Mudeer assignment payload',
      });
    }

    const data = parse.data;
    const cleanUsername = data.mudeerUsername.toLowerCase().trim();

    if (data.mudeerPassword && data.mudeerPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Mudeer password must be at least 8 characters when specified.',
      });
    }

    if (isMongoReady()) {
      const campus = await Campus.findOne({ id });
      if (!campus) {
        return res.status(404).json({ success: false, error: 'Campus not found' });
      }

      const currentMudeer = campus.mudeerUserId
        ? await User.findOne({ id: campus.mudeerUserId })
        : await User.findOne({ role: 'MUDEER', campusId: id });

      let mudeerFullName = data.mudeerName?.trim() || currentMudeer?.fullName || campus.principalName || '';
      let mudeerArabicName = data.mudeerArabicName?.trim() || currentMudeer?.arabicName || '';
      let mudeerEmail = (data.mudeerEmail?.trim() || currentMudeer?.email || `${cleanUsername}@markazulhidaya.edu.in`).toLowerCase();
      let mudeerPhone = data.mudeerPhone?.trim() || currentMudeer?.phone || campus.phone;
      let targetUserId = currentMudeer?.id || '';

      if (data.mudeerMode === 'existing' && data.existingTeacherId) {
        const teacher = await Teacher.findOne({ id: data.existingTeacherId }).lean();
        if (!teacher) {
          return res.status(404).json({ success: false, error: 'Selected teacher not found' });
        }
        mudeerFullName = teacher.fullName;
        mudeerArabicName = teacher.arabicTitle || '';
        mudeerEmail = (data.mudeerEmail?.trim() || teacher.email).toLowerCase();
        mudeerPhone = data.mudeerPhone?.trim() || teacher.phone;
        targetUserId = teacher.id;
      }

      if (!mudeerFullName) {
        return res.status(400).json({ success: false, error: 'Mudeer full name is required.' });
      }

      const usernameConflict = await User.findOne({
        username: cleanUsername,
        ...(targetUserId ? { id: { $ne: targetUserId } } : {}),
      });
      if (usernameConflict) {
        return res.status(409).json({
          success: false,
          error: `Username '${cleanUsername}' is already assigned to another account.`,
        });
      }

      let savedUser: any = null;
      if (targetUserId) {
        savedUser = await User.findOne({ id: targetUserId });
      }

      if (savedUser) {
        // If replacing previous Mudeer with a different existing user, deactivate/unassign previous Mudeer role link
        if (currentMudeer && currentMudeer.id !== savedUser.id) {
          currentMudeer.campusId = undefined;
          await currentMudeer.save();
        }
        savedUser.role = 'MUDEER';
        savedUser.fullName = mudeerFullName;
        savedUser.arabicName = mudeerArabicName;
        savedUser.username = cleanUsername;
        savedUser.email = mudeerEmail;
        savedUser.phone = mudeerPhone;
        savedUser.campusId = id;
        savedUser.title = `Campus Mudeer · ${campus.name}`;
        savedUser.isActive = true;
        if (data.mudeerPassword) {
          savedUser.password = data.mudeerPassword;
        }
        await savedUser.save();
      } else {
        if (!data.mudeerPassword) {
          return res.status(400).json({
            success: false,
            error: 'Please provide an initial password (min 8 characters) for the new Mudeer account.',
          });
        }
        const newMudeerId = `usr_mudeer_${Date.now().toString(36)}`;
        if (currentMudeer) {
          currentMudeer.isActive = false;
          currentMudeer.campusId = undefined;
          await currentMudeer.save();
        }
        savedUser = await User.create({
          id: newMudeerId,
          role: 'MUDEER',
          fullName: mudeerFullName,
          arabicName: mudeerArabicName,
          username: cleanUsername,
          email: mudeerEmail,
          password: data.mudeerPassword,
          phone: mudeerPhone,
          avatar: '/assets/images/avatar_mudir_male_1794118044233.jpg',
          title: `Campus Mudeer · ${campus.name}`,
          referenceId: `MUD-${campus.code}`,
          campusId: id,
          isActive: true,
        });
      }

      campus.principalName = mudeerFullName;
      campus.mudeerUserId = savedUser.id;
      campus.mudeerUsername = cleanUsername;
      campus.mudeerEmail = mudeerEmail;
      campus.mudeerPhone = mudeerPhone;
      await campus.save();

      await logAuditEvent('CAMPUS_MUDEER_ASSIGNED', req.user, 'Campus', id, {
        mudeerUserId: savedUser.id,
        mudeerUsername: cleanUsername,
      });

      return res.json({
        success: true,
        data: campus,
        mudeer: {
          id: savedUser.id,
          fullName: savedUser.fullName,
          username: savedUser.username,
          email: savedUser.email,
          phone: savedUser.phone,
          campusId: id,
        },
      });
    }

    // Runtime store mode
    const db = getRuntimeDb();
    const campus = db.campuses.find((c) => c.id === id);
    if (!campus) {
      return res.status(404).json({ success: false, error: 'Campus not found' });
    }

    const currentMudeer = db.users.find(
      (u) => u.role === 'MUDEER' && (u.id === campus.mudeerUserId || u.campusId === id)
    );

    let mudeerFullName = data.mudeerName?.trim() || currentMudeer?.fullName || campus.principalName || '';
    let mudeerArabicName = data.mudeerArabicName?.trim() || currentMudeer?.arabicName || '';
    let mudeerEmail = (data.mudeerEmail?.trim() || currentMudeer?.email || `${cleanUsername}@markazulhidaya.edu.in`).toLowerCase();
    let mudeerPhone = data.mudeerPhone?.trim() || currentMudeer?.phone || campus.phone;
    let targetUser = currentMudeer || null;

    if (data.mudeerMode === 'existing' && data.existingTeacherId) {
      const teacher = db.teachers.find((t) => t.id === data.existingTeacherId);
      if (!teacher) {
        return res.status(404).json({ success: false, error: 'Selected teacher not found' });
      }
      mudeerFullName = teacher.fullName;
      mudeerArabicName = teacher.arabicTitle || '';
      mudeerEmail = (data.mudeerEmail?.trim() || teacher.email).toLowerCase();
      mudeerPhone = data.mudeerPhone?.trim() || teacher.phone;
      targetUser = db.users.find((u) => u.id === teacher.id) || null;
      teacher.assignedCampusId = id;
    }

    if (!mudeerFullName) {
      return res.status(400).json({ success: false, error: 'Mudeer full name is required.' });
    }

    if (db.users.some((u) => u.username.toLowerCase() === cleanUsername && u.id !== targetUser?.id)) {
      return res.status(409).json({
        success: false,
        error: `Username '${cleanUsername}' is already assigned to another account.`,
      });
    }

    if (targetUser) {
      if (currentMudeer && currentMudeer.id !== targetUser.id) {
        currentMudeer.campusId = undefined;
      }
      targetUser.role = 'MUDEER';
      targetUser.fullName = mudeerFullName;
      targetUser.arabicName = mudeerArabicName;
      targetUser.username = cleanUsername;
      targetUser.email = mudeerEmail;
      targetUser.phone = mudeerPhone;
      targetUser.campusId = id;
      targetUser.title = `Campus Mudeer · ${campus.name}`;
      targetUser.isActive = true;
      targetUser.updatedAt = new Date().toISOString();
      if (data.mudeerPassword) {
        targetUser.passwordHash = bcrypt.hashSync(data.mudeerPassword, 10);
      }
    } else {
      if (!data.mudeerPassword) {
        return res.status(400).json({
          success: false,
          error: 'Please provide an initial password (min 8 characters) for the new Mudeer account.',
        });
      }
      if (currentMudeer) {
        currentMudeer.isActive = false;
        currentMudeer.campusId = undefined;
      }
      const newMudeerId = `usr_mudeer_${Date.now().toString(36)}`;
      targetUser = {
        id: newMudeerId,
        role: 'MUDEER',
        fullName: mudeerFullName,
        arabicName: mudeerArabicName,
        username: cleanUsername,
        email: mudeerEmail,
        passwordHash: bcrypt.hashSync(data.mudeerPassword, 10),
        phone: mudeerPhone,
        avatar: '/assets/images/avatar_mudir_male_1794118044233.jpg',
        title: `Campus Mudeer · ${campus.name}`,
        referenceId: `MUD-${campus.code}`,
        campusId: id,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.users.push(targetUser);
    }

    campus.principalName = mudeerFullName;
    campus.mudeerUserId = targetUser.id;
    campus.mudeerUsername = cleanUsername;
    campus.mudeerEmail = mudeerEmail;
    campus.mudeerPhone = mudeerPhone;
    saveRuntimeDb(db);

    return res.json({
      success: true,
      data: campus,
      mudeer: {
        id: targetUser.id,
        fullName: targetUser.fullName,
        username: targetUser.username,
        email: targetUser.email,
        phone: targetUser.phone,
        campusId: id,
      },
    });
  } catch (err: any) {
    console.error('[Campuses] Mudeer assignment error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update Campus Mudeer.' });
  }
});

// PUT /api/campuses/:id - HYBA_SUPER_ADMIN ONLY edits campus info or status
router.put('/:id', authenticate, authorize('HYBA_SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isMongoReady()) {
      const existing = await Campus.findOne({ id });
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Campus not found' });
      }
      const updated = await Campus.findOneAndUpdate({ id }, { $set: req.body }, { new: true });
      await logAuditEvent('CAMPUS_UPDATE', req.user, 'Campus', id, req.body);
      return res.json({ success: true, data: updated });
    }

    const db = getRuntimeDb();
    const idx = db.campuses.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Campus not found' });
    }
    db.campuses[idx] = { ...db.campuses[idx], ...req.body };
    saveRuntimeDb(db);

    return res.json({ success: true, data: db.campuses[idx] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update campus' });
  }
});

// DELETE /api/campuses/:id - HYBA_SUPER_ADMIN ONLY deletes an empty campus
router.delete('/:id', authenticate, authorize('HYBA_SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (isMongoReady()) {
      const [studentCount, classCount] = await Promise.all([
        Student.countDocuments({ campusId: id }),
        ClassBatch.countDocuments({ campusId: id }),
      ]);

      if (studentCount > 0 || classCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete campus: It currently contains ${studentCount} students and ${classCount} classes. Reassign them first.`,
        });
      }

      await Campus.deleteOne({ id });
      await User.updateMany({ campusId: id, role: 'MUDEER' }, { $set: { isActive: false }, $unset: { campusId: '' } });
      await logAuditEvent('CAMPUS_DELETE', req.user, 'Campus', id);
      return res.json({ success: true, message: 'Campus deleted successfully' });
    }

    const db = getRuntimeDb();
    const studentCount = db.students.filter((s) => s.campusId === id).length;
    const classCount = db.classes.filter((c) => c.campusId === id).length;

    if (studentCount > 0 || classCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete campus: It currently contains ${studentCount} students and ${classCount} classes. Reassign them first.`,
      });
    }

    db.campuses = db.campuses.filter((c) => c.id !== id);
    db.users = db.users.map((u) =>
      u.campusId === id && u.role === 'MUDEER' ? { ...u, isActive: false, campusId: undefined } : u
    );
    saveRuntimeDb(db);

    return res.json({ success: true, message: 'Campus deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete campus' });
  }
});

export default router;
