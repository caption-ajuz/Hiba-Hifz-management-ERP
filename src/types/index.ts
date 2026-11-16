export type UserRole = 'HYBA_SUPER_ADMIN' | 'MUDEER' | 'USTHAD' | 'STUDENT' | 'PARENT';

export interface UserProfile {
  id: string;
  role: UserRole;
  fullName: string;
  arabicName?: string;
  username: string;
  email: string;
  password?: string;
  phone: string;
  avatar: string;
  title?: string; // e.g. "HYBA Platform Super Admin", "Mudeer (Campus Admin)", "Senior Usthad", "Student", "Parent"
  referenceId?: string; // Teacher ID, Student ID, or Admission No
  campusId?: string; // Assigned campus ID for Mudeer, Usthad, or Student
  studentId?: string; // If student
  linkedStudentIds?: string[]; // If parent
  assignedClassIds?: string[]; // If usthad
  mustChangePassword?: boolean; // First-login password change prompt
}

export interface Campus {
  id: string;
  name: string;
  code: string;
  arabicName?: string;
  location?: string;
  address: string;
  phone: string;
  email: string;
  logo?: string;
  bannerUrl?: string;
  status: 'Active' | 'Inactive';
  establishedYear?: string;
  principalName?: string;
  mudeerUserId?: string;
  mudeerUsername?: string;
  mudeerEmail?: string;
  mudeerPhone?: string;
  allowStudentProfileEdit?: boolean;
  studentCount?: number;
  teacherCount?: number;
  classCount?: number;
}

export interface ClassBatch {
  id: string;
  name: string;
  arabicName: string;
  campusId: string;
  usthadId: string;
  roomNumber: string;
  academicYear: string;
  capacity: number;
  totalStudents: number;
}

export interface Student {
  id: string;
  rollNumber: number;
  admissionNumber: string;
  fullName: string;
  arabicName: string;
  photo: string;
  photoPublicId?: string;
  email?: string;
  phone?: string;
  about?: string;
  address?: string;
  bloodGroup?: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  admissionDate: string;
  campusId: string;
  classId: string;
  assignedTeacherId: string;
  accountStatus: 'Active' | 'On Leave' | 'Completed';
  currentJuz: number;
  completedJuzList: number[]; // e.g. [1, 2, 3, 29, 30]
  totalMemorizedAyahs: number;
  attendanceRate: number; // percentage e.g. 96
}

export interface Teacher {
  id: string;
  teacherId: string;
  fullName: string;
  arabicTitle: string;
  photo: string;
  phone: string;
  email: string;
  qualification: string;
  experienceYears: number;
  assignedCampusId: string;
  assignedClassIds: string[];
  accountStatus: 'Active' | 'On Leave';
  specialization: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'NOT_MARKED';

export interface AttendanceRecord {
  studentId: string;
  rollNumber: number;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceItemRecord {
  id?: string;
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  sessionHour: number; // 1 to 5
  status: AttendanceStatus;
  markedByUsthadId?: string;
  markedByName?: string;
  topic?: string;
  description?: string;
  sessionName?: string;
  academicYear?: string;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  sessionHour: number; // 1 to 5
  sessionName: string; // e.g. "Fajr Sabq (Hour 1)", "Morning Murajath (Hour 2)"
  usthadId: string;
  topic?: string;
  description?: string;
  records: Record<string, AttendanceStatus>; // studentId -> status
  submittedAt?: string;
}

export type HifzRecordType = 'SABQ' | 'MURAJATH' | 'MANZIL';
export type PerformanceLevel = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
export type HifzResultStatus = 'Passed' | 'Revision Required' | 'Not Passed';

export interface HifzRecord {
  id: string;
  studentId: string;
  teacherId: string;
  date: string;
  recordType: HifzRecordType;
  // Sabq & Murajath specific
  surahNumber?: number;
  surahName?: string;
  surahArabic?: string;
  startAyah?: number;
  endAyah?: number;
  // Manzil specific
  juzNumber?: number;
  juzName?: string;
  surahRangeText?: string;
  // Common evaluation fields
  performance: PerformanceLevel;
  mistakeCount: number;
  status: HifzResultStatus;
  teacherRemarks: string;
  nextLessonConfirmed?: boolean;
  nextLessonPosition?: string;
}

export interface TeacherEvaluation {
  id: string;
  teacherId: string;
  studentId: string;
  term: string;
  date: string;
  status: 'Completed' | 'Pending';
  course: string;
  ratings?: {
    inspiringAbility: number; // 1-5
    tajweedGuidance: number; // 1-5
    punctuality: number; // 1-5
    revisionPatience: number; // 1-5
    generalFeedback: string;
  };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'Academic' | 'Attendance' | 'Exam' | 'General';
  author: string;
  isImportant?: boolean;
}

export interface QuranSurah {
  number: number;
  name: string;
  arabicName: string;
  ayahs: number;
  juz: number;
}

export type EventCategory =
  | 'Academic'
  | 'Competition'
  | 'Ceremony'
  | 'Exam'
  | 'Holiday'
  | 'Majlis'
  | 'Parent-Teacher Meeting'
  | 'General';

export type EventStatus = 'Scheduled' | 'Ongoing' | 'Completed' | 'Postponed';

export interface CollegeEvent {
  id: string;
  title: string;
  arabicTitle?: string;
  description: string;
  category: EventCategory;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  startTime?: string; // e.g. "09:00 AM"
  endTime?: string; // e.g. "01:00 PM"
  venue: string;
  campusId?: string;
  targetAudience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS';
  status: EventStatus;
  posterUrl?: string;
  posterPublicId?: string;
  createdBy?: string;
  creatorRole?: string;
  isImportant?: boolean;
}

export interface TimetableSlot {
  id: string;
  day: string; // 'D1' | 'D2' | 'D3' | 'D4' | 'D5'
  slotNumber: number;
  time: string; // e.g. '07:00 - 08:30'
  title: string;
  batch: string;
  room: string;
  mentor: string;
  color?: string;
  tag?: string;
  classId?: string;
  campusId?: string;
}

export type FeedbackAnswerType = 'RATING_5' | 'MULTIPLE_CHOICE' | 'YES_NO' | 'TEXT';

export interface FeedbackQuestion {
  id: string;
  prompt: string;
  arabicPrompt?: string;
  type: FeedbackAnswerType;
  required: boolean;
  options?: string[];
  isActive: boolean;
  order: number;
}

export interface FeedbackConfig {
  campusId: string;
  isEnabled: boolean;
  term: string;
  description?: string;
  questions: FeedbackQuestion[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface FeedbackAnswerItem {
  questionId: string;
  questionPrompt: string;
  type: FeedbackAnswerType;
  value: string | number | boolean;
}

export interface FeedbackSubmission {
  id: string;
  campusId: string;
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  classId: string;
  batchName: string;
  teacherId: string;
  teacherName: string;
  facultyDepartment: string;
  term: string;
  answers: FeedbackAnswerItem[];
  submittedAt: string;
}

export interface TeacherFeedbackReport {
  id: string;
  campusId: string;
  teacherId: string;
  teacherName: string;
  facultyLabel?: string;
  term: string;
  summaryText: string;
  suggestionsText: string;
  mudirName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MyFeedbackStatusResponse {
  isEnabled: boolean;
  term: string;
  description?: string;
  questions: FeedbackQuestion[];
  teachers: Array<{
    id: string;
    teacherId?: string;
    fullName: string;
    arabicTitle?: string;
    photo?: string;
    specialization?: string;
    facultyDepartment: string;
    submitted: boolean;
  }>;
  submittedTeacherIds: string[];
  pendingTeachers: Array<{
    id: string;
    fullName: string;
    facultyDepartment: string;
  }>;
  requiresSubmission: boolean;
}


