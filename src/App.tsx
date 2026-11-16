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
  CollegeEvent,
  TimetableSlot,
  FeedbackConfig,
  MyFeedbackStatusResponse,
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
import { FeedbackManagement } from './components/FeedbackManagement';

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

  const [currentTab, setCurrentTab] = useState<string>(() => {
    const savedId = localStorage.getItem('hyba_auth_user_id');
    if (savedId) {
      return localStorage.getItem(`hyba_active_tab_${savedId}`) || 'dashboard';
    }
    return 'dashboard';
  });

  useEffect(() => {
    if (isAuthenticated && currentUser.id) {
      localStorage.setItem(`hyba_active_tab_${currentUser.id}`, currentTab);
    }
  }, [isAuthenticated, currentUser.id, currentTab]);
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
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [feedbackConfig, setFeedbackConfig] = useState<FeedbackConfig | null>(null);
  const [myFeedbackStatus, setMyFeedbackStatus] = useState<MyFeedbackStatusResponse | null>(null);
  const [allowStudentProfileEdit, setAllowStudentProfileEdit] = useState<boolean>(false);

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
        let resolvedRole = currentUser.role;
        let resolvedCampusId = currentUser.campusId;

        if (getAuthToken()) {
          try {
            const me = await api.getCurrentUser();
            if (isMounted && me) {
              resolvedRole = me.role;
              resolvedCampusId = me.campusId;
              setCurrentUser((prev) => {
                const sameClasses =
                  JSON.stringify(prev.assignedClassIds || []) ===
                  JSON.stringify(me.assignedClassIds || []);
                const sameLinked =
                  JSON.stringify(prev.linkedStudentIds || []) ===
                  JSON.stringify(me.linkedStudentIds || []);
                if (
                  prev.id === me.id &&
                  prev.role === me.role &&
                  prev.campusId === me.campusId &&
                  prev.studentId === me.studentId &&
                  prev.mustChangePassword === me.mustChangePassword &&
                  prev.email === me.email &&
                  prev.phone === me.phone &&
                  prev.avatar === me.avatar &&
                  sameClasses &&
                  sameLinked
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
          loadedEvents,
          loadedTimetable,
          loadedFeedbackCfg,
          loadedProfileEditPerm,
        ] = await Promise.all([
          api.getStudents(),
          api.getTeachers(),
          api.getClasses(),
          api.getHifzRecords(),
          api.getEvaluations(),
          api.getAnnouncements(),
          api.getCampuses(),
          api.getEvents().catch(() => []),
          api.getTimetable().catch(() => []),
          api.getFeedbackConfig().catch(() => null),
          api.getStudentProfileEditPermission().catch(() => null),
        ]);

        if (isMounted) {
          if (Array.isArray(loadedStudents)) setStudents(loadedStudents);
          if (Array.isArray(loadedTeachers)) setTeachers(loadedTeachers);
          if (Array.isArray(loadedClasses)) setClasses(loadedClasses);
          if (Array.isArray(loadedHifz)) setHifzRecords(loadedHifz);
          if (Array.isArray(loadedEvals)) setEvaluations(loadedEvals);
          if (Array.isArray(loadedAnnouncements)) setAnnouncements(loadedAnnouncements);
          if (Array.isArray(loadedCampuses)) setCampuses(loadedCampuses);
          if (Array.isArray(loadedEvents)) setEvents(loadedEvents);
          if (Array.isArray(loadedTimetable)) setTimetableSlots(loadedTimetable);
          if (loadedFeedbackCfg) setFeedbackConfig(loadedFeedbackCfg);

          if (loadedProfileEditPerm && typeof loadedProfileEditPerm.allowStudentProfileEdit === 'boolean') {
            setAllowStudentProfileEdit(loadedProfileEditPerm.allowStudentProfileEdit);
          } else if (Array.isArray(loadedCampuses)) {
            const matchedCampus = loadedCampuses.find((c) => c.id === resolvedCampusId);
            if (matchedCampus && typeof matchedCampus.allowStudentProfileEdit === 'boolean') {
              setAllowStudentProfileEdit(matchedCampus.allowStudentProfileEdit);
            }
          }
        }

        if (resolvedRole === 'STUDENT') {
          try {
            const st = await api.getMyFeedbackStatus();
            if (isMounted && st) {
              setMyFeedbackStatus(st);
              if (st.isEnabled && st.requiresSubmission) {
                setIsFeedbackOpen(true);
              } else if (!st.isEnabled) {
                setIsFeedbackOpen(false);
              }
            }
          } catch (fbErr) {
            console.warn('[HYBA] Could not load student feedback status:', fbErr);
          }
        } else if (isMounted) {
          setMyFeedbackStatus(null);
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
      onEventCreated: (newEv: CollegeEvent) => {
        setEvents((prev) => [newEv, ...prev.filter((e) => e.id !== newEv.id)]);
      },
      onEventUpdated: (updatedEv: CollegeEvent) => {
        setEvents((prev) => prev.map((e) => (e.id === updatedEv.id ? updatedEv : e)));
      },
      onEventDeleted: (payload: { id: string }) => {
        setEvents((prev) => prev.filter((e) => e.id !== payload.id));
      },
      onTimetableUpdated: () => {
        api
          .getTimetable()
          .then((latest) => {
            if (isMounted && Array.isArray(latest)) setTimetableSlots(latest);
          })
          .catch(() => {});
      },
      onFeedbackConfigUpdated: (cfg: FeedbackConfig) => {
        if (!isMounted) return;
        setFeedbackConfig(cfg);
        if (currentUser.role === 'STUDENT') {
          if (!cfg.isEnabled) {
            setIsFeedbackOpen(false);
            setMyFeedbackStatus((prev) =>
              prev
                ? {
                    ...prev,
                    isEnabled: false,
                    requiresSubmission: false,
                    questions: [],
                    pendingTeachers: [],
                  }
                : null
            );
          } else {
            api
              .getMyFeedbackStatus()
              .then((st) => {
                if (!isMounted || !st) return;
                setMyFeedbackStatus(st);
                if (st.isEnabled && st.requiresSubmission) {
                  setIsFeedbackOpen(true);
                }
              })
              .catch(() => {});
          }
        }
      },
      onStudentProfilePermissionUpdated: (data) => {
        if (!isMounted) return;
        if (!data.campusId || !currentUser.campusId || data.campusId === currentUser.campusId) {
          setAllowStudentProfileEdit(Boolean(data.allowStudentProfileEdit));
        }
        if (data.campusId) {
          setCampuses((prev) =>
            prev.map((c) =>
              c.id === data.campusId
                ? { ...c, allowStudentProfileEdit: Boolean(data.allowStudentProfileEdit) }
                : c
            )
          );
        }
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
    localStorage.setItem(`hyba_active_tab_${user.id}`, 'dashboard');
  };

  const handleLogout = () => {
    if (currentUser.id) {
      localStorage.removeItem(`hyba_active_tab_${currentUser.id}`);
    }
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
    const created = await api.createHifzRecord(newRecord);
    const resolved = created && created.id ? created : newRecord;
    setHifzRecords((prev) => [
      resolved,
      ...prev.filter((r) => r.id !== resolved.id && r.id !== newRecord.id),
    ]);
  };

  const handleSaveAttendanceSession = async (session: AttendanceSession): Promise<AttendanceSession> => {
    const saved = await api.saveAttendanceSession(session);
    const resolved = saved || session;
    setAttendanceSession(resolved);
    api
      .getStudents()
      .then((latest) => {
        if (Array.isArray(latest)) setStudents(latest);
      })
      .catch(() => {});
    return resolved;
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
    if (currentUser.role === 'STUDENT' && currentUser.studentId === updated.id) {
      setCurrentUser((prev) => ({
        ...prev,
        fullName: updated.fullName || prev.fullName,
        arabicName: updated.arabicName ?? prev.arabicName,
        email: updated.email ?? prev.email,
        phone: updated.phone ?? prev.phone,
        avatar: updated.photo !== undefined ? updated.photo : prev.avatar,
      }));
    }
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
              feedbackEnabled={Boolean(feedbackConfig?.isEnabled)}
              onNavigate={setCurrentTab}
              onOpenAttendance={() => setCurrentTab('attendance')}
              onOpenAddHifz={() => setIsAddHifzOpen(true)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenFeedback={() => setCurrentTab('feedback')}
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
          const studentFeedbackEnabled = Boolean(
            myFeedbackStatus?.isEnabled ?? feedbackConfig?.isEnabled
          );
          return (
            <StudentDashboard
              currentUser={currentUser}
              student={studentObj}
              classes={scopedClasses}
              records={scopedHifzRecords}
              evaluations={evaluations}
              events={events}
              announcements={announcements}
              timetableSlots={timetableSlots}
              feedbackEnabled={studentFeedbackEnabled}
              feedbackPendingCount={myFeedbackStatus?.pendingTeachers?.length ?? 0}
              allowStudentProfileEdit={allowStudentProfileEdit}
              onOpenIdCard={() => handleOpenIdCard(studentObj)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenFeedback={() => {
                if (studentFeedbackEnabled) setIsFeedbackOpen(true);
              }}
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
              timetableSlots={timetableSlots}
              onOpenIdCard={handleOpenIdCard}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenChangePassword={() => setIsChangePasswordOpen(true)}
              onNavigate={setCurrentTab}
            />
          );
        }

      case 'campuses':
        // Campus creation & multi-campus registry belongs strictly to HYBA_SUPER_ADMIN
        return null;

      case 'attendance':
        if (currentUser.role === 'STUDENT') {
          const studentObj =
            scopedStudents.find((s) => s.id === currentUser.studentId) ||
            scopedStudents[0] ||
            MOCK_STUDENTS[4];
          const studentFeedbackEnabled = Boolean(
            myFeedbackStatus?.isEnabled ?? feedbackConfig?.isEnabled
          );
          return (
            <StudentDashboard
              currentUser={currentUser}
              student={studentObj}
              classes={scopedClasses}
              records={scopedHifzRecords}
              evaluations={evaluations}
              events={events}
              announcements={announcements}
              timetableSlots={timetableSlots}
              feedbackEnabled={studentFeedbackEnabled}
              feedbackPendingCount={myFeedbackStatus?.pendingTeachers?.length ?? 0}
              allowStudentProfileEdit={allowStudentProfileEdit}
              initialPortalTab="attendance"
              onOpenIdCard={() => handleOpenIdCard(studentObj)}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenFeedback={() => {
                if (studentFeedbackEnabled) setIsFeedbackOpen(true);
              }}
              onOpenChangePassword={() => setIsChangePasswordOpen(true)}
              onNavigate={setCurrentTab}
              onStudentUpdated={handleStudentUpdated}
            />
          );
        }
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
            allowStudentProfileEdit={allowStudentProfileEdit}
            onProfileEditPermissionChanged={(enabled) => {
              setAllowStudentProfileEdit(enabled);
              setCampuses((prev) =>
                prev.map((c) =>
                  c.id === (assignedCampus?.id || currentUser.campusId)
                    ? { ...c, allowStudentProfileEdit: enabled }
                    : c
                )
              );
            }}
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
        return (
          <EventsModule
            currentUser={currentUser}
            events={events}
            onEventsChanged={setEvents}
          />
        );

      case 'feedback':
        if (currentUser.role !== 'MUDEER') {
          return null;
        }
        return (
          <FeedbackManagement
            currentUser={currentUser}
            teachers={scopedTeachers}
            classes={scopedClasses}
            config={feedbackConfig}
            onConfigUpdated={(cfg) => setFeedbackConfig(cfg)}
          />
        );

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

  const navFeedbackEnabled =
    currentUser.role === 'STUDENT'
      ? Boolean(myFeedbackStatus?.isEnabled ?? feedbackConfig?.isEnabled)
      : Boolean(feedbackConfig?.isEnabled ?? true);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased overflow-x-hidden">
      <Navbar
        currentUser={currentUser}
        assignedCampus={assignedCampus}
        currentTab={currentTab}
        feedbackEnabled={navFeedbackEnabled}
        onTabChange={setCurrentTab}
        onOpenAttendance={() => setCurrentTab('attendance')}
        onOpenAddHifz={() => {
          if (currentUser.role === 'MUDEER' || currentUser.role === 'USTHAD') {
            setIsAddHifzOpen(true);
          }
        }}
        onOpenIdCard={() => handleOpenIdCard()}
        onOpenTimetable={() => setIsTimetableOpen(true)}
        onOpenFeedback={() => {
          if (currentUser.role === 'MUDEER') {
            setCurrentTab('feedback');
          } else if (navFeedbackEnabled) {
            setIsFeedbackOpen(true);
          }
        }}
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
        slots={timetableSlots}
        onTimetableChanged={setTimetableSlots}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        currentUser={currentUser}
        feedbackStatus={myFeedbackStatus}
        isMandatory={Boolean(
          currentUser.role === 'STUDENT' &&
            myFeedbackStatus?.isEnabled &&
            myFeedbackStatus?.requiresSubmission
        )}
        onSubmitted={async () => {
          if (currentUser.role === 'STUDENT') {
            const st = await api.getMyFeedbackStatus().catch(() => null);
            if (st) setMyFeedbackStatus(st);
          }
        }}
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
