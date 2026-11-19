import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  MOCK_USERS,
  MOCK_STUDENTS,
  MOCK_TEACHERS,
  MOCK_CLASSES,
  INITIAL_HIFZ_RECORDS,
  INITIAL_ATTENDANCE_SESSION,
  MOCK_ANNOUNCEMENTS,
} from '../../src/data/mockData';

export const DEFAULT_CAMPUSES = [
  {
    id: 'campus-main',
    name: 'Markazul Hidaya Kombam',
    code: 'MHK-MAIN',
    arabicName: 'مركز الهداية الإسلامية - كومبم',
    address: 'Hidaya Nagar, Kombam, Kodakkad (PO), Mannarkkad, Palakkad, Kerala 678583',
    phone: '+91 4924 222123',
    email: 'hifz@markazulhidaya.edu.in',
    logo: '/assets/aistudio/__Hidaya_Updates_01__20261021_215417_1e0cd263.jpg',
    bannerUrl: '/assets/aistudio/20261110_070149_0e1de496.jpg',
    status: 'Active' as const,
    establishedYear: '1994',
    principalName: 'Sheikh Dr. Abdul Wahab Al-Qasimi',
    mudeerUserId: 'usr_admin_01',
    mudeerUsername: 'mudir',
    mudeerEmail: 'mudir@markazulhidaya.edu.in',
    mudeerPhone: '+91 94471 20001',
    allowStudentProfileEdit: false,
  },
  {
    id: 'campus-city',
    name: 'HYBA City Tahfeez Center',
    code: 'HYBA-CITY',
    arabicName: 'فرع المدينة لتحفيظ القرآن',
    address: 'Kollamkode Bypass Road, Mannarkkad Central, Palakkad',
    phone: '+91 4924 223400',
    email: 'city.campus@markazulhidaya.edu.in',
    logo: '/assets/aistudio/__Hidaya_Updates_01__20261021_215417_1e0cd263.jpg',
    bannerUrl: '/assets/images/campus_architecture_bg_1794109156055.jpg',
    status: 'Active' as const,
    establishedYear: '2021',
    principalName: 'Usthad Hafiz Luqman Al-Bukhari',
    mudeerUserId: 'usr_mudeer_city',
    mudeerUsername: 'mudir.city',
    mudeerEmail: 'city.mudir@markazulhidaya.edu.in',
    mudeerPhone: '+91 94475 77219',
    allowStudentProfileEdit: false,
  },
];

export const DEFAULT_EVENTS = [
  {
    id: 'evt_01',
    title: 'Annual Hifz Convocation & Sanad Award Ceremony 2026',
    arabicTitle: 'حفل تخريج حفظة كتاب الله وتسليم السند المبارك',
    description:
      'Honoring graduate Huffaz with verified Sanad and Ijazah recitation certifications under the patronage of Markaz Examination Board.',
    category: 'Ceremony',
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    startTime: '09:00 AM',
    endTime: '01:30 PM',
    venue: 'Markaz Central Grand Convention Hall, Main Campus',
    campusId: 'campus-main',
    targetAudience: 'ALL',
    status: 'Scheduled',
    createdBy: 'Sheikh Dr. Abdul Wahab Al-Qasimi',
    creatorRole: 'MUDEER',
    isImportant: true,
  },
  {
    id: 'evt_02',
    title: 'Inter-Batch Tajweed & Qira’at Competition',
    arabicTitle: 'مسابقة التجويد والقراءات بين الشعب القرآنية',
    description:
      'Comprehensive recitation contest focusing on Ahkam At-Tajweed, Tarteel, Waqf and Ibtida across all Tahfeez batches.',
    category: 'Competition',
    startDate: '2026-11-25',
    endDate: '2026-11-25',
    startTime: '08:30 AM',
    endTime: '12:30 PM',
    venue: 'Tahfeez Auditorium, Campus Hall A',
    campusId: 'campus-main',
    targetAudience: 'STUDENTS',
    status: 'Scheduled',
    createdBy: 'Usthad Mohammed Ajash T.',
    creatorRole: 'USTHAD',
    isImportant: false,
  },
  {
    id: 'evt_03',
    title: 'Parents & Guardians Academic Review Majlis',
    arabicTitle: 'المجلس الأكاديمي المشترك لأولياء الأمور والمشايخ',
    description:
      'Semester 1 progress review meeting with mentors, individual student progress discussion, and spiritual guidance for guardians.',
    category: 'Parent-Teacher Meeting',
    startDate: '2026-11-28',
    endDate: '2026-11-28',
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    venue: 'Conference Center & Library Hall',
    campusId: 'campus-main',
    targetAudience: 'PARENTS',
    status: 'Scheduled',
    createdBy: 'Usthad Mohammed Ajash T.',
    creatorRole: 'USTHAD',
    isImportant: true,
  },
  {
    id: 'evt_04',
    title: 'Quarterly Juz Memorization & Sanad Oral Examination',
    arabicTitle: 'امتحان الحفظ الفصلي واختبار الأجزاء الشفوي',
    description:
      'External evaluation panel verifying 5-Juz, 10-Juz, and 20-Juz milestones for official registry promotion.',
    category: 'Exam',
    startDate: '2026-12-05',
    endDate: '2026-12-07',
    startTime: '07:30 AM',
    endTime: '04:00 PM',
    venue: 'Academic Examination Board Room 102',
    campusId: 'campus-main',
    targetAudience: 'STUDENTS',
    status: 'Scheduled',
    createdBy: 'Mudir Office',
    creatorRole: 'MUDEER',
    isImportant: true,
  },
];

export const DEFAULT_TIMETABLE_SLOTS = [
  {
    id: 'slot_d1_1',
    day: 'D1',
    slotNumber: 1,
    time: '07:00 - 08:30',
    title: 'Sabq (السبق) · New Lesson Memorization',
    batch: 'Hifz Batch A (Hifz Ul Uloom)',
    room: 'Tahfeez Hall 101',
    mentor: 'Usthad Mohammed Ajash T.',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    tag: 'Sabq Focus',
    classId: 'batch-a',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d1_2',
    day: 'D1',
    slotNumber: 2,
    time: '09:00 - 10:30',
    title: 'Forenoon Murajath (المراجعة) · Recent Revision',
    batch: 'Hifz Batch A & B',
    room: 'Tahfeez Hall 101',
    mentor: 'Usthad Mohammed Ajash T.',
    color: 'bg-teal-50 border-teal-200 text-teal-950',
    tag: 'Revision',
    classId: 'batch-a',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d1_3',
    day: 'D1',
    slotNumber: 3,
    time: '11:00 - 12:30',
    title: 'Tajweed Rules, Makharij & Quranic Sciences',
    batch: 'Combined Hifz Department',
    room: 'Auditorium Hall',
    mentor: 'Dr. Abdul Wahab (Mudir) & Usthad Ajash',
    color: 'bg-sky-50 border-sky-200 text-sky-950',
    tag: 'Tajweed',
    classId: 'batch-a',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d1_4',
    day: 'D1',
    slotNumber: 4,
    time: '14:00 - 16:00',
    title: 'Manzil (المنزل) · Full Juz Cumulative Revision',
    batch: 'Hifz Batch A',
    room: 'Tahfeez Hall 101',
    mentor: 'Usthad Mohammed Ajash T.',
    color: 'bg-amber-50 border-amber-200 text-amber-950',
    tag: 'Manzil',
    classId: 'batch-a',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d1_5',
    day: 'D1',
    slotNumber: 5,
    time: '16:30 - 17:30',
    title: 'Sanad Verification & One-on-One Oral Testing',
    batch: 'Advanced Sanad Candidates',
    room: 'Library Sanctuary',
    mentor: 'Academic Advisor Dr. Sreenivasan K.P.',
    color: 'bg-purple-50 border-purple-200 text-purple-950',
    tag: 'Oral Exam',
    classId: 'batch-a',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d2_1',
    day: 'D2',
    slotNumber: 1,
    time: '07:00 - 08:30',
    title: 'Sabq (السبق) · New Lesson Memorization',
    batch: 'Hifz Batch A (Hifz Ul Uloom)',
    room: 'Tahfeez Hall 101',
    mentor: 'Usthad Mohammed Ajash',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    tag: 'Sabq Focus',
    classId: 'batch-a',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d2_2',
    day: 'D2',
    slotNumber: 2,
    time: '09:00 - 10:30',
    title: 'Tahfeez Batch B · Murajath & Makharij Drill',
    batch: 'Tahfeez Batch B (Al-Furqan)',
    room: 'Tahfeez Hall 102',
    mentor: 'Usthad Mohammed Ajash',
    color: 'bg-teal-50 border-teal-200 text-teal-950',
    tag: 'Revision',
    classId: 'batch-b',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d2_3',
    day: 'D2',
    slotNumber: 3,
    time: '14:00 - 16:00',
    title: 'Manzil (المنزل) · Cumulative Juz Revision',
    batch: 'Hifz Batch A (Hifz Ul Uloom)',
    room: 'Tahfeez Hall 101',
    mentor: 'Usthad Mohammed Ajash',
    color: 'bg-amber-50 border-amber-200 text-amber-950',
    tag: 'Manzil',
    classId: 'batch-a',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d3_1',
    day: 'D3',
    slotNumber: 1,
    time: '07:00 - 08:30',
    title: 'Sabq (السبق) · New Lesson Hearing',
    batch: 'Hifz Batch A (Hifz Ul Uloom)',
    room: 'Tahfeez Hall 101',
    mentor: 'Usthad Mohammed Ajash',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    tag: 'Sabq Focus',
    classId: 'batch-a',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d3_2',
    day: 'D3',
    slotNumber: 2,
    time: '11:00 - 12:30',
    title: 'Qira’at & Shatibiyyah Sanad Seminar',
    batch: 'Sanad Intensive Batch (Al-Itqan)',
    room: 'Sanad Library Chamber',
    mentor: 'Usthad Dr. Sreenivasan K.P.',
    color: 'bg-sky-50 border-sky-200 text-sky-950',
    tag: 'Tajweed',
    classId: 'batch-c',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d4_1',
    day: 'D4',
    slotNumber: 1,
    time: '07:00 - 08:30',
    title: 'Sabq (السبق) & Peer Recitation Pairing',
    batch: 'Hifz Batch A (Hifz Ul Uloom)',
    room: 'Tahfeez Hall 101',
    mentor: 'Usthad Mohammed Ajash',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    tag: 'Sabq Focus',
    classId: 'batch-a',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d4_2',
    day: 'D4',
    slotNumber: 2,
    time: '14:00 - 16:00',
    title: 'Manzil (المنزل) · Weekly Target Audit',
    batch: 'Tahfeez Batch B (Al-Furqan)',
    room: 'Tahfeez Hall 102',
    mentor: 'Usthad Hafiz Luqman Al-Bukhari',
    color: 'bg-amber-50 border-amber-200 text-amber-950',
    tag: 'Manzil',
    classId: 'batch-b',
    campusId: 'campus-main',
  },
  {
    id: 'slot_d5_1',
    day: 'D5',
    slotNumber: 1,
    time: '07:00 - 09:00',
    title: 'Jumu’ah Cumulative Manzil & Tajweed Majlis',
    batch: 'All Campus Hifz Batches',
    room: 'Grand Mosque Hall',
    mentor: 'Sheikh Dr. Abdul Wahab Al-Qasimi',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    tag: 'Weekly Review',
    classId: 'batch-a',
    campusId: 'campus-main',
  },
];

export function buildDefaultFeedbackConfig(campusId = 'campus-main') {
  return {
    campusId,
    isEnabled: true,
    term: '2026-27 (Odd Semester)',
    description:
      'Mandatory confidential student evaluation of Usthad mentorship, Tajweed precision, and daily Hifz support.',
    updatedAt: new Date().toISOString(),
    updatedBy: 'Sheikh Dr. Abdul Wahab Al-Qasimi',
    questions: [
      {
        id: 'fbq_1',
        prompt: 'How effectively does the Usthad guide your daily Sabq & Murajath memorization?',
        arabicPrompt: 'مدى جودة توجيه الأستاذ في السبق والمراجعة اليومية',
        type: 'RATING_5' as const,
        required: true,
        options: [],
        isActive: true,
        order: 1,
      },
      {
        id: 'fbq_2',
        prompt: 'How clear and consistent is the Tajweed & Makharij correction during recitation?',
        arabicPrompt: 'وضوح تصحيح التجويد ومخارج الحروف أثناء التلاوة',
        type: 'RATING_5' as const,
        required: true,
        options: [],
        isActive: true,
        order: 2,
      },
      {
        id: 'fbq_3',
        prompt: 'Does the Usthad begin and conclude sessions punctually according to the timetable?',
        arabicPrompt: 'الالتزام بأوقات الحلقات الدراسية وفق الجدول',
        type: 'YES_NO' as const,
        required: true,
        options: ['Yes', 'No'],
        isActive: true,
        order: 3,
      },
      {
        id: 'fbq_4',
        prompt: 'Which aspect of classroom mentorship helps you most?',
        arabicPrompt: 'أي جانب من الإرشاد الدراسي يفيدك أكثر؟',
        type: 'MULTIPLE_CHOICE' as const,
        required: true,
        options: [
          'Individual Hifz Attention',
          'Tajweed & Makharij Drills',
          'Weekly Manzil Revision Plan',
          'Encouragement & Motivation',
        ],
        isActive: true,
        order: 4,
      },
      {
        id: 'fbq_5',
        prompt: 'Share any specific suggestions or appreciation for your Usthad',
        arabicPrompt: 'اقتراحات أو ملاحظات إضافية للأستاذ',
        type: 'TEXT' as const,
        required: false,
        options: [],
        isActive: true,
        order: 5,
      },
    ],
  };
}

export interface RuntimeWebAuthnCredential {
  credentialID: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceName?: string;
  authenticatorType?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface RuntimeUser {
  id: string;
  role: 'HYBA_SUPER_ADMIN' | 'MUDEER' | 'USTHAD' | 'STUDENT' | 'PARENT';
  fullName: string;
  arabicName?: string;
  username: string;
  email: string;
  passwordHash: string;
  phone: string;
  avatar: string;
  avatarPublicId?: string;
  title?: string;
  referenceId?: string;
  campusId?: string;
  studentId?: string;
  linkedStudentIds?: string[];
  assignedClassIds?: string[];
  mustChangePassword?: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  webauthnCredentials?: RuntimeWebAuthnCredential[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RuntimeResetToken {
  id: string;
  userId: string;
  otpHash: string;
  resetTokenHash?: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  used: boolean;
  createdAt: string;
}

export interface RuntimeDb {
  users: RuntimeUser[];
  campuses: any[];
  students: any[];
  teachers: any[];
  classes: any[];
  hifzRecords: any[];
  attendanceSessions: any[];
  attendanceItems: any[];
  announcements: any[];
  events: any[];
  timetableSlots: any[];
  feedbackConfigs: any[];
  feedbackSubmissions: any[];
  teacherFeedbackReports: any[];
  resetTokens: RuntimeResetToken[];
}

const RUNTIME_DB_PATH = path.resolve(process.cwd(), '.hyba-runtime-db.json');

let memoryDb: RuntimeDb | null = null;

export function isMongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

function buildInitialUsers(): RuntimeUser[] {
  return Object.entries(MOCK_USERS).map(([key, userObj]) => ({
    id: userObj.id,
    role: userObj.role,
    fullName: userObj.fullName,
    arabicName: userObj.arabicName,
    username: (userObj.username || key).toLowerCase(),
    email: userObj.email.toLowerCase(),
    passwordHash: bcrypt.hashSync(userObj.password || 'password123', 10),
    phone: userObj.phone || '',
    avatar: userObj.avatar || '',
    title: userObj.title,
    referenceId: userObj.referenceId,
    campusId: userObj.campusId,
    studentId: userObj.studentId,
    linkedStudentIds: userObj.linkedStudentIds || [],
    assignedClassIds: userObj.assignedClassIds || [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

function buildInitialAttendanceItems() {
  const session = INITIAL_ATTENDANCE_SESSION;
  if (!session) return [];
  return Object.entries(session.records).map(([studentId, status]) => ({
    id: `att_item_${studentId}_${session.date}_h${session.sessionHour}`,
    studentId,
    classId: session.classId,
    date: session.date,
    sessionHour: session.sessionHour,
    status,
    markedByUsthadId: session.usthadId,
    academicYear: '2026 - 2027',
  }));
}

function buildInitialDb(): RuntimeDb {
  return {
    users: buildInitialUsers(),
    campuses: JSON.parse(JSON.stringify(DEFAULT_CAMPUSES)),
    students: JSON.parse(JSON.stringify(MOCK_STUDENTS)),
    teachers: JSON.parse(JSON.stringify(MOCK_TEACHERS)),
    classes: JSON.parse(JSON.stringify(MOCK_CLASSES)),
    hifzRecords: JSON.parse(JSON.stringify(INITIAL_HIFZ_RECORDS)),
    attendanceSessions: INITIAL_ATTENDANCE_SESSION ? [JSON.parse(JSON.stringify(INITIAL_ATTENDANCE_SESSION))] : [],
    attendanceItems: buildInitialAttendanceItems(),
    announcements: JSON.parse(JSON.stringify(MOCK_ANNOUNCEMENTS)),
    events: JSON.parse(JSON.stringify(DEFAULT_EVENTS)),
    timetableSlots: JSON.parse(JSON.stringify(DEFAULT_TIMETABLE_SLOTS)),
    feedbackConfigs: [buildDefaultFeedbackConfig('campus-main'), buildDefaultFeedbackConfig('campus-city')],
    feedbackSubmissions: [],
    teacherFeedbackReports: [],
    resetTokens: [],
  };
}

function ensureAdminSeedIntegrity(db: RuntimeDb): boolean {
  let changed = false;

  // Ensure HYBA_SUPER_ADMIN account exists
  const hasSuperAdmin = db.users.some((u) => u.role === 'HYBA_SUPER_ADMIN');
  if (!hasSuperAdmin) {
    const superCfg = MOCK_USERS.hybaSuperAdmin;
    db.users.unshift({
      id: superCfg.id,
      role: 'HYBA_SUPER_ADMIN',
      fullName: superCfg.fullName,
      arabicName: superCfg.arabicName,
      username: (superCfg.username || 'Admin.Hyba_Campus.portal').toLowerCase(),
      email: superCfg.email.toLowerCase(),
      passwordHash: bcrypt.hashSync(superCfg.password || 'HYBA. Markazul_Hidaya.Kombam', 10),
      phone: superCfg.phone || '',
      avatar: superCfg.avatar || '',
      title: superCfg.title,
      referenceId: superCfg.referenceId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    changed = true;
  }

  // Migrate legacy SUPER_ADMIN accounts if present on disk
  for (const u of db.users) {
    if ((u.role as string) === 'SUPER_ADMIN') {
      u.role = 'MUDEER';
      if (!u.campusId) u.campusId = 'campus-main';
      changed = true;
    }
  }

  // Ensure city mudeer exists
  const hasCityMudeer = db.users.some((u) => u.id === 'usr_mudeer_city');
  if (!hasCityMudeer) {
    const cityCfg = MOCK_USERS.mudeerCity;
    db.users.push({
      id: cityCfg.id,
      role: 'MUDEER',
      fullName: cityCfg.fullName,
      arabicName: cityCfg.arabicName,
      username: (cityCfg.username || 'mudir.city').toLowerCase(),
      email: cityCfg.email.toLowerCase(),
      passwordHash: bcrypt.hashSync(cityCfg.password || 'password123', 10),
      phone: cityCfg.phone || '',
      avatar: cityCfg.avatar || '',
      title: cityCfg.title,
      referenceId: cityCfg.referenceId,
      campusId: cityCfg.campusId || 'campus-city',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    changed = true;
  }

  // Ensure every student in runtimeDb has a STUDENT User account
  for (const std of db.students) {
    const cleanAdm = String(std.admissionNumber || '').trim();
    const cleanUsername = cleanAdm.toLowerCase();
    if (!cleanAdm) continue;
    const hasAccount = db.users.some(
      (u) =>
        u.studentId === std.id ||
        u.username.toLowerCase() === cleanUsername ||
        (u.referenceId && u.referenceId.toLowerCase() === cleanUsername)
    );
    if (!hasAccount) {
      const iso = String(std.dateOfBirth || '2011-01-01').trim();
      const isoMatch = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const defaultPass = isoMatch ? `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}` : iso;
      const cls = db.classes.find((c) => c.id === std.classId);
      db.users.push({
        id: `usr_student_${std.id}`,
        role: 'STUDENT',
        fullName: std.fullName,
        arabicName: std.arabicName || std.fullName,
        username: cleanUsername,
        email: `${cleanUsername.replace(/[^a-z0-9._-]/g, '') || std.id}.student@markazulhidaya.edu.in`,
        passwordHash: bcrypt.hashSync(defaultPass, 10),
        phone: std.parentPhone || '',
        avatar: std.photo || '',
        title: cls?.name ? `Student · ${cls.name}` : `Student · ${std.classId}`,
        referenceId: cleanAdm,
        campusId: std.campusId || 'campus-main',
        studentId: std.id,
        assignedClassIds: [std.classId],
        mustChangePassword: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      changed = true;
    }
  }

  // Ensure every student sharing a parentPhone with a PARENT account is linked in linkedStudentIds
  for (const parentUser of db.users) {
    if (parentUser.role !== 'PARENT') continue;
    const pDigits = String(parentUser.phone || '').replace(/\D/g, '');
    if (pDigits.length < 7) continue;
    const pKey = pDigits.length >= 10 ? pDigits.slice(-10) : pDigits;
    const currentLinks = new Set(parentUser.linkedStudentIds || []);
    for (const std of db.students) {
      const sDigits = String(std.parentPhone || '').replace(/\D/g, '');
      const sKey = sDigits.length >= 10 ? sDigits.slice(-10) : sDigits;
      if (sDigits.length >= 7 && (sDigits === pDigits || sKey === pKey) && !currentLinks.has(std.id)) {
        currentLinks.add(std.id);
        changed = true;
      }
    }
    if (changed) {
      parentUser.linkedStudentIds = Array.from(currentLinks);
    }
  }

  for (const campus of db.campuses) {
    if (typeof campus.allowStudentProfileEdit !== 'boolean') {
      campus.allowStudentProfileEdit = false;
      changed = true;
    }
  }

  return changed;
}

export function getRuntimeDb(): RuntimeDb {
  if (memoryDb) return memoryDb;

  try {
    if (fs.existsSync(RUNTIME_DB_PATH)) {
      const raw = fs.readFileSync(RUNTIME_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<RuntimeDb>;
      const initial = buildInitialDb();
      memoryDb = {
        users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : initial.users,
        campuses: Array.isArray(parsed.campuses) && parsed.campuses.length > 0 ? parsed.campuses : initial.campuses,
        students: Array.isArray(parsed.students) ? parsed.students : initial.students,
        teachers: Array.isArray(parsed.teachers) ? parsed.teachers : initial.teachers,
        classes: Array.isArray(parsed.classes) ? parsed.classes : initial.classes,
        hifzRecords: Array.isArray(parsed.hifzRecords) ? parsed.hifzRecords : initial.hifzRecords,
        attendanceSessions: Array.isArray(parsed.attendanceSessions) ? parsed.attendanceSessions : initial.attendanceSessions,
        attendanceItems: Array.isArray(parsed.attendanceItems) ? parsed.attendanceItems : initial.attendanceItems,
        announcements: Array.isArray(parsed.announcements) ? parsed.announcements : initial.announcements,
        events: Array.isArray(parsed.events) ? parsed.events : initial.events,
        timetableSlots: Array.isArray(parsed.timetableSlots) ? parsed.timetableSlots : initial.timetableSlots,
        feedbackConfigs:
          Array.isArray(parsed.feedbackConfigs) && parsed.feedbackConfigs.length > 0
            ? parsed.feedbackConfigs
            : initial.feedbackConfigs,
        feedbackSubmissions: Array.isArray(parsed.feedbackSubmissions) ? parsed.feedbackSubmissions : [],
        teacherFeedbackReports: Array.isArray(parsed.teacherFeedbackReports) ? parsed.teacherFeedbackReports : [],
        resetTokens: Array.isArray(parsed.resetTokens) ? parsed.resetTokens : [],
      };
      if (ensureAdminSeedIntegrity(memoryDb)) {
        saveRuntimeDb(memoryDb);
      }
      return memoryDb;
    }
  } catch (err) {
    console.warn('[RuntimeStore] Failed to load persisted JSON store, initializing fresh seed.');
  }

  memoryDb = buildInitialDb();
  saveRuntimeDb(memoryDb);
  return memoryDb;
}

export function saveRuntimeDb(db?: RuntimeDb) {
  const target = db || memoryDb;
  if (!target) return;
  try {
    fs.writeFileSync(RUNTIME_DB_PATH, JSON.stringify(target, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[RuntimeStore] Could not persist runtime DB:', err.message);
  }
}

export function sanitizeRuntimeUser(u: RuntimeUser) {
  return {
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
    assignedClassIds: u.assignedClassIds,
    mustChangePassword: Boolean(u.mustChangePassword),
    biometricEnabled: Boolean(u.webauthnCredentials && u.webauthnCredentials.length > 0),
  };
}
