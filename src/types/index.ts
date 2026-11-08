export type UserRole = 'SUPER_ADMIN' | 'USTHAD' | 'STUDENT' | 'PARENT';

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
  title?: string; // e.g. "Mudir / Head of Tahfeez", "Senior Usthad", "Student", "Parent"
  referenceId?: string; // Teacher ID, Student ID, or Admission No
  studentId?: string; // If student
  linkedStudentIds?: string[]; // If parent
  assignedClassIds?: string[]; // If usthad
}

export interface Campus {
  id: string;
  name: string;
  arabicName: string;
  location: string;
  address: string;
  established: string;
  phone: string;
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
