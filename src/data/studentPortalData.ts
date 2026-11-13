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
  fullName: "MOHAMMED AJASH T",
  arabicName: "محمد أجش ت.",
  admissionNo: "24812",
  registerNo: "KIAYSCH024",
  department: "P.G Department of Chemistry (Aided)",
  collegeName: "Markazul Hidaya Kombam",
  academyName: "Markazul Hidayathil Islamiyya",
  academicYear: "2026 - 2027",
  currentSemester: 6,
  rollNo: "05",
  avatarUrl: "/assets/images/avatar_student_male_1794118079992.jpg",
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
    department: "P.G Department of Chemistry (Aided)",
    programme: "B.Sc Chemistry (CBCS Honors) with Integrated Tahfeez",
    batch: "2024 - 2027",
    admissionDate: "05-06-2024",
    quota: "General Merit (Calicut University CAP)",
    category: "OBC / Muslim",
    classAdvisor: "Dr. Sreenivasan K.P.",
    institutionCode: "KIAY",
  },
};

export const TODAY_ATTENDANCE_HOURS = [
  {
    hour: 1,
    time: "09:30 AM - 10:30 AM",
    subjectCode: "CHE5CJ302",
    subjectName: "Inorganic Chemistry - III",
    faculty: "Dr. Sreenivasan K.P.",
    room: "Room 204 (Chemistry Block)",
    status: "PRESENT",
    topic: "Coordination chemistry - Crystal Field Splitting in Octahedral Complexes",
  },
  {
    hour: 2,
    time: "10:30 AM - 11:30 AM",
    subjectCode: "CHE5CJ301",
    subjectName: "Theoretical Chemistry II- Group theory",
    faculty: "Dr. Sreenivasan K.P.",
    room: "Room 204 (Chemistry Block)",
    status: "PRESENT",
    topic: "Symmetry elements and point group determination (C2v, C3v)",
  },
  {
    hour: 3,
    time: "11:45 AM - 12:45 PM",
    subjectCode: "CHE5FS 112",
    subjectName: "Chemistry in everyday life",
    faculty: "FAUSIA K H",
    room: "Auditorium Hall B",
    status: "PRESENT",
    topic: "Pharmaceutical chemistry & analgesics classification",
  },
  {
    hour: 4,
    time: "01:30 PM - 02:30 PM",
    subjectCode: "CHE5CJ303",
    subjectName: "Major - Organic Chemistry-III",
    faculty: "Dr. Sreenivasan K.P.",
    room: "Chemistry Lab 2",
    status: "PRESENT",
    topic: "Pericyclic reactions: Woodward-Hoffmann rules & Diels-Alder cycloaddition",
  },
  {
    hour: 5,
    time: "02:30 PM - 03:30 PM",
    subjectCode: "HIFZ501",
    subjectName: "Tahfeezul Quran & Tajweed Review",
    faculty: "Usthad Mohammed Ajash T.",
    room: "Tahfeez Chamber 101",
    status: "PRESENT",
    topic: "Surah Al-Anbiya Ayahs 16-30 Sabq Verification & Juz 15 Manzil",
  },
];

export const STUDENT_COURSES_DATA: StudentCourseAttendance[] = [
  {
    id: "crs_01",
    code: "CHE5CJ302",
    name: "Inorganic Chemistry -III",
    faculty: "Dr.Sreenivasan.K.P",
    totalHours: 50,
    attendedHours: 34,
    percentage: 68.0,
    credits: 4,
    semester: 5,
    category: "Core",
  },
  {
    id: "crs_02",
    code: "CHE5CJ301",
    name: "Theoretical Chemistry II- Group theory and Molecular Spectroscopy",
    faculty: "Dr.Sreenivasan.K.P",
    totalHours: 76,
    attendedHours: 41,
    percentage: 53.95,
    credits: 4,
    semester: 5,
    category: "Core",
  },
  {
    id: "crs_03",
    code: "CHE5FS 112",
    name: "Chemistry in everyday life",
    faculty: "FAUSIA K H",
    totalHours: 17,
    attendedHours: 14,
    percentage: 82.35,
    credits: 2,
    semester: 5,
    category: "Elective",
  },
  {
    id: "crs_04",
    code: "CHE5CJ303",
    name: "CORE COURSE 10 IN MAJOR-ORGANIC CHEMISTRY-III",
    faculty: "Dr.Sreenivasan.K.P",
    totalHours: 56,
    attendedHours: 38,
    percentage: 67.86,
    credits: 4,
    semester: 5,
    category: "Core",
  },
  {
    id: "crs_05",
    code: "HIFZ501",
    name: "Tahfeezul Quran (Sabq, Murajath & Manzil)",
    faculty: "Usthad Mohammed Ajash T.",
    totalHours: 60,
    attendedHours: 58,
    percentage: 96.67,
    credits: 3,
    semester: 5,
    category: "Academy",
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
    semester: 5,
    category: "Complementary",
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
  { id: "fav_timetable", title: "Daily Timetable", iconName: "Clock", description: "Bell schedule & rooms", category: "Academic" },
  { id: "fav_attendance", title: "Attendance Tracker", iconName: "CalendarCheck", description: "Course & hourly matrix", category: "Academic" },
  { id: "fav_virtual_id", title: "Virtual ID Card", iconName: "IdCard", description: "Digital card with barcode", category: "Campus" },
  { id: "fav_hifz", title: "Holy Quran Hifz", iconName: "BookOpen", description: "Sabq, Murajath & Manzil", category: "Academy", badge: "Juz 21" },
  { id: "fav_leave", title: "Duty Leave Application", iconName: "FileText", description: "Apply for let-off / medical", category: "Services" },
  { id: "fav_marks", title: "Internal Marks", iconName: "Award", description: "Continuous assessment & CGPA", category: "Academic" },
  { id: "fav_library", title: "Digital Library", iconName: "Library", description: "Textbooks & references", category: "Academic" },
  { id: "fav_events", title: "Events & Fest", iconName: "Calendar", description: "Competitions & ceremonies", category: "Campus" },
  { id: "fav_feedback", title: "Faculty Feedback", iconName: "MessageSquare", description: "Course survey evaluation", category: "Services", badge: "1 Pending" },
];

export const DEFAULT_PINNED_FAVORITES = [
  "fav_timetable",
  "fav_attendance",
  "fav_virtual_id",
  "fav_hifz",
  "fav_leave",
  "fav_marks",
];

export const STUDENT_NOTIFICATIONS = [
  {
    id: "notif_01",
    title: "Odd Semester Model Examination Timetable Published",
    date: "Today, 08:30 AM",
    category: "Academic",
    read: false,
    content: "The 5th & 6th Semester Chemistry & Islamic Studies practical/theory model examinations will begin from December 1. Download full syllabus from portal.",
    isUrgent: true,
  },
  {
    id: "notif_02",
    title: "1st Hour Inorganic Chemistry Rescheduled to Hall 204",
    date: "Today, 07:15 AM",
    category: "Timetable",
    read: false,
    content: "Notice from Dr. Sreenivasan K.P: Today's morning 9:30 AM session has been relocated to Hall 204 for digital projector demonstrations.",
    isUrgent: false,
  },
  {
    id: "notif_03",
    title: "Tahfeez Evening Halqa (Manzil Revision)",
    date: "Yesterday",
    category: "Academy",
    read: true,
    content: "Usthad Mohammed Ajash T has scheduled special Juz 15-20 consolidation session after Asr prayer.",
    isUrgent: false,
  },
  {
    id: "notif_04",
    title: "Campus Library New Quranic Reference Books Available",
    date: "04 Nov 2026",
    category: "Academic",
    read: true,
    content: "The Central Library has added new reference editions of Tafsir Ibn Kathir and Tajweed Qira'at treatises. Available for student borrowing.",
    isUrgent: false,
  },
];
