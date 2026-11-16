import bcrypt from 'bcryptjs';
import { ClassBatch } from '../models/ClassBatch';
import { Teacher } from '../models/Teacher';
import { User } from '../models/User';
import { isMongoReady, getRuntimeDb } from '../config/runtimeStore';

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

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return clean;
}

/**
 * Generates default student login password from Admission Number & Date of Birth.
 * Format: <AdmissionNumber>@<DateOfBirth> (e.g. 24831@2011-03-15)
 */
export function buildDefaultStudentPassword(admissionNumber: string, dateOfBirth?: string): string {
  const cleanAdm = admissionNumber.trim();
  const cleanDob = normalizeDobString(dateOfBirth);
  return `${cleanAdm}@${cleanDob}`;
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
 * Ensures a STUDENT User login account exists for an enrolled or CSV-imported student.
 * Default password is generated from Admission Number + Date of Birth and flagged mustChangePassword = true.
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
  const safeEmail = `${cleanUsername.replace(/[^a-z0-9._-]/g, '')}.student@markazulhidaya.edu.in`;
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
      avatar: student.photo || '/assets/images/avatar_student_male_1794118079992.jpg',
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
    avatar: student.photo || '/assets/images/avatar_student_male_1794118079992.jpg',
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
