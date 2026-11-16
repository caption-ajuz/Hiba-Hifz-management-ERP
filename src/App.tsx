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
import { api, getAuthToken, removeAuthToken } from './services/api';
import { subscribeToRealtimeEvents } from './services/socket';

// Components
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { HybaSuperAdminPortal } from './components/HybaSuperAdminPortal';
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
import { AddHifzRecordModal } from './components/AddHifzRecordModal';
import { StudentIdCardModal } from './components/StudentIdCardModal';
import { TimetableModal } from './components/TimetableModal';
import { FeedbackModal } from './components/FeedbackModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
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
  const [campusManagementAction, setCampusManagementAction] = useState<
    'add' | { type: 'mudeer'; campusId: string } | null
  >(null);

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
  const [isAddHifzOpen, setIsAddHifzOpen] = useState<boolean>(false);
  const [isIdCardOpen, setIsIdCardOpen] = useState<boolean>(false);
  const [idCardStudent, setIdCardStudent] = useState<Student>(MOCK_STUDENTS[4]);
  const [isTimetableOpen, setIsTimetableOpen] = useState<boolean>(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  // Sync authenticated session & load scoped data whenever user/role/campus changes
  useEffect(() => {
    let isMounted = true;

    async function fetchAppData() {
      try {
        if (getAuthToken()) {
          try {
            const me = await api.getCurrentUser();
            if (isMounted && me) {
              setCurrentUser((prev) => {
                const sameClasses =
                  JSON.stringify(prev.assignedClassIds || []) ===
                  JSON.stringify(me.assignedClassIds || []);
                if (
                  prev.id === me.id &&
                  prev.role === me.role &&
                  prev.campusId === me.campusId &&
                  prev.mustChangePassword === me.mustChangePassword &&
                  sameClasses
                ) {
                  return prev;
                }
                return me;
              });
              localStorage.setItem('hyba_auth_user_id', me.id);
            }
          } catch (authErr: any) {
            if (authErr?.status === 401) {
              removeAuthToken();
              localStorage.removeItem('hyba_auth_user_id');
              if (isMounted) setIsAuthenticated(false);
              return;
            }
          }
        }

        const [
          loadedStudents,
          loadedTeachers,
          loadedClasses,
          loadedHifz,
          loadedEvals,
          loadedAnnouncements,
          loadedCampuses,
        ] = await Promise.all([
          api.getStudents(),
          api.getTeachers(),
          api.getClasses(),
          api.getHifzRecords(),
          api.getEvaluations(),
          api.getAnnouncements(),
          api.getCampuses(),
        ]);

        if (isMounted) {
          if (Array.isArray(loadedStudents)) setStudents(loadedStudents);
          if (Array.isArray(loadedTeachers)) setTeachers(loadedTeachers);
          if (Array.isArray(loadedClasses)) setClasses(loadedClasses);
          if (Array.isArray(loadedHifz)) setHifzRecords(loadedHifz);
          if (Array.isArray(loadedEvals)) setEvaluations(loadedEvals);
          if (Array.isArray(loadedAnnouncements)) setAnnouncements(loadedAnnouncements);
          if (Array.isArray(loadedCampuses)) setCampuses(loadedCampuses);
        }
      } catch (err) {
        console.warn('[HYBA Frontend] Offline fallback active:', err);
      }
    }

    if (isAuthenticated) {
      fetchAppData();
    }

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
  }, [isAuthenticated, currentUser.id, currentUser.role, currentUser.campusId]);

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentTab('dashboard');
    setCampusManagementAction(null);
    localStorage.setItem('hyba_auth_user_id', user.id);
  };

  const handleLogout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    setCurrentTab('dashboard');
    setCampusManagementAction(null);
    localStorage.removeItem('hyba_auth_user_id');
  };

  // Defensive client-side campus isolation for Mudeer (mirrors server-side isolation)
  const isMudeer = currentUser.role === 'MUDEER';
  const mudeerCampusId = currentUser.campusId;

  const scopedStudents =
    isMudeer && mudeerCampusId
      ? students.filter((s) => s.campusId === mudeerCampusId)
      : students;
  const scopedTeachers =
    isMudeer && mudeerCampusId
      ? teachers.filter((t) => t.assignedCampusId === mudeerCampusId)
      : teachers;
  const scopedClasses =
    isMudeer && mudeerCampusId
      ? classes.filter((c) => c.campusId === mudeerCampusId)
      : classes;
  const scopedHifzRecords =
    isMudeer && mudeerCampusId
      ? hifzRecords.filter((r) => scopedStudents.some((s) => s.id === r.studentId))
      : hifzRecords;

  const assignedCampus = campuses.find((c) => c.id === currentUser.campusId);

  const handleOpenIdCard = (student?: Student) => {
    if (student) {
      setIdCardStudent(student);
    } else {
      const currentStudentObj =
        scopedStudents.find((s) => s.id === currentUser.studentId) || scopedStudents[0] || MOCK_STUDENTS[4];
      setIdCardStudent(currentStudentObj);
    }
    setIsIdCardOpen(true);
  };

  const handleAddHifzRecord = async (newRecord: HifzRecord) => {
    setHifzRecords((prev) => [newRecord, ...prev]);
    try {
      await api.createHifzRecord(newRecord);
    } catch (err) {
      console.error('[HYBA] Error persisting Hifz record:', err);
    }
  };

  const handleSaveAttendanceSession = async (session: AttendanceSession) => {
    setAttendanceSession(session);
    try {
      await api.saveAttendanceSession(session);
    } catch (err) {
      console.error('[HYBA] Error persisting attendance:', err);
    }
  };

  const refreshRosterAndClasses = async () => {
    try {
      const [latestStudents, latestClasses, latestTeachers] = await Promise.all([
        api.getStudents(),
        api.getClasses(),
        api.getTeachers(),
      ]);
      if (Array.isArray(latestStudents)) setStudents(latestStudents);
      if (Array.isArray(latestClasses)) setClasses(latestClasses);
      if (Array.isArray(latestTeachers)) setTeachers(latestTeachers);
    } catch (err) {
      console.warn('[HYBA] Error refreshing roster/classes:', err);
    }
  };

  const handleAddStudent = async (newStudent: Student) => {
    try {
      const created = await api.createStudent(newStudent);
      const merged = created && created.id ? created : newStudent;
      setStudents((prev) => [...prev.filter((s) => s.id !== merged.id), merged]);
      await refreshRosterAndClasses();
    } catch (err) {
      console.error('[HYBA] Error creating student:', err);
      setStudents((prev) => [...prev, newStudent]);
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

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderMainTabContent = () => {
    // HYBA Super Admin Platform Portal (Strictly separated from Campus Mudeer portal)
    if (currentUser.role === 'HYBA_SUPER_ADMIN') {
      if (currentTab === 'campuses') {
        return (
          <CampusManagement
            currentUser={currentUser}
            students={students}
            teachers={teachers}
            classes={classes}
            initialAction={campusManagementAction}
            onClearInitialAction={() => setCampusManagementAction(null)}
            onCampusesUpdated={(updated) => setCampuses(updated)}
          />
        );
      }
      if (currentTab === 'reports') {
        return <ReportsModule students={students} records={hifzRecords} classes={classes} />;
      }
      return (
        <HybaSuperAdminPortal
          currentUser={currentUser}
          campuses={campuses}
          students={students}
          teachers={teachers}
          classes={classes}
          onNavigate={setCurrentTab}
          onOpenAddCampus={() => {
            setCampusManagementAction('add');
            setCurrentTab('campuses');
          }}
          onManageCampusMudeer={(campus) => {
            setCampusManagementAction({ type: 'mudeer', campusId: campus.id });
            setCurrentTab('campuses');
          }}
        />
      );
    }

    // Mudeer, Usthad, Student, Parent Portals
    switch (currentTab) {
      case 'dashboard':
        if (currentUser.role === 'MUDEER') {
          return (
            <AdminDashboard
              students={scopedStudents}
              teachers={scopedTeachers}
              classes={scopedClasses}
              records={scopedHifzRecords}
              announcements={announcements}
              currentUser={currentUser}
              assignedCampus={assignedCampus}
              onNavigate={setCurrentTab}
              onOpenAttendance={() => setCurrentTab('attendance')}
              onOpenAddHifz={() => setIsAddHifzOpen(true)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenFeedback={() => setIsFeedbackOpen(true)}
              onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            />
          );
        } else if (currentUser.role === 'USTHAD') {
          return (
            <TeacherDashboard
              currentUser={currentUser}
              students={scopedStudents}
              classes={scopedClasses}
              records={scopedHifzRecords}
              onOpenAttendance={() => setCurrentTab('attendance')}
              onOpenAddHifz={() => setIsAddHifzOpen(true)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onNavigate={setCurrentTab}
            />
          );
        } else if (currentUser.role === 'STUDENT') {
          const studentObj =
            scopedStudents.find((s) => s.id === currentUser.studentId) ||
            scopedStudents[0] ||
            MOCK_STUDENTS[4];
          return (
            <StudentDashboard
              currentUser={currentUser}
              student={studentObj}
              classes={scopedClasses}
              records={scopedHifzRecords}
              evaluations={evaluations}
              onOpenIdCard={() => handleOpenIdCard(studentObj)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenFeedback={() => setIsFeedbackOpen(true)}
              onOpenChangePassword={() => setIsChangePasswordOpen(true)}
              onNavigate={setCurrentTab}
              onStudentUpdated={handleStudentUpdated}
            />
          );
        } else {
          return (
            <ParentDashboard
              currentUser={currentUser}
              students={scopedStudents}
              records={scopedHifzRecords}
              onOpenIdCard={handleOpenIdCard}
              onNavigate={setCurrentTab}
            />
          );
        }

      case 'campuses':
        // Campus creation & multi-campus registry belongs strictly to HYBA_SUPER_ADMIN
        return null;

      case 'attendance':
        return (
          <AttendanceModule
            students={scopedStudents}
            classes={scopedClasses}
            currentUser={currentUser}
            initialSession={attendanceSession}
            onSaveSession={handleSaveAttendanceSession}
          />
        );

      case 'hifz':
        return (
          <HifzModule
            records={scopedHifzRecords}
            students={scopedStudents}
            currentUser={currentUser}
            onOpenAddModal={() => {
              if (currentUser.role === 'MUDEER' || currentUser.role === 'USTHAD') {
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
            students={scopedStudents}
            classes={scopedClasses}
            teachers={scopedTeachers}
            currentUser={currentUser}
            assignedCampus={assignedCampus}
            onOpenIdCard={handleOpenIdCard}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleStudentUpdated}
            onDeleteStudent={(id) => setStudents((prev) => prev.filter((s) => s.id !== id))}
            onAddClass={(newC) => setClasses((prev) => [...prev, newC])}
            onRefreshStudents={refreshRosterAndClasses}
          />
        );

      case 'teachers':
        if (currentUser.role !== 'MUDEER') {
          return null;
        }
        return (
          <TeacherManagement
            teachers={scopedTeachers}
            classes={scopedClasses}
            currentUser={currentUser}
            campuses={assignedCampus ? [assignedCampus] : campuses}
            onAddTeacher={(newT) => setTeachers((prev) => [...prev, newT])}
            onRefreshTeachers={refreshRosterAndClasses}
          />
        );

      case 'classes':
        if (currentUser.role === 'PARENT' || currentUser.role === 'STUDENT') {
          return null;
        }
        return (
          <ClassManagement
            classes={scopedClasses}
            teachers={scopedTeachers}
            students={scopedStudents}
            currentUser={currentUser}
            assignedCampus={assignedCampus}
            onAddClass={(newC) => setClasses((prev) => [...prev, newC])}
            onRefreshClasses={refreshRosterAndClasses}
          />
        );

      case 'events':
        return <EventsModule currentUser={currentUser} />;

      case 'reports':
        return (
          <ReportsModule
            students={scopedStudents}
            records={scopedHifzRecords}
            classes={scopedClasses}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased overflow-x-hidden">
      <Navbar
        currentUser={currentUser}
        assignedCampus={assignedCampus}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenAttendance={() => setCurrentTab('attendance')}
        onOpenAddHifz={() => {
          if (currentUser.role === 'MUDEER' || currentUser.role === 'USTHAD') {
            setIsAddHifzOpen(true);
          }
        }}
        onOpenIdCard={() => handleOpenIdCard()}
        onOpenTimetable={() => setIsTimetableOpen(true)}
        onOpenFeedback={() => setIsFeedbackOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        onOpenAddCampus={
          currentUser.role === 'HYBA_SUPER_ADMIN'
            ? () => {
                setCampusManagementAction('add');
                setCurrentTab('campuses');
              }
            : undefined
        }
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16 lg:pb-8">{renderMainTabContent()}</main>

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
                {assignedCampus?.name || INSTITUTION_INFO.name} ({assignedCampus?.arabicName || INSTITUTION_INFO.arabicName})
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
              Sign Out / Lock Session
            </button>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline font-mono">HYBA v1.0</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddHifzRecordModal
        isOpen={isAddHifzOpen}
        onClose={() => setIsAddHifzOpen(false)}
        students={scopedStudents}
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

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
        onPasswordChanged={() =>
          setCurrentUser((prev) => ({ ...prev, mustChangePassword: false }))
        }
      />
    </div>
  );
}
