/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MOCK_USERS,
  MOCK_STUDENTS,
  MOCK_TEACHERS,
  MOCK_CLASSES,
  INITIAL_ATTENDANCE_SESSION,
  INITIAL_HIFZ_RECORDS,
  MOCK_ANNOUNCEMENTS,
  MOCK_EVALUATIONS,
  INSTITUTION_INFO,
} from './data/mockData';
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
} from './types';
import { api, removeAuthToken } from './services/api';
import { subscribeToRealtimeEvents } from './services/socket';

// Components
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { AttendanceModule } from './components/AttendanceModule';
import { HifzModule } from './components/HifzModule';
import { StudentManagement } from './components/StudentManagement';
import { TeacherManagement } from './components/TeacherManagement';
import { ClassManagement } from './components/ClassManagement';
import { CampusManagement } from './components/CampusManagement';
import { ReportsModule } from './components/ReportsModule';
import { EventsModule } from './components/EventsModule';

// Modals
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { AddHifzRecordModal } from './components/AddHifzRecordModal';
import { StudentIdCardModal } from './components/StudentIdCardModal';
import { TimetableModal } from './components/TimetableModal';
import { FeedbackModal } from './components/FeedbackModal';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if user session exists in localStorage
    const savedId = localStorage.getItem('hyba_auth_user_id');
    return Boolean(savedId);
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedId = localStorage.getItem('hyba_auth_user_id');
    if (savedId) {
      const found = Object.values(MOCK_USERS).find((u) => u.id === savedId);
      if (found) return found;
    }
    return MOCK_USERS.admin;
  });

  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Application Data States
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [teachers, setTeachers] = useState<Teacher[]>(MOCK_TEACHERS);
  const [classes, setClasses] = useState<ClassBatch[]>(MOCK_CLASSES);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [hifzRecords, setHifzRecords] = useState<HifzRecord[]>(INITIAL_HIFZ_RECORDS);
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession>(INITIAL_ATTENDANCE_SESSION);
  const [evaluations, setEvaluations] = useState<TeacherEvaluation[]>(MOCK_EVALUATIONS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(MOCK_ANNOUNCEMENTS);

  // Modals state
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState<boolean>(false);
  const [isAddHifzOpen, setIsAddHifzOpen] = useState<boolean>(false);
  const [isIdCardOpen, setIsIdCardOpen] = useState<boolean>(false);
  const [idCardStudent, setIdCardStudent] = useState<Student>(MOCK_STUDENTS[4]); // default to Mohammed Ajash
  const [isTimetableOpen, setIsTimetableOpen] = useState<boolean>(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);

  // Load Data from MongoDB Atlas on authentication and mount
  useEffect(() => {
    let isMounted = true;

    async function fetchAppData() {
      try {
        const [loadedStudents, loadedTeachers, loadedClasses, loadedHifz, loadedEvals, loadedAnnouncements, loadedCampuses] =
          await Promise.all([
            api.getStudents(),
            api.getTeachers(),
            api.getClasses(),
            api.getHifzRecords(),
            api.getEvaluations(),
            api.getAnnouncements(),
            api.getCampuses(),
          ]);

        if (isMounted) {
          if (loadedStudents && loadedStudents.length > 0) setStudents(loadedStudents);
          if (loadedTeachers && loadedTeachers.length > 0) setTeachers(loadedTeachers);
          if (loadedClasses && loadedClasses.length > 0) setClasses(loadedClasses);
          if (loadedHifz && loadedHifz.length > 0) setHifzRecords(loadedHifz);
          if (loadedEvals && loadedEvals.length > 0) setEvaluations(loadedEvals);
          if (loadedAnnouncements && loadedAnnouncements.length > 0) setAnnouncements(loadedAnnouncements);
          if (loadedCampuses && loadedCampuses.length > 0) setCampuses(loadedCampuses);
        }
      } catch (err) {
        console.warn('[HYBA Frontend] Fallback active:', err);
      }
    }

    if (isAuthenticated) {
      fetchAppData();
    }

    // Subscribe to real-time events via Socket.IO (Phase 4)
    const unsubscribe = subscribeToRealtimeEvents({
      onAttendanceUpdated: (data) => {
        setAttendanceSession((prev) => {
          if (prev.classId === data.classId && prev.date === data.date && prev.sessionHour === data.sessionHour) {
            return {
              ...prev,
              records: { ...prev.records, ...data.records },
            };
          }
          return prev;
        });
      },
      onHifzRecordCreated: (newRec) => {
        setHifzRecords((prev) => {
          if (prev.some((r) => r.id === newRec.id)) return prev;
          return [newRec, ...prev];
        });
      },
      onHifzRecordUpdated: (updatedRec) => {
        setHifzRecords((prev) => prev.map((r) => (r.id === updatedRec.id ? updatedRec : r)));
      },
      onStudentUpdated: (updatedStudent) => {
        setStudents((prev) => {
          const idx = prev.findIndex((s) => s.id === updatedStudent.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updatedStudent;
            return next;
          }
          return [...prev, updatedStudent];
        });
      },
      onTeacherUpdated: (updatedTeacher) => {
        setTeachers((prev) => {
          const idx = prev.findIndex((t) => t.id === updatedTeacher.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updatedTeacher;
            return next;
          }
          return [...prev, updatedTeacher];
        });
      },
      onAnnouncementCreated: (newAnn) => {
        setAnnouncements((prev) => [newAnn, ...prev]);
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isAuthenticated]);

  // Handle Login
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentTab('dashboard');
    localStorage.setItem('hyba_auth_user_id', user.id);
  };

  // Handle Logout
  const handleLogout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    localStorage.removeItem('hyba_auth_user_id');
  };

  // Handle Role / Profile Switching
  const handleSelectUser = async (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('hyba_auth_user_id', user.id);
    setCurrentTab('dashboard');
    try {
      await api.switchUser(user.id);
    } catch {
      // Handled seamlessly
    }
  };

  const handleOpenIdCard = (student?: Student) => {
    if (student) {
      setIdCardStudent(student);
    } else {
      const currentStudentObj = students.find((s) => s.id === currentUser.studentId) || students[4];
      setIdCardStudent(currentStudentObj);
    }
    setIsIdCardOpen(true);
  };

  const handleAddHifzRecord = async (newRecord: HifzRecord) => {
    // Optimistic UI update
    setHifzRecords((prev) => [newRecord, ...prev]);
    try {
      await api.createHifzRecord(newRecord);
    } catch (err) {
      console.error('[HYBA] Error persisting Hifz record:', err);
    }
  };

  const handleSaveAttendanceSession = async (session: AttendanceSession) => {
    // Optimistic UI update
    setAttendanceSession(session);
    try {
      await api.saveAttendanceSession(session);
    } catch (err) {
      console.error('[HYBA] Error persisting attendance:', err);
    }
  };

  const handleAddStudent = async (newStudent: Student) => {
    // Optimistic UI update
    setStudents((prev) => [...prev, newStudent]);
    try {
      await api.createStudent(newStudent);
    } catch (err) {
      console.error('[HYBA] Error creating student in MongoDB:', err);
    }
  };

  const handleStudentUpdated = (updated: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleCompleteEvaluation = async (evalId: string, ratings: any) => {
    setEvaluations((prev) =>
      prev.map((e) =>
        e.id === evalId
          ? {
              ...e,
              status: 'Completed',
              ratings: ratings,
            }
          : e
      )
    );
    try {
      await api.completeEvaluation(evalId, ratings);
    } catch (err) {
      console.error('[HYBA] Error completing evaluation:', err);
    }
  };

  // If user is not authenticated, render the dedicated Campus Login Page
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderMainTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        if (currentUser.role === 'SUPER_ADMIN') {
          return (
            <AdminDashboard
              students={students}
              teachers={teachers}
              classes={classes}
              records={hifzRecords}
              announcements={announcements}
              currentUser={currentUser}
              onNavigate={setCurrentTab}
              onOpenAttendance={() => setCurrentTab('attendance')}
              onOpenAddHifz={() => setIsAddHifzOpen(true)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenFeedback={() => setIsFeedbackOpen(true)}
            />
          );
        } else if (currentUser.role === 'USTHAD') {
          return (
            <TeacherDashboard
              currentUser={currentUser}
              students={students}
              classes={classes}
              records={hifzRecords}
              onOpenAttendance={() => setCurrentTab('attendance')}
              onOpenAddHifz={() => setIsAddHifzOpen(true)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onNavigate={setCurrentTab}
            />
          );
        } else if (currentUser.role === 'STUDENT') {
          const studentObj = students.find((s) => s.id === currentUser.studentId) || students[4];
          return (
            <StudentDashboard
              currentUser={currentUser}
              student={studentObj}
              records={hifzRecords}
              evaluations={evaluations}
              onOpenIdCard={() => handleOpenIdCard(studentObj)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenFeedback={() => setIsFeedbackOpen(true)}
              onNavigate={setCurrentTab}
              onStudentUpdated={handleStudentUpdated}
            />
          );
        } else {
          return (
            <ParentDashboard
              currentUser={currentUser}
              students={students}
              records={hifzRecords}
              onOpenIdCard={handleOpenIdCard}
              onNavigate={setCurrentTab}
            />
          );
        }

      case 'campuses':
        if (currentUser.role !== 'SUPER_ADMIN') {
          return null;
        }
        return (
          <CampusManagement
            currentUser={currentUser}
            students={students}
            teachers={teachers}
            classes={classes}
          />
        );

      case 'attendance':
        return (
          <AttendanceModule
            students={students}
            classes={classes}
            currentUser={currentUser}
            initialSession={attendanceSession}
            onSaveSession={handleSaveAttendanceSession}
          />
        );

      case 'hifz':
        return (
          <HifzModule
            records={hifzRecords}
            students={students}
            currentUser={currentUser}
            onOpenAddModal={() => {
              if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'USTHAD') {
                setIsAddHifzOpen(true);
              }
            }}
          />
        );

      case 'students':
        if (currentUser.role === 'PARENT' || currentUser.role === 'STUDENT') {
          return null;
        }
        return (
          <StudentManagement
            students={students}
            classes={classes}
            teachers={teachers}
            currentUser={currentUser}
            onOpenIdCard={handleOpenIdCard}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleStudentUpdated}
            onDeleteStudent={(id) => setStudents((prev) => prev.filter((s) => s.id !== id))}
            onAddClass={(newC) => setClasses((prev) => [...prev, newC])}
            onRefreshStudents={async () => {
              const latest = await api.getStudents();
              if (latest && latest.length > 0) setStudents(latest);
            }}
          />
        );

      case 'teachers':
        if (currentUser.role !== 'SUPER_ADMIN') {
          return null;
        }
        return (
          <TeacherManagement
            teachers={teachers}
            classes={classes}
            currentUser={currentUser}
            campuses={campuses}
            onAddTeacher={(newT) => setTeachers((prev) => [...prev, newT])}
            onRefreshTeachers={async () => {
              const latest = await api.getTeachers();
              if (latest && latest.length > 0) setTeachers(latest);
            }}
          />
        );

      case 'classes':
        if (currentUser.role === 'PARENT' || currentUser.role === 'STUDENT') {
          return null;
        }
        return (
          <ClassManagement
            classes={classes}
            teachers={teachers}
            students={students}
            currentUser={currentUser}
            onAddClass={(newC) => setClasses((prev) => [...prev, newC])}
            onRefreshClasses={async () => {
              const latest = await api.getClasses();
              if (latest && latest.length > 0) setClasses(latest);
            }}
          />
        );

      case 'events':
        return <EventsModule currentUser={currentUser} />;

      case 'reports':
        return (
          <ReportsModule
            students={students}
            records={hifzRecords}
            classes={classes}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased overflow-x-hidden">
      {/* Navbar with mobile bottom bar & top header */}
      <Navbar
        currentUser={currentUser}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenRoleSwitcher={() => setIsRoleSwitcherOpen(true)}
        onOpenAttendance={() => setCurrentTab('attendance')}
        onOpenAddHifz={() => {
          if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'USTHAD') {
            setIsAddHifzOpen(true);
          }
        }}
        onOpenIdCard={() => handleOpenIdCard()}
        onOpenTimetable={() => setIsTimetableOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Viewport Content */}
      <main className="flex-1 pb-16 lg:pb-8">
        {renderMainTabContent()}
      </main>

      {/* Responsive Institutional Footer (Clean, unbloated on mobile) */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 sm:py-8 border-t border-slate-800 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center shrink-0">
              <img
                src={INSTITUTION_INFO.logoUrl}
                alt="Footer Emblem"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="text-white font-bold text-xs sm:text-sm">
                {INSTITUTION_INFO.name} ({INSTITUTION_INFO.arabicName})
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400">
                {INSTITUTION_INFO.shortAddress}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
            <button
              onClick={handleLogout}
              className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
            >
              Log Out to Campus Screen
            </button>
            <span>·</span>
            <button
              onClick={() => setIsRoleSwitcherOpen(true)}
              className="text-slate-300 hover:text-white cursor-pointer"
            >
              Switch Role
            </button>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline font-mono">HYBA v1.0</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RoleSwitcherModal
        isOpen={isRoleSwitcherOpen}
        onClose={() => setIsRoleSwitcherOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        onLogout={handleLogout}
      />

      <AddHifzRecordModal
        isOpen={isAddHifzOpen}
        onClose={() => setIsAddHifzOpen(false)}
        students={students}
        currentUser={currentUser}
        onAddRecord={handleAddHifzRecord}
      />

      <StudentIdCardModal
        isOpen={isIdCardOpen}
        onClose={() => setIsIdCardOpen(false)}
        student={idCardStudent}
      />

      <TimetableModal
        isOpen={isTimetableOpen}
        onClose={() => setIsTimetableOpen(false)}
        currentUser={currentUser}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        currentUser={currentUser}
        evaluations={evaluations}
        onCompleteEvaluation={handleCompleteEvaluation}
      />
    </div>
  );
}
