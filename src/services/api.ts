import {
  UserProfile,
  Student,
  Teacher,
  ClassBatch,
  Campus,
  HifzRecord,
  AttendanceSession,
  TeacherEvaluation,
  Announcement,
  CollegeEvent,
  TimetableSlot,
} from '../types';
import {
  MOCK_USERS,
  MOCK_STUDENTS,
  MOCK_TEACHERS,
  MOCK_CLASSES,
  INITIAL_HIFZ_RECORDS,
  INITIAL_ATTENDANCE_SESSION,
  MOCK_ANNOUNCEMENTS,
  MOCK_EVALUATIONS,
} from '../data/mockData';

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

// Helper for fetch with auth headers
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackData?: T
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return data.data !== undefined ? data.data : data;
  } catch (error: any) {
    console.warn(`[API] Call to ${endpoint} failed:`, error.message);
    if (fallbackData !== undefined) {
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
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }

    const data = await res.json();
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  async switchUser(userId: string): Promise<{ token: string; user: UserProfile }> {
    const res = await fetch('/api/auth/switch-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to switch profile');
    }
    const data = await res.json();
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const res = await request<{ user: UserProfile }>('/api/auth/me');
      return res.user || null;
    } catch {
      return null;
    }
  },

  // Students
  async getStudents(params: { classId?: string; search?: string } = {}): Promise<Student[]> {
    const query = new URLSearchParams();
    if (params.classId) query.set('classId', params.classId);
    if (params.search) query.set('search', params.search);

    const url = `/api/students${query.toString() ? `?${query.toString()}` : ''}`;
    return request<Student[]>(url, {}, MOCK_STUDENTS);
  },

  async getStudentById(id: string): Promise<Student | null> {
    const fallback = MOCK_STUDENTS.find((s) => s.id === id) || null;
    return request<Student>(`/api/students/${id}`, {}, fallback as any);
  },

  async createStudent(student: Partial<Student>): Promise<Student> {
    return request<Student>('/api/students', {
      method: 'POST',
      body: JSON.stringify(student),
    });
  },

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    return request<Student>(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
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

  // Campuses & Institutions
  async getCampuses(): Promise<Campus[]> {
    return request<Campus[]>('/api/campuses', {}, [
      {
        id: 'campus-main',
        name: 'Markazul Hidayathil Islamiyya Main Campus',
        code: 'MHI-MAIN',
        arabicName: 'مركز الهداية الإسلامية - المقر الرئيسي',
        address: 'Hidaya Nagar, Kombam, Kodakkad (PO), Mannarkkad, Palakkad',
        phone: '+91 4924 222123',
        email: 'hifz@markazulhidaya.edu.in',
        status: 'Active',
        establishedYear: '1994',
        studentCount: 26,
        teacherCount: 3,
        classCount: 3,
      },
    ]);
  },

  async getCampusDetails(id: string): Promise<{ campus: Campus; students: Student[]; teachers: Teacher[]; classes: ClassBatch[] }> {
    return request<{ campus: Campus; students: Student[]; teachers: Teacher[]; classes: ClassBatch[] }>(
      `/api/campuses/${id}/details`
    );
  },

  async createCampus(campus: Partial<Campus>): Promise<Campus> {
    return request<Campus>('/api/campuses', {
      method: 'POST',
      body: JSON.stringify(campus),
    });
  },

  async updateCampus(id: string, updates: Partial<Campus>): Promise<Campus> {
    return request<Campus>(`/api/campuses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
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
    const fallback = INITIAL_ATTENDANCE_SESSION;
    return request<AttendanceSession | null>(
      `/api/attendance/session?classId=${classId}&date=${date}&sessionHour=${sessionHour}`,
      {},
      fallback
    );
  },

  async saveAttendanceSession(session: AttendanceSession): Promise<AttendanceSession> {
    return request<AttendanceSession>('/api/attendance/session', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  },

  // Hifz
  async getHifzRecords(params: { studentId?: string; recordType?: string } = {}): Promise<HifzRecord[]> {
    const query = new URLSearchParams();
    if (params.studentId) query.set('studentId', params.studentId);
    if (params.recordType) query.set('recordType', params.recordType);

    const url = `/api/hifz${query.toString() ? `?${query.toString()}` : ''}`;
    return request<HifzRecord[]>(url, {}, INITIAL_HIFZ_RECORDS);
  },

  async createHifzRecord(record: Partial<HifzRecord>): Promise<HifzRecord> {
    return request<HifzRecord>('/api/hifz', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  // Cloudinary Media Upload
  async uploadMedia(
    file: File,
    folder: 'students' | 'teachers' | 'announcements' | 'institution',
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

  // Health & Diagnostics (Phase 5)
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
};

