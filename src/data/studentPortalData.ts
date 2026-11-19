export interface StudentCourseAttendance {
  id: string;
  code: string;
  name: string;
  faculty: string;
  totalHours: number;
  attendedHours: number;
  percentage: number;
  credits: number;
  semester: number;
  category: 'Core' | 'Elective' | 'Complementary' | 'Academy';
}

export interface HourlyAttendanceCell {
  dayStr: string; // e.g. "08-Mon"
  date: string; // "2026-08-08"
  h1: 'PRESENT' | 'ABSENT' | 'LATE' | 'LET_OFF' | 'UNMARKED';
  h2: 'PRESENT' | 'ABSENT' | 'LATE' | 'LET_OFF' | 'UNMARKED';
  h3: 'PRESENT' | 'ABSENT' | 'LATE' | 'LET_OFF' | 'UNMARKED';
  h4: 'PRESENT' | 'ABSENT' | 'LATE' | 'LET_OFF' | 'UNMARKED';
  h5: 'PRESENT' | 'ABSENT' | 'LATE' | 'LET_OFF' | 'UNMARKED';
}

export interface MonthlyTermlyRecord {
  sl: number;
  year: number;
  month: string;
  attendance: number;
  total: number;
  percentage: number;
}

export interface StudentFavoriteItem {
  id: string;
  title: string;
  iconName: string;
  description: string;
  category: string;
  badge?: string;
}

export const STUDENT_PROFILE_DATA = {
  id: "std_05",
  fullName: "MOHAMMED AJASH",
  arabicName: "محمد أجش بن عبد الحميد",
  admissionNo: "24812",
  registerNo: "HYBA-24812",
  department: "Tahfeezul Quran & Islamic Studies",
  collegeName: "Markazul Hidaya Kombam",
  academyName: "Markazul Hidayathil Islamiyya",
  academicYear: "2026 - 2027",
  currentSemester: 6,
  rollNo: "05",
  avatarUrl: "",
  campusPhotoUrl: "/assets/aistudio/20261110_070149_0e1de496.jpg",
  verified: true,
  dateOfBirth: "14 May 2002",
  gender: "Male",
  bloodGroup: "O +ve",
  nationality: "Indian",
  state: "Kerala",
  email: "muhammadajash59594@gmail.com",
  phone: "+91 98460 24812",
  address: "Thekkath House, Kombam, Kodakkad (P.O), Mannarkkad, Palakkad, Kerala - 678583",
  aadhaarMasked: "•••• •••• 8912",
  
  parent: {
    fatherName: "Abdul Hameed T",
    fatherPhone: "+91 98472 99881",
    relation: "Father",
    occupation: "Merchant / Business",
    motherName: "Suhara T",
    motherPhone: "+91 94473 11842",
    guardianAddress: "Thekkath House, Kombam, Kodakkad (P.O), Mannarkkad, Palakkad - 678583",
  },
  
  bank: {
    bankName: "State Bank of India (SBI)",
    accountNumber: "38291048492",
    accountNumberMasked: "••••••••8492",
    ifscCode: "SBIN0070182",
    branch: "Mannarkkad Main Branch, Palakkad",
    accountType: "Student Savings A/C",
    scholarshipLinked: true,
  },
  
  admission: {
    department: "Tahfeezul Quran & Islamic Studies",
    programme: "Integrated Hifz & Islamic Sciences",
    batch: "2026 - 2027",
    admissionDate: "05-06-2024",
    quota: "General Merit",
    category: "Tahfeez Academy",
    classAdvisor: "Assigned Usthad",
    institutionCode: "HYBA",
  },
};

export const TODAY_ATTENDANCE_HOURS = [
  {
    hour: 1,
    time: "07:00 AM - 08:30 AM",
    subjectCode: "HIFZ501",
    subjectName: "Fajr Sabq · Quran Memorization",
    faculty: "Assigned Usthad",
    room: "Tahfeez Chamber 101",
    status: "PRESENT",
    topic: "New Sabq memorization & Tajweed verification",
  },
  {
    hour: 2,
    time: "09:00 AM - 10:30 AM",
    subjectCode: "HIFZ502",
    subjectName: "Morning Murajath · Revision",
    faculty: "Assigned Usthad",
    room: "Tahfeez Chamber 101",
    status: "PRESENT",
    topic: "Recent Juz Sabq Para revision & fluency check",
  },
  {
    hour: 3,
    time: "11:00 AM - 12:30 PM",
    subjectCode: "TAJ503",
    subjectName: "Tajweed & Makharij Clinic",
    faculty: "Assigned Usthad",
    room: "Main Hall",
    status: "PRESENT",
    topic: "Articulation points & Qira'at rules",
  },
  {
    hour: 4,
    time: "02:00 PM - 04:00 PM",
    subjectCode: "HIFZ504",
    subjectName: "Afternoon Manzil Circle",
    faculty: "Assigned Usthad",
    room: "Tahfeez Chamber 102",
    status: "PRESENT",
    topic: "Cumulative Juz Manzil consolidation",
  },
  {
    hour: 5,
    time: "04:30 PM - 05:30 PM",
    subjectCode: "ISL505",
    subjectName: "Oral Testing & Islamic Studies",
    faculty: "Usthad Mohammed Ajash T.",
    room: "Tahfeez Chamber 101",
    status: "PRESENT",
    topic: "Daily recitation assessment & Usul-ul-Fiqh",
  },
];

export const STUDENT_COURSES_DATA: StudentCourseAttendance[] = [
  {
    id: "crs_05",
    code: "HIFZ501",
    name: "Tahfeezul Quran (Sabq, Murajath & Manzil)",
    faculty: "Usthad Mohammed Ajash T.",
    totalHours: 60,
    attendedHours: 58,
    percentage: 96.67,
    credits: 4,
    semester: 6,
    category: "Academy",
  },
  {
    id: "crs_01",
    code: "TAJ502",
    name: "Tajweed & Qira'at Principles",
    faculty: "Assigned Usthad",
    totalHours: 45,
    attendedHours: 42,
    percentage: 93.33,
    credits: 3,
    semester: 6,
    category: "Core",
  },
  {
    id: "crs_06",
    code: "ISL502",
    name: "Islamic Jurisprudence & Ethics (Usul-ul-Fiqh)",
    faculty: "Usthad Hafiz Luqman Al-Bukhari",
    totalHours: 40,
    attendedHours: 37,
    percentage: 92.5,
    credits: 3,
    semester: 6,
    category: "Complementary",
  },
  {
    id: "crs_02",
    code: "ARB503",
    name: "Quranic Arabic & Tafsir",
    faculty: "Assigned Usthad",
    totalHours: 36,
    attendedHours: 33,
    percentage: 91.67,
    credits: 2,
    semester: 6,
    category: "Core",
  },
];

export const HOURLY_ATTENDANCE_DATA: Record<string, HourlyAttendanceCell[]> = {
  August: [
    { dayStr: "08-Mon", date: "2026-08-08", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'UNMARKED', h5: 'UNMARKED' },
    { dayStr: "09-Tue", date: "2026-08-09", h1: 'ABSENT', h2: 'ABSENT', h3: 'UNMARKED', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "10-Wed", date: "2026-08-10", h1: 'ABSENT', h2: 'UNMARKED', h3: 'UNMARKED', h4: 'UNMARKED', h5: 'UNMARKED' },
    { dayStr: "11-Thu", date: "2026-08-11", h1: 'ABSENT', h2: 'ABSENT', h3: 'UNMARKED', h4: 'ABSENT', h5: 'UNMARKED' },
    { dayStr: "12-Fri", date: "2026-08-12", h1: 'ABSENT', h2: 'ABSENT', h3: 'ABSENT', h4: 'ABSENT', h5: 'ABSENT' },
    { dayStr: "15-Mon", date: "2026-08-15", h1: 'PRESENT', h2: 'UNMARKED', h3: 'UNMARKED', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "16-Tue", date: "2026-08-16", h1: 'PRESENT', h2: 'ABSENT', h3: 'ABSENT', h4: 'UNMARKED', h5: 'UNMARKED' },
    { dayStr: "18-Thu", date: "2026-08-18", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "22-Mon", date: "2026-08-22", h1: 'PRESENT', h2: 'UNMARKED', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "23-Tue", date: "2026-08-23", h1: 'ABSENT', h2: 'ABSENT', h3: 'ABSENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "25-Thu", date: "2026-08-25", h1: 'PRESENT', h2: 'PRESENT', h3: 'UNMARKED', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "29-Mon", date: "2026-08-29", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "30-Tue", date: "2026-08-30", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
  ],
  July: [
    { dayStr: "01-Wed", date: "2026-07-01", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "02-Thu", date: "2026-07-02", h1: 'PRESENT', h2: 'PRESENT', h3: 'LATE', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "06-Mon", date: "2026-07-06", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "07-Tue", date: "2026-07-07", h1: 'PRESENT', h2: 'ABSENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'UNMARKED' },
    { dayStr: "13-Mon", date: "2026-07-13", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'LET_OFF', h5: 'LET_OFF' },
    { dayStr: "14-Tue", date: "2026-07-14", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "20-Mon", date: "2026-07-20", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "21-Tue", date: "2026-07-21", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "27-Mon", date: "2026-07-27", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
  ],
  September: [
    { dayStr: "01-Tue", date: "2026-09-01", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "02-Wed", date: "2026-09-02", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "07-Mon", date: "2026-09-07", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "08-Tue", date: "2026-09-08", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "14-Mon", date: "2026-09-14", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "15-Tue", date: "2026-09-15", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "21-Mon", date: "2026-09-21", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'LET_OFF', h5: 'LET_OFF' },
    { dayStr: "22-Tue", date: "2026-09-22", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "28-Mon", date: "2026-09-28", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "29-Tue", date: "2026-09-29", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
  ],
  October: [
    { dayStr: "05-Mon", date: "2026-10-05", h1: 'UNMARKED', h2: 'UNMARKED', h3: 'UNMARKED', h4: 'UNMARKED', h5: 'UNMARKED' },
    { dayStr: "06-Tue", date: "2026-10-06", h1: 'UNMARKED', h2: 'UNMARKED', h3: 'UNMARKED', h4: 'UNMARKED', h5: 'UNMARKED' },
    { dayStr: "12-Mon", date: "2026-10-12", h1: 'UNMARKED', h2: 'UNMARKED', h3: 'UNMARKED', h4: 'UNMARKED', h5: 'UNMARKED' },
    { dayStr: "19-Mon", date: "2026-10-19", h1: 'UNMARKED', h2: 'UNMARKED', h3: 'UNMARKED', h4: 'UNMARKED', h5: 'UNMARKED' },
    { dayStr: "26-Mon", date: "2026-10-26", h1: 'UNMARKED', h2: 'UNMARKED', h3: 'UNMARKED', h4: 'UNMARKED', h5: 'UNMARKED' },
  ],
  November: [
    { dayStr: "02-Mon", date: "2026-11-02", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "03-Tue", date: "2026-11-03", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "05-Thu", date: "2026-11-05", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "06-Fri", date: "2026-11-06", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
    { dayStr: "09-Mon", date: "2026-11-09", h1: 'PRESENT', h2: 'PRESENT', h3: 'PRESENT', h4: 'PRESENT', h5: 'PRESENT' },
  ],
};

export const TERMLY_ATTENDANCE_SEMESTER_5: MonthlyTermlyRecord[] = [
  { sl: 1, year: 2026, month: "Jun", attendance: 8.0, total: 13.0, percentage: 61.5 },
  { sl: 2, year: 2026, month: "Jul", attendance: 9.5, total: 16.0, percentage: 59.4 },
  { sl: 3, year: 2026, month: "Aug", attendance: 6.0, total: 11.0, percentage: 54.5 },
  { sl: 4, year: 2026, month: "Sep", attendance: 15.0, total: 21.0, percentage: 71.4 },
  { sl: 5, year: 2026, month: "Oct", attendance: 0.0, total: 5.0, percentage: 0.0 },
];

export const TERMLY_ATTENDANCE_SEMESTER_6: MonthlyTermlyRecord[] = [
  { sl: 1, year: 2026, month: "Nov", attendance: 14.0, total: 15.0, percentage: 93.3 },
  { sl: 2, year: 2026, month: "Dec", attendance: 18.0, total: 20.0, percentage: 90.0 },
];

export const ALL_FAVORITES_OPTIONS: StudentFavoriteItem[] = [
  { id: "fav_attendance", title: "Attendance Tracker", iconName: "CalendarCheck", description: "Course & hourly matrix", category: "Academic" },
  { id: "fav_virtual_id", title: "Virtual ID Card", iconName: "IdCard", description: "Digital card with barcode", category: "Campus" },
  { id: "fav_hifz", title: "Holy Quran Hifz", iconName: "BookOpen", description: "Sabq, Murajath & Manzil", category: "Academy", badge: "Juz 21" },
  { id: "fav_leave", title: "Duty Leave Application", iconName: "FileText", description: "Apply for let-off / medical", category: "Services" },
  { id: "fav_events", title: "Events & Announcements", iconName: "Calendar", description: "Programs & notices", category: "Campus" },
  { id: "fav_feedback", title: "Faculty Feedback", iconName: "MessageSquare", description: "Course survey evaluation", category: "Services" },
];

export const DEFAULT_PINNED_FAVORITES = [
  "fav_attendance",
  "fav_virtual_id",
  "fav_hifz",
  "fav_leave",
  "fav_events",
  "fav_feedback",
];

export const STUDENT_NOTIFICATIONS = [
  {
    id: "notif_01",
    title: "Term Hifz Evaluation Timetable Published",
    date: "Today, 08:30 AM",
    category: "Academic",
    read: false,
    content: "Term Tajweed and Sabq/Manzil oral evaluations begin on December 1.",
    isUrgent: true,
  },
  {
    id: "notif_02",
    title: "1st Hour Sabq Halqa Moved to Chamber 101",
    date: "Today, 07:15 AM",
    category: "Timetable",
    read: false,
    content: "Morning Sabq recitation will be held in Tahfeez Chamber 101.",
    isUrgent: false,
  },
  {
    id: "notif_03",
    title: "Tahfeez Evening Halqa (Manzil Revision)",
    date: "Yesterday",
    category: "Academy",
    read: true,
    content: "Usthad Mohammed Ajash T has scheduled a Juz 15-20 revision session after Asr prayer.",
    isUrgent: false,
  },
  {
    id: "notif_04",
    title: "Campus Library New Quranic Reference Books",
    date: "04 Nov 2026",
    category: "Academic",
    read: true,
    content: "New editions of Tafsir Ibn Kathir and Tajweed treatises are available for borrowing.",
    isUrgent: false,
  },
];
