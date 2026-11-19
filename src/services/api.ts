import {
  UserProfile,
  Student,
  Teacher,
  ClassBatch,
  Campus,
  HifzRecord,
  AttendanceSession,
  AttendanceItemRecord,
  TeacherEvaluation,
  Announcement,
  CollegeEvent,
  TimetableSlot,
  FeedbackConfig,
  FeedbackSubmission,
  TeacherFeedbackReport,
  MyFeedbackStatusResponse,
} from '../types';
import {
  MOCK_STUDENTS,
  MOCK_TEACHERS,
  MOCK_CLASSES,
  INITIAL_HIFZ_RECORDS,
  MOCK_ANNOUNCEMENTS,
  MOCK_EVALUATIONS,
} from '../data/mockData';

import { queueOfflineAction } from './offlineSync';

const TOKEN_KEY = 'hyba_jwt_token';

export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

function isNetworkFailure(error: any): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (error?.status) return false; // Server explicitly returned an HTTP status
  return error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(error?.message || '');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackData?: T,
  offlineQueueMeta?: { label: string; optimisticReturn: T }
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const method = (options.method || 'GET').toUpperCase();

  // If offline and this mutation supports Background Sync queueing, enqueue immediately
  if (
    offlineQueueMeta &&
    (method === 'POST' || method === 'PUT' || method === 'DELETE') &&
    typeof navigator !== 'undefined' &&
    !navigator.onLine
  ) {
    let parsedBody: unknown;
    try {
      parsedBody = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch {
      parsedBody = options.body;
    }
    await queueOfflineAction(endpoint, method, parsedBody, offlineQueueMeta.label);
    return offlineQueueMeta.optimisticReturn;
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const httpErr = new Error(errJson.error || `HTTP ${res.status}: ${res.statusText}`) as Error & {
        status?: number;
      };
      httpErr.status = res.status;
      throw httpErr;
    }

    const data = await res.json();
    return data.data !== undefined ? data.data : data;
  } catch (error: any) {
    // Queue offline mutation automatically if network dropped mid-flight
    if (
      offlineQueueMeta &&
      (method === 'POST' || method === 'PUT' || method === 'DELETE') &&
      isNetworkFailure(error)
    ) {
      let parsedBody: unknown;
      try {
        parsedBody = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      } catch {
        parsedBody = options.body;
      }
      await queueOfflineAction(endpoint, method, parsedBody, offlineQueueMeta.label);
      return offlineQueueMeta.optimisticReturn;
    }

    console.warn(`[API] Call to ${endpoint} failed:`, error.message);
    if (fallbackData !== undefined && !error?.status) {
      return fallbackData;
    }
    throw error;
  }
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const authErr = new Error(err.error || 'Login failed') as Error & { status?: number };
      authErr.status = res.status;
      throw authErr;
    }

    const data = await res.json();
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network error during logout; local session will still be purged
    } finally {
      removeAuthToken();
    }
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    const res = await request<{ user: UserProfile }>('/api/auth/me');
    return res.user || null;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async requestPasswordReset(identifier: string): Promise<{
    maskedEmail: string;
    maskedPhone: string;
    fullName: string;
    role: string;
    expiresInSeconds: number;
    previewOtp?: string;
  }> {
    return request('/api/auth/forgot-password/request', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  async verifyResetOtp(
    identifier: string,
    otp: string,
    phoneLast4: string
  ): Promise<{ resetToken: string; expiresInSeconds: number }> {
    return request('/api/auth/forgot-password/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp, phoneLast4 }),
    });
  },

  async confirmPasswordReset(resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/forgot-password/confirm', {
      method: 'POST',
      body: JSON.stringify({ resetToken, newPassword }),
    });
  },

  // Students
  async getStudents(params: { classId?: string; search?: string } = {}): Promise<Student[]> {
    const query = new URLSearchParams();
    query.set('limit', '200');
    if (params.classId) query.set('classId', params.classId);
    if (params.search) query.set('search', params.search);

    const url = `/api/students${query.toString() ? `?${query.toString()}` : ''}`;
    return request<Student[]>(url, {}, MOCK_STUDENTS);
  },

  async getStudentById(id: string): Promise<Student | null> {
    const fallback = MOCK_STUDENTS.find((s) => s.id === id) || null;
    return request<Student>(`/api/students/${id}`, {}, fallback as any);
  },

  async getStudentProfileEditPermission(): Promise<{ campusId: string; allowStudentProfileEdit: boolean }> {
    return request<{ campusId: string; allowStudentProfileEdit: boolean }>('/api/students/settings/profile-edit');
  },

  async updateStudentProfileEditPermission(
    allowStudentProfileEdit: boolean
  ): Promise<{ campusId: string; allowStudentProfileEdit: boolean }> {
    return request<{ campusId: string; allowStudentProfileEdit: boolean }>('/api/students/settings/profile-edit', {
      method: 'PUT',
      body: JSON.stringify({ allowStudentProfileEdit }),
    });
  },

  async createStudent(student: Partial<Student>): Promise<Student> {
    return request<Student>(
      '/api/students',
      {
        method: 'POST',
        body: JSON.stringify(student),
      },
      undefined,
      {
        label: `Add student ${student.fullName || ''}`.trim(),
        optimisticReturn: student as Student,
      }
    );
  },

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    return request<Student>(
      `/api/students/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      },
      undefined,
      {
        label: 'Update student profile',
        optimisticReturn: { id, ...updates } as Student,
      }
    );
  },

  async deleteStudent(id: string): Promise<void> {
    return request<void>(`/api/students/${id}`, {
      method: 'DELETE',
    });
  },

  async importStudentsCSV(rows: any[], isCommit: boolean = false): Promise<any> {
    return request<any>('/api/students/import-csv', {
      method: 'POST',
      body: JSON.stringify({ rows, isCommit }),
    });
  },

  // Campuses & Mudeer Governance (HYBA_SUPER_ADMIN)
  async getCampuses(): Promise<Campus[]> {
    return request<Campus[]>('/api/campuses', {}, [
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
        status: 'Active',
        establishedYear: '1994',
        principalName: 'Sheikh Dr. Abdul Wahab Al-Qasimi',
        mudeerUserId: 'usr_admin_01',
        mudeerUsername: 'mudir',
        mudeerEmail: 'mudir@markazulhidaya.edu.in',
        mudeerPhone: '+91 94471 20001',
        studentCount: 24,
        teacherCount: 3,
        classCount: 3,
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
        status: 'Active',
        establishedYear: '2021',
        principalName: 'Usthad Hafiz Luqman Al-Bukhari',
        mudeerUserId: 'usr_mudeer_city',
        mudeerUsername: 'mudir.city',
        mudeerEmail: 'city.mudir@markazulhidaya.edu.in',
        mudeerPhone: '+91 94475 77219',
        studentCount: 0,
        teacherCount: 0,
        classCount: 0,
      },
    ]);
  },

  async getCampusDetails(id: string): Promise<{ campus: Campus; students: Student[]; teachers: Teacher[]; classes: ClassBatch[] }> {
    return request<{ campus: Campus; students: Student[]; teachers: Teacher[]; classes: ClassBatch[] }>(
      `/api/campuses/${id}/details`
    );
  },

  async createCampus(campusPayload: any): Promise<Campus> {
    return request<Campus>('/api/campuses', {
      method: 'POST',
      body: JSON.stringify(campusPayload),
    });
  },

  async updateCampus(id: string, updates: Partial<Campus>): Promise<Campus> {
    return request<Campus>(`/api/campuses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async assignCampusMudeer(
    campusId: string,
    payload: {
      mudeerMode: 'new' | 'existing';
      existingTeacherId?: string;
      mudeerName?: string;
      mudeerArabicName?: string;
      mudeerEmail?: string;
      mudeerPhone?: string;
      mudeerUsername: string;
      mudeerPassword?: string;
    }
  ): Promise<Campus> {
    return request<Campus>(`/api/campuses/${campusId}/mudeer`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteCampus(id: string): Promise<void> {
    return request<void>(`/api/campuses/${id}`, {
      method: 'DELETE',
    });
  },

  // Teachers
  async getTeachers(): Promise<Teacher[]> {
    return request<Teacher[]>('/api/teachers', {}, MOCK_TEACHERS);
  },

  async createTeacher(teacherData: any): Promise<any> {
    return request<any>('/api/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    });
  },

  async updateTeacher(id: string, updates: Partial<Teacher>): Promise<Teacher> {
    return request<Teacher>(`/api/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async resetTeacherPassword(id: string, newPassword: string): Promise<any> {
    return request<any>(`/api/teachers/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },

  async deleteTeacher(id: string): Promise<void> {
    return request<void>(`/api/teachers/${id}`, {
      method: 'DELETE',
    });
  },

  // Classes
  async getClasses(campusId?: string): Promise<ClassBatch[]> {
    const query = campusId ? `?campusId=${encodeURIComponent(campusId)}` : '';
    return request<ClassBatch[]>(`/api/classes${query}`, {}, MOCK_CLASSES);
  },

  async getClassMentors(campusId?: string): Promise<Array<Teacher & { roleType?: 'MUDEER' | 'USTHAD' }>> {
    const query = campusId ? `?campusId=${encodeURIComponent(campusId)}` : '';
    return request<Array<Teacher & { roleType?: 'MUDEER' | 'USTHAD' }>>(
      `/api/classes/mentors/list${query}`,
      {},
      MOCK_TEACHERS.map((t) => ({ ...t, roleType: 'USTHAD' as const }))
    );
  },

  async createClass(classData: Partial<ClassBatch>): Promise<ClassBatch> {
    return request<ClassBatch>('/api/classes', {
      method: 'POST',
      body: JSON.stringify(classData),
    });
  },

  async updateClass(id: string, updates: Partial<ClassBatch>): Promise<ClassBatch> {
    return request<ClassBatch>(`/api/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteClass(id: string): Promise<void> {
    return request<void>(`/api/classes/${id}`, {
      method: 'DELETE',
    });
  },

  // Attendance
  async getAttendanceSession(classId: string, date: string, sessionHour: number): Promise<AttendanceSession | null> {
    const query = new URLSearchParams({
      classId,
      date,
      sessionHour: String(sessionHour),
    });
    return request<AttendanceSession | null>(`/api/attendance/session?${query.toString()}`);
  },

  async saveAttendanceSession(session: AttendanceSession): Promise<AttendanceSession> {
    return request<AttendanceSession>(
      '/api/attendance/session',
      {
        method: 'POST',
        body: JSON.stringify(session),
      },
      undefined,
      {
        label: `Attendance ${session.date} (Hr ${session.sessionHour})`,
        optimisticReturn: { ...session, submittedAt: new Date().toISOString() },
      }
    );
  },

  async getStudentAttendance(studentId: string): Promise<AttendanceItemRecord[]> {
    return request<AttendanceItemRecord[]>(`/api/attendance/student/${encodeURIComponent(studentId)}`);
  },

  // Hifz
  async getHifzRecords(params: { studentId?: string; recordType?: string } = {}): Promise<HifzRecord[]> {
    const query = new URLSearchParams();
    query.set('limit', '200');
    if (params.studentId) query.set('studentId', params.studentId);
    if (params.recordType) query.set('recordType', params.recordType);

    const url = `/api/hifz${query.toString() ? `?${query.toString()}` : ''}`;
    return request<HifzRecord[]>(url, {}, INITIAL_HIFZ_RECORDS);
  },

  async createHifzRecord(record: Partial<HifzRecord>): Promise<HifzRecord> {
    return request<HifzRecord>(
      '/api/hifz',
      {
        method: 'POST',
        body: JSON.stringify(record),
      },
      undefined,
      {
        label: `Hifz ${record.recordType || 'Record'}`,
        optimisticReturn: {
          id: record.id || `offline_hifz_${Date.now()}`,
          ...record,
        } as HifzRecord,
      }
    );
  },

  // Cloudinary Media Upload
  async uploadMedia(
    file: File,
    folder: 'students' | 'teachers' | 'announcements' | 'institution' | 'events',
    oldPublicId?: string
  ): Promise<{ secure_url: string; public_id: string; optimized_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    if (oldPublicId) formData.append('oldPublicId', oldPublicId);

    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/upload/image', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Cloudinary upload failed');
    }

    const data = await res.json();
    return data.data;
  },

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    return request<Announcement[]>('/api/announcements', {}, MOCK_ANNOUNCEMENTS);
  },

  // Evaluations
  async getEvaluations(): Promise<TeacherEvaluation[]> {
    return request<TeacherEvaluation[]>('/api/evaluations', {}, MOCK_EVALUATIONS);
  },

  async completeEvaluation(evalId: string, ratings: any): Promise<TeacherEvaluation> {
    return request<TeacherEvaluation>(`/api/evaluations/${evalId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ ratings }),
    });
  },

  // Health & Diagnostics
  async getMinimalHealth(): Promise<{ overall: 'green' | 'amber' | 'red'; timestamp: string }> {
    return request('/api/health/minimal', {}, { overall: 'green', timestamp: new Date().toISOString() });
  },

  async getDiagnostics(): Promise<any> {
    const res = await fetch('/api/health/diagnostics');
    const data = await res.json();
    return data.diagnostics;
  },

  async retryConnection(): Promise<any> {
    const token = getAuthToken();
    const res = await fetch('/api/health/retry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    const data = await res.json();
    return data.diagnostics;
  },

  // College Events & Programs
  async getEvents(): Promise<CollegeEvent[]> {
    return request<CollegeEvent[]>('/api/events');
  },

  async createEvent(event: Partial<CollegeEvent>): Promise<CollegeEvent> {
    return request<CollegeEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  },

  async updateEvent(id: string, updates: Partial<CollegeEvent>): Promise<CollegeEvent> {
    return request<CollegeEvent>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteEvent(id: string): Promise<void> {
    return request<void>(`/api/events/${id}`, {
      method: 'DELETE',
    });
  },

  // Timetable & Schedule Slots
  async getTimetable(): Promise<TimetableSlot[]> {
    return request<TimetableSlot[]>('/api/timetable');
  },

  async createTimetableSlot(slot: Partial<TimetableSlot>): Promise<TimetableSlot> {
    return request<TimetableSlot>('/api/timetable', {
      method: 'POST',
      body: JSON.stringify(slot),
    });
  },

  async updateTimetableSlot(id: string, updates: Partial<TimetableSlot>): Promise<TimetableSlot> {
    return request<TimetableSlot>(`/api/timetable/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteTimetableSlot(id: string): Promise<void> {
    return request<void>(`/api/timetable/${id}`, {
      method: 'DELETE',
    });
  },

  // Feedback Management System
  async getFeedbackConfig(campusId?: string): Promise<FeedbackConfig> {
    const query = campusId ? `?campusId=${encodeURIComponent(campusId)}` : '';
    return request<FeedbackConfig>(`/api/feedback/config${query}`);
  },

  async updateFeedbackConfig(payload: {
    isEnabled: boolean;
    term: string;
    description?: string;
    questions: FeedbackConfig['questions'];
  }): Promise<FeedbackConfig> {
    return request<FeedbackConfig>('/api/feedback/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getMyFeedbackStatus(): Promise<MyFeedbackStatusResponse> {
    return request<MyFeedbackStatusResponse>('/api/feedback/my-status');
  },

  async submitFeedback(payload: {
    teacherId: string;
    answers: Array<{ questionId: string; value: string | number | boolean }>;
  }): Promise<FeedbackSubmission> {
    return request<FeedbackSubmission>(
      '/api/feedback/submit',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      undefined,
      {
        label: 'Faculty feedback submission',
        optimisticReturn: {
          id: `offline_fb_${Date.now()}`,
          campusId: '',
          studentId: '',
          studentName: '',
          classId: '',
          batchName: '',
          teacherId: payload.teacherId,
          teacherName: '',
          facultyDepartment: '',
          term: '',
          answers: [],
          submittedAt: new Date().toISOString(),
        },
      }
    );
  },

  async getFeedbackSubmissions(): Promise<FeedbackSubmission[]> {
    return request<FeedbackSubmission[]>('/api/feedback/submissions');
  },

  async getFeedbackReports(teacherId?: string): Promise<TeacherFeedbackReport[]> {
    const query = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : '';
    return request<TeacherFeedbackReport[]>(`/api/feedback/reports${query}`);
  },

  async saveFeedbackReport(payload: {
    teacherId: string;
    facultyLabel?: string;
    term?: string;
    summaryText: string;
    suggestionsText: string;
  }): Promise<TeacherFeedbackReport> {
    return request<TeacherFeedbackReport>('/api/feedback/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
