/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Suspense } from 'react';
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
import {
  loadEncryptedSession,
  saveEncryptedSession,
  updateEncryptedSessionPatch,
  clearEncryptedSession,
  loadPortalSnapshot,
  savePortalSnapshot,
  clearAllPortalCaches,
} from './services/localDb';
import { subscribeToBackgroundRefresh } from './services/offlineSync';
import { checkPlatformBiometricSupport } from './services/webauthn';

// Eager lightweight shell & login components (instant first paint)
import { LoginPage } from './components/LoginPage';
import { AppBootSkeleton, DashboardSkeleton } from './components/pwa/SkeletonLoaders';
import { OfflineSyncIndicator } from './components/pwa/OfflineSyncIndicator';
import { PWAInstallBanner } from './components/pwa/PWAInstallButton';

// Helper for type-safe lazy loading of named component exports
const lazyNamed = <T extends Record<string, any>, K extends keyof T>(
  loader: () => Promise<T>,
  key: K
): React.LazyExoticComponent<T[K]> =>
  React.lazy(() => loader().then((mod) => ({ default: mod[key] })));

// Lazy-loaded Portals & Feature Modules (split into small on-demand chunks)
const Navbar = lazyNamed(() => import('./components/Navbar'), 'Navbar');
const HybaSuperAdminPortal = lazyNamed(() => import('./components/HybaSuperAdminPortal'), 'HybaSuperAdminPortal');
const AdminDashboard = lazyNamed(() => import('./components/AdminDashboard'), 'AdminDashboard');
const TeacherDashboard = lazyNamed(() => import('./components/TeacherDashboard'), 'TeacherDashboard');
const StudentDashboard = lazyNamed(() => import('./components/StudentDashboard'), 'StudentDashboard');
const ParentDashboard = lazyNamed(() => import('./components/ParentDashboard'), 'ParentDashboard');
const AttendanceModule = lazyNamed(() => import('./components/AttendanceModule'), 'AttendanceModule');
const HifzModule = lazyNamed(() => import('./components/HifzModule'), 'HifzModule');
const StudentManagement = lazyNamed(() => import('./components/StudentManagement'), 'StudentManagement');
const TeacherManagement = lazyNamed(() => import('./components/TeacherManagement'), 'TeacherManagement');
const ClassManagement = lazyNamed(() => import('./components/ClassManagement'), 'ClassManagement');
const CampusManagement = lazyNamed(() => import('./components/CampusManagement'), 'CampusManagement');
const ReportsModule = lazyNamed(() => import('./components/ReportsModule'), 'ReportsModule');
const EventsModule = lazyNamed(() => import('./components/EventsModule'), 'EventsModule');
const FeedbackManagement = lazyNamed(() => import('./components/FeedbackManagement'), 'FeedbackManagement');

// Lazy-loaded Modals (only downloaded when opened)
const AddHifzRecordModal = lazyNamed(() => import('./components/AddHifzRecordModal'), 'AddHifzRecordModal');
const StudentIdCardModal = lazyNamed(() => import('./components/StudentIdCardModal'), 'StudentIdCardModal');
const TimetableModal = lazyNamed(() => import('./components/TimetableModal'), 'TimetableModal');
const FeedbackModal = lazyNamed(() => import('./components/FeedbackModal'), 'FeedbackModal');
const ChangePasswordModal = lazyNamed(() => import('./components/ChangePasswordModal'), 'ChangePasswordModal');
const BiometricLockScreen = lazyNamed(() => import('./components/pwa/BiometricLockScreen'), 'BiometricLockScreen');
const BiometricEnrollModal = lazyNamed(() => import('./components/pwa/BiometricEnrollModal'), 'BiometricEnrollModal');
const DeviceAndSecurityModal = lazyNamed(() => import('./components/pwa/DeviceAndSecurityModal'), 'DeviceAndSecurityModal');

type AuthPhase = 'booting' | 'biometric_lock' | 'unauthenticated' | 'authenticated';

export default function App() {
  const [authPhase, setAuthPhase] = useState<AuthPhase>('booting');
  const isAuthenticated = authPhase === 'authenticated';
  const authPhaseRef = useRef<AuthPhase>(authPhase);
  authPhaseRef.current = authPhase;
  const skipNextAuthVerifyRef = useRef<boolean>(false);

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const savedId = localStorage.getItem('hyba_auth_user_id');
    if (savedId) {
      const found = Object.values(MOCK_USERS).find((u) => u.id === savedId);
      if (found) return found;
    }
    return MOCK_USERS.admin;
  });
  const [lockedUser, setLockedUser] = useState<UserProfile | null>(null);
  const [fallbackUsername, setFallbackUsername] = useState<string | undefined>(undefined);
  const [isInitialDataLoading, setIsInitialDataLoading] = useState<boolean>(false);
  const [hasHydratedLocalCache, setHasHydratedLocalCache] = useState<boolean>(false);
  const [bgRefreshTick, setBgRefreshTick] = useState<number>(0);

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
      updateEncryptedSessionPatch({ lastActiveTab: currentTab }).catch(() => {});
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
  const [isBiometricEnrollOpen, setIsBiometricEnrollOpen] = useState<boolean>(false);
  const [isDeviceSettingsOpen, setIsDeviceSettingsOpen] = useState<boolean>(false);

  // Helper to hydrate portal state instantaneously from IndexedDB snapshot
  const hydrateFromLocalCache = async (userId: string, campusId?: string): Promise<boolean> => {
    const snap = await loadPortalSnapshot(userId, campusId);
    if (!snap) return false;
    if (Array.isArray(snap.students)) setStudents(snap.students);
    if (Array.isArray(snap.teachers)) setTeachers(snap.teachers);
    if (Array.isArray(snap.classes)) setClasses(snap.classes);
    if (Array.isArray(snap.campuses)) setCampuses(snap.campuses);
    if (Array.isArray(snap.hifzRecords)) setHifzRecords(snap.hifzRecords);
    if (Array.isArray(snap.evaluations)) setEvaluations(snap.evaluations);
    if (Array.isArray(snap.announcements)) setAnnouncements(snap.announcements);
    if (Array.isArray(snap.events)) setEvents(snap.events);
    if (Array.isArray(snap.timetableSlots)) setTimetableSlots(snap.timetableSlots);
    if (snap.feedbackConfig !== undefined) setFeedbackConfig(snap.feedbackConfig);
    if (snap.myFeedbackStatus !== undefined) setMyFeedbackStatus(snap.myFeedbackStatus);
    if (typeof snap.allowStudentProfileEdit === 'boolean') {
      setAllowStudentProfileEdit(snap.allowStudentProfileEdit);
    }
    setHasHydratedLocalCache(true);
    return true;
  };

  // Boot: Instant Persistent Session Restore + Non-blocking First-Visit Login
  useEffect(() => {
    let active = true;

    async function applyRestoredServerUser(serverUser: UserProfile) {
      if (!active) return;
      skipNextAuthVerifyRef.current = true;
      setCurrentUser(serverUser);
      const restoredTab =
        localStorage.getItem(`hyba_active_tab_${serverUser.id}`) || 'dashboard';
      setCurrentTab(restoredTab);
      localStorage.setItem('hyba_auth_user_id', serverUser.id);
      saveEncryptedSession({
        user: serverUser,
        biometricLockEnabled: Boolean(serverUser.biometricEnabled),
        lastActiveTab: restoredTab,
        updatedAt: Date.now(),
      }).catch(() => {});
      await hydrateFromLocalCache(serverUser.id, serverUser.campusId);
      if (!active) return;

      if (serverUser.biometricEnabled) {
        setLockedUser(serverUser);
        setAuthPhase('biometric_lock');
        return;
      }
      setAuthPhase('authenticated');
    }

    async function bootSession() {
      // 1. Check encrypted IndexedDB session first (instant, works offline)
      const savedSession = await loadEncryptedSession();
      if (!active) return;

      if (savedSession?.user) {
        const cachedUser = savedSession.user;
        setCurrentUser(cachedUser);
        setCurrentTab(
          savedSession.lastActiveTab ||
            localStorage.getItem(`hyba_active_tab_${cachedUser.id}`) ||
            'dashboard'
        );
        localStorage.setItem('hyba_auth_user_id', cachedUser.id);

        // Pre-hydrate cached portal collections immediately for zero-lag transition
        await hydrateFromLocalCache(cachedUser.id, cachedUser.campusId);
        if (!active) return;

        if (savedSession.biometricLockEnabled) {
          setLockedUser(cachedUser);
          setAuthPhase('biometric_lock');
          return;
        }

        setAuthPhase('authenticated');
        return;
      }

      // 2. Check if there are any local hints of an existing session
      const legacyUserId = localStorage.getItem('hyba_auth_user_id');
      const hasToken = Boolean(getAuthToken());

      if (!legacyUserId && !hasToken) {
        // Cold / logged-out visitor: show LoginPage IMMEDIATELY instead of blocking on server cold start
        setAuthPhase('unauthenticated');
        // Quietly check in background if an HttpOnly cookie session is active
        api
          .getCurrentUser(3500)
          .then((serverUser) => {
            if (active && serverUser && authPhaseRef.current === 'unauthenticated') {
              applyRestoredServerUser(serverUser);
            }
          })
          .catch(() => {});
        return;
      }

      // 3. Returning session with local token: verify with short timeout so boot never hangs
      try {
        const serverUser = await api.getCurrentUser(4000);
        if (!active) return;
        if (serverUser) {
          await applyRestoredServerUser(serverUser);
          return;
        }
      } catch {
        // Offline or server waking up
      }

      if (!active) return;

      if (legacyUserId && hasToken) {
        const matchedMock = Object.values(MOCK_USERS).find((u) => u.id === legacyUserId);
        if (matchedMock) {
          setCurrentUser(matchedMock);
          setAuthPhase('authenticated');
          return;
        }
      }

      setAuthPhase('unauthenticated');
    }

    bootSession();

    const unsubRefresh = subscribeToBackgroundRefresh(() => {
      if (active) setBgRefreshTick((t) => t + 1);
    });

    return () => {
      active = false;
      unsubRefresh();
    };
  }, []);

  // Sync authenticated session & load scoped data whenever user/role/campus changes
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isMounted = true;
    let unsubscribeRealtime: (() => void) | null = null;

    async function fetchAppData() {
      // Show smooth skeleton only on cold uncached first load
      const hadCache = hasHydratedLocalCache || (await hydrateFromLocalCache(currentUser.id, currentUser.campusId));
      if (!hadCache && isMounted) {
        setIsInitialDataLoading(true);
      }

      try {
        let resolvedRole = currentUser.role;
        let resolvedCampusId = currentUser.campusId;
        let resolvedUserId = currentUser.id;
        const shouldVerifySession = !skipNextAuthVerifyRef.current;
        skipNextAuthVerifyRef.current = false;

        // Run session verification in parallel with Priority 1 data instead of blocking sequentially
        const verifySessionPromise = shouldVerifySession
          ? api
              .getCurrentUser()
              .then((me) => ({ ok: true as const, me }))
              .catch((authErr: any) => ({ ok: false as const, authErr }))
          : Promise.resolve({ ok: true as const, me: null });

        // Priority 1: Core dashboard data needed for immediate render
        const corePromise = Promise.all([
          api.getStudents(),
          api.getTeachers(),
          api.getClasses(),
          api.getHifzRecords(),
          api.getCampuses(),
          resolvedRole === 'STUDENT' ? api.getMyFeedbackStatus().catch(() => null) : Promise.resolve(null),
        ]);

        // Priority 2: Secondary data fetched concurrently in background (never blocks initial render)
        const secondaryPromise = Promise.all([
          api.getEvaluations().catch(() => null),
          api.getAnnouncements().catch(() => null),
          api.getEvents().catch(() => []),
          api.getTimetable().catch(() => []),
          api.getFeedbackConfig().catch(() => null),
          api.getStudentProfileEditPermission().catch(() => null),
        ]);

        const [
          authResult,
          [loadedStudents, loadedTeachers, loadedClasses, loadedHifz, loadedCampuses, initialStudentFeedback],
        ] = await Promise.all([verifySessionPromise, corePromise]);

        if (!isMounted) return;

        if (!authResult.ok && authResult.authErr?.status === 401 && navigator.onLine) {
          removeAuthToken();
          localStorage.removeItem('hyba_auth_user_id');
          await clearEncryptedSession();
          if (isMounted) setAuthPhase('unauthenticated');
          return;
        }

        if (authResult.ok && authResult.me) {
          const me = authResult.me;
          resolvedRole = me.role;
          resolvedCampusId = me.campusId;
          resolvedUserId = me.id;
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
              prev.biometricEnabled === me.biometricEnabled &&
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
          updateEncryptedSessionPatch({ user: me }).catch(() => {});
        }

        if (Array.isArray(loadedStudents)) setStudents(loadedStudents);
        if (Array.isArray(loadedTeachers)) setTeachers(loadedTeachers);
        if (Array.isArray(loadedClasses)) setClasses(loadedClasses);
        if (Array.isArray(loadedHifz)) setHifzRecords(loadedHifz);
        if (Array.isArray(loadedCampuses)) setCampuses(loadedCampuses);

        let resolvedStudentFeedback: MyFeedbackStatusResponse | null = initialStudentFeedback;
        if (resolvedRole === 'STUDENT') {
          if (resolvedStudentFeedback) {
            setMyFeedbackStatus(resolvedStudentFeedback);
            if (resolvedStudentFeedback.isEnabled && resolvedStudentFeedback.requiresSubmission) {
              setIsFeedbackOpen(true);
            } else if (!resolvedStudentFeedback.isEnabled) {
              setIsFeedbackOpen(false);
            }
          }
        } else {
          setMyFeedbackStatus(null);
        }

        // Unblock UI immediately once Priority 1 core data is ready!
        setIsInitialDataLoading(false);
        setHasHydratedLocalCache(true);

        // Hydrate Priority 2 secondary data in background
        const [
          loadedEvals,
          loadedAnnouncements,
          loadedEvents,
          loadedTimetable,
          loadedFeedbackCfg,
          loadedProfileEditPerm,
        ] = await secondaryPromise;

        if (!isMounted) return;

        let resolvedAllowEdit = allowStudentProfileEdit;

        if (Array.isArray(loadedEvals)) setEvaluations(loadedEvals);
        if (Array.isArray(loadedAnnouncements)) setAnnouncements(loadedAnnouncements);
        if (Array.isArray(loadedEvents)) setEvents(loadedEvents);
        if (Array.isArray(loadedTimetable)) setTimetableSlots(loadedTimetable);
        if (loadedFeedbackCfg) setFeedbackConfig(loadedFeedbackCfg);

        if (loadedProfileEditPerm && typeof loadedProfileEditPerm.allowStudentProfileEdit === 'boolean') {
          resolvedAllowEdit = loadedProfileEditPerm.allowStudentProfileEdit;
          setAllowStudentProfileEdit(resolvedAllowEdit);
        } else if (Array.isArray(loadedCampuses)) {
          const matchedCampus = loadedCampuses.find((c) => c.id === resolvedCampusId);
          if (matchedCampus && typeof matchedCampus.allowStudentProfileEdit === 'boolean') {
            resolvedAllowEdit = matchedCampus.allowStudentProfileEdit;
            setAllowStudentProfileEdit(resolvedAllowEdit);
          }
        }

        // Persist fresh portal snapshot into IndexedDB for instant subsequent loads
        savePortalSnapshot(resolvedUserId, resolvedCampusId, {
          students: Array.isArray(loadedStudents) ? loadedStudents : undefined,
          teachers: Array.isArray(loadedTeachers) ? loadedTeachers : undefined,
          classes: Array.isArray(loadedClasses) ? loadedClasses : undefined,
          campuses: Array.isArray(loadedCampuses) ? loadedCampuses : undefined,
          hifzRecords: Array.isArray(loadedHifz) ? loadedHifz : undefined,
          evaluations: Array.isArray(loadedEvals) ? loadedEvals : undefined,
          announcements: Array.isArray(loadedAnnouncements) ? loadedAnnouncements : undefined,
          events: Array.isArray(loadedEvents) ? loadedEvents : undefined,
          timetableSlots: Array.isArray(loadedTimetable) ? loadedTimetable : undefined,
          feedbackConfig: loadedFeedbackCfg,
          myFeedbackStatus: resolvedStudentFeedback,
          allowStudentProfileEdit: resolvedAllowEdit,
        }).catch(() => {});
      } catch (err) {
        console.warn('[HYBA Frontend] Offline fallback active:', err);
      } finally {
        if (isMounted) setIsInitialDataLoading(false);
      }
    }

    fetchAppData();

    // Dynamically load Socket.IO client only after authentication
    import('./services/socket')
      .then(({ subscribeToRealtimeEvents }) => {
        if (!isMounted) return;
        unsubscribeRealtime = subscribeToRealtimeEvents({
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
            api
              .getStudents()
              .then((latest) => {
                if (isMounted && Array.isArray(latest)) setStudents(latest);
              })
              .catch(() => {});
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
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      unsubscribeRealtime?.();
    };
  }, [isAuthenticated, currentUser.id, currentUser.role, currentUser.campusId, bgRefreshTick]);

  const handleLoginSuccess = async (user: UserProfile, viaBiometric = false) => {
    skipNextAuthVerifyRef.current = true;
    const existingSession = await loadEncryptedSession();
    const isSameUser = existingSession?.user?.id === user.id;
    const preserveBiometric = Boolean(
      viaBiometric || user.biometricEnabled || (isSameUser && existingSession?.biometricLockEnabled)
    );

    setCurrentUser(user);
    setLockedUser(null);
    setFallbackUsername(undefined);
    setCurrentTab('dashboard');
    setCampusManagementAction(null);
    setHasHydratedLocalCache(false);
    localStorage.setItem('hyba_auth_user_id', user.id);
    localStorage.setItem(`hyba_active_tab_${user.id}`, 'dashboard');

    saveEncryptedSession({
      user,
      biometricLockEnabled: preserveBiometric,
      biometricCredentialId: isSameUser ? existingSession?.biometricCredentialId : undefined,
      biometricPromptDismissed: isSameUser ? existingSession?.biometricPromptDismissed : false,
      lastActiveTab: 'dashboard',
      updatedAt: Date.now(),
    }).catch(() => {});

    setAuthPhase('authenticated');

    // After standard username/password login, offer WebAuthn Fingerprint / Face Unlock if device supports it
    if (!viaBiometric && !preserveBiometric) {
      const dismissedKey = `hyba_bio_prompt_dismissed_${user.id}`;
      const wasDismissed = localStorage.getItem(dismissedKey) === '1';
      if (!wasDismissed) {
        checkPlatformBiometricSupport()
          .then((supported) => {
            if (supported) {
              window.setTimeout(() => setIsBiometricEnrollOpen(true), 550);
            }
          })
          .catch(() => {});
      }
    }
  };

  const handleBiometricUnlocked = async (verifiedUser: UserProfile) => {
    skipNextAuthVerifyRef.current = true;
    setCurrentUser(verifiedUser);
    setLockedUser(null);
    setFallbackUsername(undefined);
    localStorage.setItem('hyba_auth_user_id', verifiedUser.id);
    updateEncryptedSessionPatch({
      user: { ...verifiedUser, biometricEnabled: true },
      biometricLockEnabled: true,
    }).catch(() => {});
    setAuthPhase('authenticated');
  };

  const handleLogout = async () => {
    if (currentUser.id) {
      localStorage.removeItem(`hyba_active_tab_${currentUser.id}`);
    }
    await api.logout();
    await clearEncryptedSession();
    await clearAllPortalCaches();
    setLockedUser(null);
    setFallbackUsername(undefined);
    setHasHydratedLocalCache(false);
    setIsBiometricEnrollOpen(false);
    setIsDeviceSettingsOpen(false);
    setAuthPhase('unauthenticated');
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

  if (authPhase === 'booting') {
    return <AppBootSkeleton />;
  }

  if (authPhase === 'biometric_lock' && lockedUser) {
    return (
      <>
        <Suspense fallback={<AppBootSkeleton />}>
          <BiometricLockScreen
            user={lockedUser}
            onUnlocked={handleBiometricUnlocked}
            onUsePasswordFallback={() => {
              setFallbackUsername(lockedUser.username || lockedUser.referenceId || lockedUser.email);
              setAuthPhase('unauthenticated');
            }}
            onSwitchAccount={handleLogout}
          />
        </Suspense>
        <OfflineSyncIndicator />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          initialUsername={fallbackUsername}
          biometricQuickUser={lockedUser}
        />
        <OfflineSyncIndicator />
      </>
    );
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
              classes={scopedClasses}
              teachers={scopedTeachers}
              assignedCampus={assignedCampus}
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
        if (currentUser.role === 'PARENT') {
          return (
            <ParentDashboard
              currentUser={currentUser}
              students={scopedStudents}
              classes={scopedClasses}
              teachers={scopedTeachers}
              assignedCampus={assignedCampus}
              records={scopedHifzRecords}
              timetableSlots={timetableSlots}
              initialPortalTab="attendance"
              onOpenIdCard={handleOpenIdCard}
              onOpenTimetable={() => setIsTimetableOpen(true)}
              onOpenChangePassword={() => setIsChangePasswordOpen(true)}
              onNavigate={setCurrentTab}
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
      <Suspense fallback={<div className="h-16 bg-white border-b border-slate-200/80" />}>
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
          onOpenDeviceSettings={() => setIsDeviceSettingsOpen(true)}
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
      </Suspense>

      <main className="flex-1 pb-16 lg:pb-8">
        {isInitialDataLoading && !hasHydratedLocalCache ? (
          <DashboardSkeleton />
        ) : (
          <Suspense fallback={<DashboardSkeleton />}>{renderMainTabContent()}</Suspense>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 text-xs py-6 sm:py-8 border-t border-slate-800 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center shrink-0">
              <img
                src={INSTITUTION_INFO.logoUrl}
                alt="Footer Emblem"
                loading="lazy"
                decoding="async"
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
              Sign Out
            </button>
          </div>
        </div>
      </footer>

      {/* Lazy-mounted Modals (chunks download only when opened) */}
      <Suspense fallback={null}>
        {isAddHifzOpen && (
          <AddHifzRecordModal
            isOpen={isAddHifzOpen}
            onClose={() => setIsAddHifzOpen(false)}
            students={scopedStudents}
            currentUser={currentUser}
            onAddRecord={handleAddHifzRecord}
          />
        )}

        {isIdCardOpen && (
          <StudentIdCardModal
            isOpen={isIdCardOpen}
            onClose={() => setIsIdCardOpen(false)}
            student={idCardStudent}
          />
        )}

        {isTimetableOpen && (
          <TimetableModal
            isOpen={isTimetableOpen}
            onClose={() => setIsTimetableOpen(false)}
            currentUser={currentUser}
            slots={timetableSlots}
            onTimetableChanged={setTimetableSlots}
          />
        )}

        {isFeedbackOpen && (
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
        )}

        {isChangePasswordOpen && (
          <ChangePasswordModal
            isOpen={isChangePasswordOpen}
            onClose={() => setIsChangePasswordOpen(false)}
            currentUser={currentUser}
            onPasswordChanged={() =>
              setCurrentUser((prev) => ({ ...prev, mustChangePassword: false }))
            }
          />
        )}

        {isBiometricEnrollOpen && (
          <BiometricEnrollModal
            isOpen={isBiometricEnrollOpen}
            user={currentUser}
            onEnrolled={async (credentialID) => {
              setIsBiometricEnrollOpen(false);
              setCurrentUser((prev) => ({ ...prev, biometricEnabled: true }));
              await updateEncryptedSessionPatch({
                biometricLockEnabled: true,
                biometricCredentialId: credentialID,
                biometricPromptDismissed: false,
              });
            }}
            onDismiss={() => {
              setIsBiometricEnrollOpen(false);
              if (currentUser.id) {
                localStorage.setItem(`hyba_bio_prompt_dismissed_${currentUser.id}`, '1');
              }
            }}
          />
        )}

        {isDeviceSettingsOpen && (
          <DeviceAndSecurityModal
            isOpen={isDeviceSettingsOpen}
            onClose={() => setIsDeviceSettingsOpen(false)}
            currentUser={currentUser}
            onBiometricStatusChanged={async (enabled, credentialID) => {
              setCurrentUser((prev) => ({ ...prev, biometricEnabled: enabled }));
              await updateEncryptedSessionPatch({
                biometricLockEnabled: enabled,
                biometricCredentialId: credentialID,
              });
            }}
          />
        )}
      </Suspense>

      <OfflineSyncIndicator />
      <PWAInstallBanner />
    </div>
  );
}
