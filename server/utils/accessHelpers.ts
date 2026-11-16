import bcrypt from 'bcryptjs';
import { ClassBatch } from '../models/ClassBatch';
import { Teacher } from '../models/Teacher';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { isMongoReady, getRuntimeDb, saveRuntimeDb } from '../config/runtimeStore';

/**
 * Resolves all class IDs effectively assigned to an Usthad/Mudeer user
 * by combining ClassBatch.usthadId, Teacher.assignedClassIds, and User.assignedClassIds.
 */
export async function resolveEffectiveAssignedClassIds(user: {
  id: string;
  role: string;
  referenceId?: string;
  campusId?: string;
  assignedClassIds?: string[];
}): Promise<string[]> {
  if (user.role !== 'USTHAD' && user.role !== 'MUDEER') {
    return user.assignedClassIds || [];
  }

  const classIdSet = new Set<string>(user.assignedClassIds || []);

  if (!isMongoReady()) {
    const db = getRuntimeDb();
    for (const cls of db.classes) {
      if (
        cls.usthadId === user.id ||
        (user.referenceId && cls.usthadId === user.referenceId)
      ) {
        classIdSet.add(cls.id);
      }
    }
    const teacher = db.teachers.find(
      (t) => t.id === user.id || (user.referenceId && t.teacherId === user.referenceId)
    );
    if (teacher && Array.isArray(teacher.assignedClassIds)) {
      teacher.assignedClassIds.forEach((cid: string) => classIdSet.add(cid));
    }
    return Array.from(classIdSet);
  }

  const orMentor: any[] = [{ usthadId: user.id }];
  if (user.referenceId) orMentor.push({ usthadId: user.referenceId });

  const [mentorClasses, teacherDoc] = await Promise.all([
    ClassBatch.find({ $or: orMentor }).select('id').lean(),
    Teacher.findOne({
      $or: [{ id: user.id }, ...(user.referenceId ? [{ teacherId: user.referenceId }] : [])],
    })
      .select('assignedClassIds')
      .lean(),
  ]);

  mentorClasses.forEach((c: any) => classIdSet.add(c.id));
  if (teacherDoc && Array.isArray(teacherDoc.assignedClassIds)) {
    teacherDoc.assignedClassIds.forEach((cid: string) => classIdSet.add(cid));
  }

  return Array.from(classIdSet);
}

/**
 * Normalizes a date string (supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY) to YYYY-MM-DD when possible.
 */
export function normalizeDobString(rawDob?: string): string {
  const clean = (rawDob || '').trim();
  if (!clean) return '2011-01-01';

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY (also handles spaces around hyphens)
  const dmyMatch = clean.match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return clean;
}

/**
 * Formats a normalized YYYY-MM-DD DOB as DD-MM-YYYY for display and default student login.
 */
export function formatDobAsDmy(rawDob?: string): string {
  const iso = normalizeDobString(rawDob);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Generates all accepted default password variants for a student using Date of Birth & Admission Number
 * (active only while the student is still on their default password).
 */
export function getStudentDobPasswordVariants(admissionNumber: string, rawDob?: string): string[] {
  const adm = String(admissionNumber || '').trim();
  const iso = normalizeDobString(rawDob);
  const variants = new Set<string>();

  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const [, y, mo, d] = m;
    const dmyDash = `${d}-${mo}-${y}`;
    const dmySlash = `${d}/${mo}/${y}`;
    const isoSlash = `${y}/${mo}/${d}`;
    const dmyCompact = `${d}${mo}${y}`;
    const ymdCompact = `${y}${mo}${d}`;

    variants.add(dmyDash);
    variants.add(iso);
    variants.add(dmySlash);
    variants.add(isoSlash);
    variants.add(dmyCompact);
    variants.add(ymdCompact);

    if (adm) {
      variants.add(`${adm}@${iso}`);
      variants.add(`${adm}@${dmyDash}`);
      variants.add(`${adm.toLowerCase()}@${iso}`);
      variants.add(`${adm.toLowerCase()}@${dmyDash}`);
    }
  } else if (rawDob) {
    const clean = rawDob.trim();
    variants.add(clean);
    if (adm) {
      variants.add(`${adm}@${clean}`);
    }
  }

  return Array.from(variants);
}

/**
 * Generates default student login password from Date of Birth (DD-MM-YYYY, e.g. 14-02-2011).
 */
export function buildDefaultStudentPassword(_admissionNumber: string, dateOfBirth?: string): string {
  return formatDobAsDmy(dateOfBirth);
}

/**
 * Strips non-digits from a phone number for reliable comparison across +91/spaces/dashes.
 */
export function normalizePhoneDigits(rawPhone?: string): string {
  return String(rawPhone || '').replace(/\D/g, '');
}

/**
 * Checks whether two phone numbers match (full digits match or last 10 digits match).
 */
export function phonesMatch(a?: string, b?: string): boolean {
  const digitsA = normalizePhoneDigits(a);
  const digitsB = normalizePhoneDigits(b);
  if (digitsA.length < 7 || digitsB.length < 7) return false;
  if (digitsA === digitsB) return true;
  if (digitsA.length >= 10 && digitsB.length >= 10) {
    return digitsA.slice(-10) === digitsB.slice(-10);
  }
  return false;
}

/**
 * Normalizes a person's full name for flexible case/punctuation/whitespace matching.
 */
export function normalizePersonName(rawName?: string): string {
  return String(rawName || '')
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves a Batch/Class value (e.g. "A", "B", "Batch A", "batch-b", or full class name/id)
 * to the matching ClassBatch document within the target campus.
 */
export function resolveCampusBatchFromValue<
  T extends { id: string; name: string; campusId?: string; usthadId?: string }
>(campusId: string, rawValue: string | undefined, classes: T[]): T | undefined {
  const campusClasses = classes.filter((c) => !campusId || c.campusId === campusId);
  const pool = campusClasses.length > 0 ? campusClasses : classes;
  if (pool.length === 0) return undefined;

  const trimmed = (rawValue || '').trim();
  if (!trimmed) {
    return pool.find((c) => c.id === 'batch-a' || /\bbatch\s*a\b/i.test(c.name)) || pool[0];
  }

  const lower = trimmed.toLowerCase();

  // 1. Exact id match
  const byId = pool.find((c) => c.id.toLowerCase() === lower);
  if (byId) return byId;

  // 2. Exact name match
  const byName = pool.find((c) => c.name.toLowerCase() === lower);
  if (byName) return byName;

  // 3. Letter / batch shorthand match: "A", "B", "C", "Batch A", "Batch B", "batch_a", "batch-a"
  const shortMatch = lower.match(/^(?:hifz\s+|tahfeez\s+|sanad\s+)?(?:batch[\s_-]*)?([a-z0-9]{1,3})$/i);
  if (shortMatch) {
    const code = shortMatch[1].toLowerCase();
    const byShortId = pool.find(
      (c) => c.id.toLowerCase() === `batch-${code}` || c.id.toLowerCase().endsWith(`-${code}`)
    );
    if (byShortId) return byShortId;

    const batchRegex = new RegExp(`\\bbatch\\s*${code}\\b`, 'i');
    const byBatchName = pool.find((c) => batchRegex.test(c.name));
    if (byBatchName) return byBatchName;
  }

  // 4. Partial name match
  const partial = pool.find((c) => c.name.toLowerCase().includes(lower));
  if (partial) return partial;

  return undefined;
}

/**
 * Ensures a STUDENT User login account exists for an enrolled, CSV-imported, or seeded student.
 * Default password is generated from Date of Birth and flagged mustChangePassword = true.
 */
export async function ensureStudentUserAccount(
  student: {
    id: string;
    admissionNumber: string;
    fullName: string;
    arabicName?: string;
    dateOfBirth?: string;
    parentPhone?: string;
    photo?: string;
    campusId?: string;
    classId: string;
  },
  batchName?: string
): Promise<{ created: boolean; username: string; defaultPassword: string }> {
  const cleanAdm = student.admissionNumber.trim();
  const cleanUsername = cleanAdm.toLowerCase();
  const defaultPassword = buildDefaultStudentPassword(cleanAdm, student.dateOfBirth);
  const safeEmail = `${cleanUsername.replace(/[^a-z0-9._-]/g, '') || student.id}.student@markazulhidaya.edu.in`;
  const userId = `usr_student_${student.id}`;
  const titleLabel = batchName ? `Student · ${batchName}` : `Student · ${student.classId}`;

  if (!isMongoReady()) {
    const db = getRuntimeDb();
    const existing = db.users.find(
      (u) =>
        u.studentId === student.id ||
        u.username.toLowerCase() === cleanUsername ||
        (u.referenceId && u.referenceId.toLowerCase() === cleanUsername)
    );
    if (existing) {
      return { created: false, username: existing.username, defaultPassword };
    }

    db.users.push({
      id: userId,
      role: 'STUDENT',
      fullName: student.fullName,
      arabicName: student.arabicName || student.fullName,
      username: cleanUsername,
      email: safeEmail,
      passwordHash: bcrypt.hashSync(defaultPassword, 10),
      phone: student.parentPhone || '',
      avatar: student.photo || '',
      title: titleLabel,
      referenceId: cleanAdm,
      campusId: student.campusId || 'campus-main',
      studentId: student.id,
      assignedClassIds: [student.classId],
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { created: true, username: cleanUsername, defaultPassword };
  }

  const existing = await User.findOne({
    $or: [
      { studentId: student.id },
      { username: cleanUsername },
      { referenceId: cleanAdm },
      { email: safeEmail },
    ],
  }).lean();

  if (existing) {
    return { created: false, username: existing.username, defaultPassword };
  }

  await User.create({
    id: userId,
    role: 'STUDENT',
    fullName: student.fullName,
    arabicName: student.arabicName || student.fullName,
    username: cleanUsername,
    email: safeEmail,
    password: defaultPassword,
    phone: student.parentPhone || '',
    avatar: student.photo || '',
    title: titleLabel,
    referenceId: cleanAdm,
    campusId: student.campusId || 'campus-main',
    studentId: student.id,
    assignedClassIds: [student.classId],
    mustChangePassword: true,
    isActive: true,
  });

  return { created: true, username: cleanUsername, defaultPassword };
}

/**
 * Finds or creates a PARENT User account linked to a student (and any siblings sharing parentPhone).
 * Default credentials for parents: Student Full Name + Registered Mobile Number.
 */
export async function ensureParentUserAccountForStudent(student: {
  id: string;
  admissionNumber: string;
  fullName: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  campusId?: string;
}): Promise<{ created: boolean; userId: string } | null> {
  const digits = normalizePhoneDigits(student.parentPhone);
  if (digits.length < 7) return null;
  const phoneKey = digits.length >= 10 ? digits.slice(-10) : digits;

  if (!isMongoReady()) {
    const db = getRuntimeDb();
    const siblingIds = db.students
      .filter((s) => phonesMatch(s.parentPhone, student.parentPhone))
      .map((s) => s.id);
    if (!siblingIds.includes(student.id)) siblingIds.push(student.id);

    const existing = db.users.find(
      (u) =>
        u.role === 'PARENT' &&
        (phonesMatch(u.phone, student.parentPhone) ||
          (Array.isArray(u.linkedStudentIds) && u.linkedStudentIds.includes(student.id)))
    );

    if (existing) {
      const merged = Array.from(new Set([...(existing.linkedStudentIds || []), ...siblingIds]));
      existing.linkedStudentIds = merged;
      if (!existing.phone && student.parentPhone) existing.phone = student.parentPhone;
      return { created: false, userId: existing.id };
    }

    const baseUsername = `parent.${phoneKey}`;
    const usernameCollision = db.users.some((u) => u.username.toLowerCase() === baseUsername);
    const username = usernameCollision ? `parent.${student.admissionNumber.toLowerCase()}` : baseUsername;
    const emailCandidate = `parent.${phoneKey}@markazulhidaya.edu.in`;
    const emailCollision = db.users.some((u) => u.email.toLowerCase() === emailCandidate);
    const email = emailCollision
      ? `parent.${student.id.toLowerCase().replace(/[^a-z0-9]/g, '')}@markazulhidaya.edu.in`
      : emailCandidate;

    const userId = `usr_parent_${phoneKey}_${Date.now().toString().slice(-4)}`;
    db.users.push({
      id: userId,
      role: 'PARENT',
      fullName: (student.parentName || '').trim() || `Parent of ${student.fullName}`,
      arabicName: `${student.parentName || 'ولي الأمر'}`,
      username,
      email,
      passwordHash: bcrypt.hashSync(phoneKey, 10),
      phone: student.parentPhone || phoneKey,
      avatar: '/assets/images/avatar_parent_male_1794118098652.jpg',
      title: `Parent / Guardian of ${student.fullName}`,
      referenceId: `PAR-${phoneKey}`,
      campusId: student.campusId || 'campus-main',
      linkedStudentIds: siblingIds,
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { created: true, userId };
  }

  const allStudents = await Student.find().select('id parentPhone').lean();
  const siblingIds = allStudents
    .filter((s: any) => phonesMatch(s.parentPhone, student.parentPhone))
    .map((s: any) => s.id);
  if (!siblingIds.includes(student.id)) siblingIds.push(student.id);

  const parentUsers = await User.find({ role: 'PARENT' });
  const existing = parentUsers.find(
    (u) =>
      phonesMatch(u.phone, student.parentPhone) ||
      (Array.isArray(u.linkedStudentIds) && u.linkedStudentIds.includes(student.id))
  );

  if (existing) {
    const merged = Array.from(new Set([...(existing.linkedStudentIds || []), ...siblingIds]));
    if (merged.length !== (existing.linkedStudentIds || []).length) {
      existing.linkedStudentIds = merged;
      await existing.save();
    }
    return { created: false, userId: existing.id };
  }

  const baseUsername = `parent.${phoneKey}`;
  const usernameTaken = await User.findOne({ username: baseUsername }).select('id').lean();
  const username = usernameTaken ? `parent.${student.admissionNumber.toLowerCase()}` : baseUsername;
  const emailCandidate = `parent.${phoneKey}@markazulhidaya.edu.in`;
  const emailTaken = await User.findOne({ email: emailCandidate }).select('id').lean();
  const email = emailTaken
    ? `parent.${student.id.toLowerCase().replace(/[^a-z0-9]/g, '')}@markazulhidaya.edu.in`
    : emailCandidate;

  const userId = `usr_parent_${phoneKey}_${Date.now().toString().slice(-4)}`;
  await User.create({
    id: userId,
    role: 'PARENT',
    fullName: (student.parentName || '').trim() || `Parent of ${student.fullName}`,
    arabicName: `${student.parentName || 'ولي الأمر'}`,
    username,
    email,
    password: phoneKey,
    phone: student.parentPhone || phoneKey,
    avatar: '/assets/images/avatar_parent_male_1794118098652.jpg',
    title: `Parent / Guardian of ${student.fullName}`,
    referenceId: `PAR-${phoneKey}`,
    campusId: student.campusId || 'campus-main',
    linkedStudentIds: siblingIds,
    mustChangePassword: true,
    isActive: true,
  });

  return { created: true, userId };
}

/**
 * Reconciles missing STUDENT (and PARENT) login accounts for all existing students.
 */
export async function reconcileStudentAndParentAccounts(): Promise<void> {
  if (!isMongoReady()) {
    const db = getRuntimeDb();
    let changed = false;
    for (const std of db.students) {
      const cls = db.classes.find((c) => c.id === std.classId);
      const res = await ensureStudentUserAccount(std, cls?.name);
      if (res.created) changed = true;
    }
    if (changed) saveRuntimeDb(db);
    return;
  }

  const [students, classes] = await Promise.all([
    Student.find().lean(),
    ClassBatch.find().select('id name').lean(),
  ]);
  const classMap = new Map(classes.map((c: any) => [c.id, c.name]));
  for (const std of students) {
    await ensureStudentUserAccount(std as any, classMap.get((std as any).classId));
  }
}

