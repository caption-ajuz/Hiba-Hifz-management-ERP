import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import {
  Student,
  Teacher,
  ClassBatch,
  Campus,
  HifzRecord,
  UserProfile,
  TimetableSlot,
  AttendanceItemRecord,
} from '../types';
import { JUZ_NAMES } from '../data/quranData';
import { DEFAULT_STUDENT_AVATAR, getStudentPhotoSrc } from '../utils/avatarUtils';
import { api } from '../services/api';
import { subscribeToRealtimeEvents } from '../services/socket';
import {
  CalendarCheck,
  BookOpen,
  Phone,
  Clock,
  IdCard,
  CheckCircle2,
  XCircle,
  Ban,
  X,
  User,
  FileText,
  Send,
  Home,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';

interface ParentDashboardProps {
  currentUser: UserProfile;
  students: Student[];
  classes?: ClassBatch[];
  teachers?: Teacher[];
  assignedCampus?: Campus;
  records: HifzRecord[];
  timetableSlots?: TimetableSlot[];
  initialPortalTab?: 'home' | 'attendance' | 'hifz' | 'ward';
  onOpenIdCard: (student: Student) => void;
  onOpenTimetable?: () => void;
  onOpenChangePassword?: () => void;
  onNavigate: (tab: string) => void;
}

const TIMETABLE_DAYS = [
  { id: 'D1', short: 'Sat' },
  { id: 'D2', short: 'Sun' },
  { id: 'D3', short: 'Mon' },
  { id: 'D4', short: 'Tue' },
  { id: 'D5', short: 'Wed' },
];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const HOUR_DEFAULTS: Record<number, { title: string; time: string }> = {
  1: { title: 'Fajr Sabq · New Lesson', time: '07:00 AM - 08:30 AM' },
  2: { title: 'Morning Murajath · Revision', time: '09:00 AM - 10:30 AM' },
  3: { title: 'Tajweed & Makharij Clinic', time: '11:00 AM - 12:30 PM' },
  4: { title: 'Afternoon Manzil Circle', time: '02:00 PM - 04:00 PM' },
  5: { title: 'Oral Testing & Review', time: '04:30 PM - 05:30 PM' },
};

function getMonthYearFromIso(isoDate: string): { month: string; year: string } {
  const parts = String(isoDate || '').split('-');
  const year = parts[0] || String(new Date().getFullYear());
  const monthIdx = Number(parts[1]) - 1;
  const month = MONTH_NAMES[monthIdx] || MONTH_NAMES[new Date().getMonth()];
  return { month, year };
}

function formatDayLabel(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  const dayNum = String(parsed.getDate()).padStart(2, '0');
  const weekday = parsed.toLocaleDateString('en-US', { weekday: 'short' });
  return `${dayNum} ${weekday}`;
}

function dedupeAttendanceItems(items: AttendanceItemRecord[]): AttendanceItemRecord[] {
  const sorted = [...items].sort((a, b) =>
    `${b.date}-${String(b.sessionHour).padStart(2, '0')}`.localeCompare(
      `${a.date}-${String(a.sessionHour).padStart(2, '0')}`
    )
  );
  const map = new Map<string, AttendanceItemRecord>();
  for (const item of sorted) {
    const key = `${item.date}__h${Number(item.sessionHour)}`;
    const existing = map.get(key);
    if (!existing || (existing.status === 'NOT_MARKED' && item.status !== 'NOT_MARKED')) {
      map.set(key, { ...item, sessionHour: Number(item.sessionHour) });
    }
  }
  return Array.from(map.values());
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  currentUser,
  students,
  classes = [],
  teachers = [],
  assignedCampus,
  records,
  timetableSlots = [],
  initialPortalTab = 'home',
  onOpenIdCard,
  onOpenTimetable,
  onOpenChangePassword,
  onNavigate,
}) => {
  const [activeParentTab, setActiveParentTab] = useState<'home' | 'attendance' | 'hifz' | 'ward'>(
    initialPortalTab
  );
  const skipNextTabSyncRef = useRef(false);

  useEffect(() => {
    if (skipNextTabSyncRef.current) {
      skipNextTabSyncRef.current = false;
      return;
    }
    setActiveParentTab(initialPortalTab);
  }, [initialPortalTab]);

  const switchParentTab = (tab: 'home' | 'attendance' | 'hifz' | 'ward') => {
    if (initialPortalTab !== 'home' && tab !== initialPortalTab) {
      skipNextTabSyncRef.current = true;
      onNavigate('dashboard');
    }
    setActiveParentTab(tab);
  };

  // Linked children resolved from user profile or server-scoped students list
  const linkedIds = useMemo(() => {
    if (currentUser.linkedStudentIds && currentUser.linkedStudentIds.length > 0) {
      return currentUser.linkedStudentIds;
    }
    return students.map((s) => s.id);
  }, [currentUser.linkedStudentIds, students]);

  const myChildren = useMemo(() => {
    const matched = students.filter((s) => linkedIds.includes(s.id));
    return matched.length > 0 ? matched : students;
  }, [students, linkedIds]);

  const [selectedChildId, setSelectedChildId] = useState<string>(myChildren[0]?.id || '');

  useEffect(() => {
    if (myChildren.length > 0 && !myChildren.some((c) => c.id === selectedChildId)) {
      setSelectedChildId(myChildren[0].id);
    }
  }, [myChildren, selectedChildId]);

  const selectedChild = myChildren.find((c) => c.id === selectedChildId) || myChildren[0];

  // Resolve real batch, mentor, and campus metadata
  const childBatch = useMemo(
    () => classes.find((c) => c.id === selectedChild?.classId),
    [classes, selectedChild?.classId]
  );

  const childMentor = useMemo(() => {
    if (!selectedChild) return undefined;
    return teachers.find(
      (t) =>
        t.id === selectedChild.assignedTeacherId ||
        t.teacherId === selectedChild.assignedTeacherId ||
        (childBatch && (t.id === childBatch.usthadId || t.teacherId === childBatch.usthadId))
    );
  }, [teachers, selectedChild, childBatch]);

  const mentorName = childMentor?.fullName || 'Assigned Usthad';
  const mentorPhone = childMentor?.phone;
  const campusName = assignedCampus?.name || INSTITUTION_INFO.name;
  const campusPhone = assignedCampus?.phone || INSTITUTION_INFO.phone;

  // Live synced attendance items for selectedChild
  const [attendanceItems, setAttendanceItems] = useState<AttendanceItemRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const fetchChildAttendance = useCallback(async (studentId: string) => {
    if (!studentId) return;
    setAttendanceLoading(true);
    setAttendanceError(null);
    try {
      const items = await api.getStudentAttendance(studentId);
      setAttendanceItems(Array.isArray(items) ? dedupeAttendanceItems(items) : []);
    } catch (err: any) {
      setAttendanceError(err?.message || 'Unable to load attendance records right now.');
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  useEffect(() => {
    const childId = selectedChild?.id;
    const childClassId = selectedChild?.classId;
    if (!childId) {
      setAttendanceItems([]);
      return;
    }

    let active = true;
    setAttendanceLoading(true);
    setAttendanceError(null);

    api
      .getStudentAttendance(childId)
      .then((items) => {
        if (!active) return;
        setAttendanceItems(Array.isArray(items) ? dedupeAttendanceItems(items) : []);
      })
      .catch((err: any) => {
        if (!active) return;
        setAttendanceError(err?.message || 'Unable to load attendance records right now.');
      })
      .finally(() => {
        if (active) setAttendanceLoading(false);
      });

    const unsubscribe = subscribeToRealtimeEvents({
      onAttendanceUpdated: (data: any) => {
        if (!active || !data) return;
        const statusForChild = data.records?.[childId];
        if (statusForChild !== undefined) {
          setAttendanceItems((prev) =>
            dedupeAttendanceItems([
              {
                studentId: childId,
                classId: data.classId || childClassId || '',
                date: data.date,
                sessionHour: Number(data.sessionHour),
                status: statusForChild,
                sessionName: data.sessionName || `Hour ${data.sessionHour}`,
                topic: data.topic || '',
                description: data.description || '',
                markedByName: data.updatedBy || '',
              },
              ...prev,
            ])
          );
          void fetchChildAttendance(childId);
        } else if (data.classId && data.classId === childClassId) {
          void fetchChildAttendance(childId);
        }
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [selectedChild?.id, selectedChild?.classId, fetchChildAttendance]);

  // Derived real attendance calculations
  const todayIso = new Date().toISOString().split('T')[0];
  const todayDateDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const todaySlots = useMemo(() => {
    const todayItems = attendanceItems.filter((i) => i.date === todayIso);
    return [1, 2, 3, 4, 5].map((hour) => {
      const matched = todayItems.find((i) => Number(i.sessionHour) === hour);
      const defaults = HOUR_DEFAULTS[hour];
      const status = matched?.status || 'NOT_MARKED';
      return {
        hour,
        time: defaults.time,
        subjectName: matched?.sessionName || defaults.title,
        faculty: matched?.markedByName || mentorName,
        room: childBatch?.roomNumber || 'Tahfeez Hall',
        status,
        topic:
          [matched?.topic, matched?.description].filter(Boolean).join(' — ') ||
          (status === 'NOT_MARKED' ? 'Session not marked yet.' : 'Session recorded.'),
        date: todayIso,
      };
    });
  }, [attendanceItems, todayIso, mentorName, childBatch?.roomNumber]);

  const markedTodayCount = todaySlots.filter((s) => s.status !== 'NOT_MARKED').length;
  const presentTodayCount = todaySlots.filter(
    (s) => s.status === 'PRESENT' || s.status === 'LATE'
  ).length;

  const markedItems = useMemo(
    () => attendanceItems.filter((i) => i.status !== 'NOT_MARKED'),
    [attendanceItems]
  );
  const presentCount = useMemo(
    () => markedItems.filter((i) => i.status === 'PRESENT' || i.status === 'LATE').length,
    [markedItems]
  );
  const lateCount = useMemo(
    () => markedItems.filter((i) => i.status === 'LATE').length,
    [markedItems]
  );
  const absentCount = useMemo(
    () => markedItems.filter((i) => i.status === 'ABSENT').length,
    [markedItems]
  );
  const cumulativePercentage = useMemo(() => {
    if (markedItems.length > 0) {
      return Math.round((presentCount / markedItems.length) * 1000) / 10;
    }
    return selectedChild?.attendanceRate ?? 100;
  }, [markedItems.length, presentCount, selectedChild?.attendanceRate]);

  // Month selector and daily hourly matrix
  const currentMonthName = MONTH_NAMES[new Date().getMonth()] || 'November';
  const availableMonths = useMemo(() => {
    const dynamic = attendanceItems.map((i) => getMonthYearFromIso(i.date).month);
    const unique = Array.from(new Set([currentMonthName, ...dynamic]));
    return unique.sort((a, b) => MONTH_NAMES.indexOf(a) - MONTH_NAMES.indexOf(b));
  }, [attendanceItems, currentMonthName]);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);

  useEffect(() => {
    if (!availableMonths.includes(selectedMonth) && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  const liveItemMap = useMemo(() => {
    const map = new Map<string, AttendanceItemRecord>();
    attendanceItems.forEach((item) => {
      map.set(`${item.date}__h${Number(item.sessionHour)}`, item);
    });
    return map;
  }, [attendanceItems]);

  const monthMatrixRows = useMemo(() => {
    const byDate = new Map<
      string,
      {
        date: string;
        dayStr: string;
        h1: string;
        h2: string;
        h3: string;
        h4: string;
        h5: string;
      }
    >();

    attendanceItems.forEach((item) => {
      if (getMonthYearFromIso(item.date).month !== selectedMonth) return;
      let row = byDate.get(item.date);
      if (!row) {
        row = {
          date: item.date,
          dayStr: formatDayLabel(item.date),
          h1: 'NOT_MARKED',
          h2: 'NOT_MARKED',
          h3: 'NOT_MARKED',
          h4: 'NOT_MARKED',
          h5: 'NOT_MARKED',
        };
        byDate.set(item.date, row);
      }
      const hr = Number(item.sessionHour);
      if (hr === 1) row.h1 = item.status;
      else if (hr === 2) row.h2 = item.status;
      else if (hr === 3) row.h3 = item.status;
      else if (hr === 4) row.h4 = item.status;
      else if (hr === 5) row.h5 = item.status;
    });

    return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceItems, selectedMonth]);

  // Dynamic monthly summary aggregated from real attendanceItems
  const monthlySummaryRows = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; year: string; month: string; monthIdx: number; recorded: number; present: number; absent: number }
    >();
    markedItems.forEach((item) => {
      const { month, year } = getMonthYearFromIso(item.date);
      const monthIdx = MONTH_NAMES.indexOf(month);
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const existing = groups.get(key) || {
        key,
        year,
        month,
        monthIdx,
        recorded: 0,
        present: 0,
        absent: 0,
      };
      existing.recorded += 1;
      if (item.status === 'PRESENT' || item.status === 'LATE') {
        existing.present += 1;
      } else if (item.status === 'ABSENT') {
        existing.absent += 1;
      }
      groups.set(key, existing);
    });

    return Array.from(groups.values())
      .sort((a, b) => b.key.localeCompare(a.key))
      .map((g) => ({
        ...g,
        percentage: g.recorded > 0 ? Math.round((g.present / g.recorded) * 1000) / 10 : 0,
      }));
  }, [markedItems]);

  // Hifz data for selected ward
  const childRecords = selectedChild ? records.filter((r) => r.studentId === selectedChild.id) : [];
  const latestSabq = childRecords.find((r) => r.recordType === 'SABQ');
  const latestMurajath = childRecords.find((r) => r.recordType === 'MURAJATH');
  const latestManzil = childRecords.find((r) => r.recordType === 'MANZIL');

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isContactUsthadOpen, setIsContactUsthadOpen] = useState(false);
  const [selectedPeriodDetail, setSelectedPeriodDetail] = useState<any | null>(null);

  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState(todayIso);
  const [leaveEndDate, setLeaveEndDate] = useState(todayIso);
  const [leaveType, setLeaveType] = useState('Medical / Illness');
  const [leaveSubmitted, setLeaveSubmitted] = useState(false);

  const completedJuzCount = selectedChild?.completedJuzList?.length || 0;
  const progressPercent = Math.round((completedJuzCount / 30) * 100);
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<string>('D1');

  const childDayTimetable = useMemo(() => {
    const daySlots = timetableSlots.filter((s) => s.day === selectedTimetableDay);
    const matching = daySlots.filter(
      (s) => !s.classId || !selectedChild?.classId || s.classId === selectedChild.classId
    );
    const list = matching.length > 0 ? matching : daySlots;
    return [...list].sort((a, b) => Number(a.slotNumber || 0) - Number(b.slotNumber || 0));
  }, [timetableSlots, selectedTimetableDay, selectedChild?.classId]);

  const renderDonutChart = (percentage: number, size = 96, strokeWidth = 8) => {
    const clamped = Math.max(0, Math.min(100, percentage));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clamped / 100) * circumference;

    let strokeColor = '#10b981';
    if (clamped < 75) {
      strokeColor = '#f59e0b';
    }

    return (
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-extrabold text-slate-800 font-mono tracking-tighter tabular-nums">
            {clamped.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  const renderMatrixStatusIcon = (status: string, date: string, hourNum: number) => {
    const liveItem = liveItemMap.get(`${date}__h${hourNum}`);
    const defaults = HOUR_DEFAULTS[hourNum];

    const openDetail = () => {
      setSelectedPeriodDetail({
        hour: hourNum,
        time: defaults.time,
        subjectName: liveItem?.sessionName || defaults.title,
        faculty: liveItem?.markedByName || mentorName,
        room: childBatch?.roomNumber || 'Tahfeez Hall',
        status: liveItem?.status || status,
        topic:
          [liveItem?.topic, liveItem?.description].filter(Boolean).join(' — ') ||
          (status === 'NOT_MARKED' ? 'Session not marked yet.' : 'Session recorded.'),
        date,
      });
    };

    switch (status) {
      case 'PRESENT':
        return (
          <button
            type="button"
            onClick={openDetail}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-400 text-emerald-600 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
            title="Present"
          >
            <CheckCircle2 className="w-4 h-4 fill-emerald-500 text-white" />
          </button>
        );
      case 'ABSENT':
        return (
          <button
            type="button"
            onClick={openDetail}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-400 text-rose-600 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
            title="Absent"
          >
            <XCircle className="w-4 h-4 fill-rose-500 text-white" />
          </button>
        );
      case 'LATE':
        return (
          <button
            type="button"
            onClick={openDetail}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-400 text-amber-600 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
            title="Late"
          >
            <Clock className="w-4 h-4 text-amber-600" />
          </button>
        );
      default:
        return (
          <button
            type="button"
            onClick={openDetail}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
            title="Not Marked"
          >
            <Ban className="w-3.5 h-3.5 text-slate-400" />
          </button>
        );
    }
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveSubmitted(true);
    setTimeout(() => {
      setLeaveSubmitted(false);
      setIsLeaveModalOpen(false);
      setLeaveReason('');
    }, 2000);
  };

  if (!selectedChild) {
    return (
      <div className="min-h-screen bg-slate-50/70 flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm shadow-xs space-y-2">
          <div className="text-sm font-bold text-slate-900">No Linked Ward Found</div>
          <p className="text-xs text-slate-500">
            Contact campus administration to link your ward to this parent account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-28">
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4 sm:space-y-5">
        {currentUser.mustChangePassword && onOpenChangePassword && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-start gap-2.5 text-xs text-amber-950">
              <KeyRound className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Update Default Password</div>
                <div className="text-[11px] text-amber-800">
                  Set a custom password for your parent account.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shrink-0 cursor-pointer self-start sm:self-center"
            >
              Change Password
            </button>
          </div>
        )}

        {/* Top Parent Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm ring-2 ring-emerald-100 bg-emerald-50 shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Parent
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {currentUser.phone || campusName}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsContactUsthadOpen(true)}
            className="w-10 h-10 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Contact Mentor"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>

        {/* Ward Switcher (Multiple Children) */}
        {myChildren.length > 1 && (
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-2xs flex items-center gap-1.5">
            {myChildren.map((child) => {
              const isSelected = selectedChild.id === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <img
                    src={getStudentPhotoSrc(child.photo)}
                    alt={child.fullName}
                    className="w-5 h-5 rounded-full object-cover bg-slate-100"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_STUDENT_AVATAR;
                    }}
                  />
                  <span className="text-xs truncate">{child.fullName.split(' ')[0]}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Juz {child.currentJuz}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 text-xs sm:text-sm font-semibold">
          {[
            { id: 'home', label: 'Overview' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'hifz', label: 'Quran Hifz' },
            { id: 'ward', label: 'Ward Details' },
          ].map((tab) => {
            const isActive = activeParentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => switchParentTab(tab.id as any)}
                className={`flex-1 py-2.5 text-center transition-colors relative cursor-pointer ${
                  isActive ? 'text-emerald-800 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-emerald-600 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* ===================== TAB 1: OVERVIEW ===================== */}
        {activeParentTab === 'home' && (
          <div className="space-y-4">
            {/* Ward Identity Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={getStudentPhotoSrc(selectedChild.photo)}
                  alt={selectedChild.fullName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-2xs bg-slate-100 shrink-0"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_STUDENT_AVATAR;
                  }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {selectedChild.fullName}
                    </h2>
                    {selectedChild.arabicName && (
                      <span className="text-xs font-arabic text-emerald-800 hidden sm:inline shrink-0">
                        {selectedChild.arabicName}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Roll #{selectedChild.rollNumber} · Adm: {selectedChild.admissionNumber}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold truncate">
                    {childBatch?.name || selectedChild.classId}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenIdCard(selectedChild)}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-bold border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <IdCard className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Virtual ID</span>
              </button>
            </div>

            {/* Today's Live Attendance Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Today's Attendance
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{todayDateDisplay}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold border tabular-nums ${
                    markedTodayCount === 0
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : presentTodayCount === markedTodayCount
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {markedTodayCount > 0 ? `${presentTodayCount}/${markedTodayCount} Present` : 'Pending'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-1">
                {todaySlots.map((slot) => {
                  const isPresent = slot.status === 'PRESENT';
                  const isAbsent = slot.status === 'ABSENT';
                  const isLate = slot.status === 'LATE';
                  const circleCls = isPresent
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                    : isAbsent
                    ? 'border-rose-500 bg-rose-500 text-white shadow-sm'
                    : isLate
                    ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-300';

                  return (
                    <button
                      key={slot.hour}
                      type="button"
                      onClick={() => setSelectedPeriodDetail(slot)}
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${circleCls}`}
                      title={`Hour ${slot.hour}: ${slot.subjectName} (${slot.status})`}
                    >
                      <span className="text-xs font-bold leading-none">{slot.hour} hr</span>
                      <span className="text-[9px] font-semibold mt-0.5 opacity-90">
                        {isPresent ? 'P' : isAbsent ? 'A' : isLate ? 'L' : '--'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  {markedTodayCount > 0
                    ? `${presentTodayCount} of ${markedTodayCount} marked sessions attended today.`
                    : 'No sessions marked for today yet.'}
                </span>
                <button
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Leave Slip</span>
                </button>
              </div>
            </div>

            {/* Cumulative Attendance Overview Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Attendance Overview
                </h3>
                <button
                  onClick={() => switchParentTab('attendance')}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Full Log →
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5 text-xs font-mono tabular-nums">
                  <div className="text-slate-600">
                    Recorded Sessions: <strong>{markedItems.length}</strong>
                  </div>
                  <div className="text-emerald-700">
                    Present / Late: <strong>{presentCount}</strong>
                  </div>
                  <div className="text-rose-700">
                    Absent: <strong>{absentCount}</strong>
                  </div>
                </div>

                <div onClick={() => switchParentTab('attendance')} className="cursor-pointer">
                  {renderDonutChart(cumulativePercentage, 96, 9)}
                </div>
              </div>

              {markedItems.length > 0 && cumulativePercentage < 75 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Attendance is currently <strong>{cumulativePercentage.toFixed(1)}%</strong> (below 75% threshold).
                  </span>
                </div>
              )}
            </div>

            {/* Ward's Daily Timetable */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Daily Timetable</h3>
                {onOpenTimetable && (
                  <button
                    type="button"
                    onClick={onOpenTimetable}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer shrink-0"
                  >
                    Full Schedule →
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {TIMETABLE_DAYS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedTimetableDay(d.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      selectedTimetableDay === d.id
                        ? 'bg-emerald-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>

              {childDayTimetable.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 text-center">
                  No sessions scheduled for this day.
                </div>
              ) : (
                <div className="space-y-2">
                  {childDayTimetable.map((slot) => (
                    <div
                      key={slot.id}
                      className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-[11px] font-bold text-emerald-800 tabular-nums">
                          Period {slot.slotNumber} · {slot.time}
                        </div>
                        <div className="font-bold text-slate-900 truncate mt-0.5">{slot.title}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {slot.mentor} · {slot.room}
                        </div>
                      </div>
                      {slot.tag && (
                        <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                          {slot.tag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quran Hifz Progress Summary */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Quran Memorization
                  </h3>
                  <p className="text-xs text-slate-500">Mentor: {mentorName}</p>
                </div>
                <button
                  onClick={() => switchParentTab('hifz')}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Details →
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-emerald-900">Juz {selectedChild.currentJuz} Active Sabq</span>
                  <span className="text-slate-700">
                    {completedJuzCount}/30 Juz ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {latestSabq && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950">Latest Sabq ({latestSabq.date})</span>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      {latestSabq.status}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    Surah {latestSabq.surahName} (Ayah {latestSabq.startAyah}–{latestSabq.endAyah})
                  </div>
                  {latestSabq.teacherRemarks && (
                    <p className="text-slate-600 italic text-[11px]">"{latestSabq.teacherRemarks}"</p>
                  )}
                </div>
              )}
            </div>

            {/* Quick Shortcuts */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-3 transition-colors text-left cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Leave Slip</div>
                  <div className="text-[10px] text-slate-400">Notify mentor</div>
                </div>
              </button>

              <button
                onClick={() => setIsContactUsthadOpen(true)}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-3 transition-colors text-left cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">Contact Mentor</div>
                  <div className="text-[10px] text-slate-400 truncate">{mentorName}</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: LIVE ATTENDANCE ===================== */}
        {activeParentTab === 'attendance' && (
          <div className="space-y-4 animate-fade-in">
            {/* Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {selectedChild.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {childBatch?.name || selectedChild.classId} · {mentorName}
                  </p>
                </div>
                {renderDonutChart(cumulativePercentage, 76, 7)}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Marked</div>
                  <div className="text-sm font-extrabold font-mono text-slate-900 tabular-nums">
                    {markedItems.length}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <div className="text-[10px] text-emerald-700 font-semibold uppercase">Present</div>
                  <div className="text-sm font-extrabold font-mono text-emerald-800 tabular-nums">
                    {presentCount - lateCount}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                  <div className="text-[10px] text-amber-700 font-semibold uppercase">Late</div>
                  <div className="text-sm font-extrabold font-mono text-amber-800 tabular-nums">
                    {lateCount}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-100">
                  <div className="text-[10px] text-rose-700 font-semibold uppercase">Absent</div>
                  <div className="text-sm font-extrabold font-mono text-rose-800 tabular-nums">
                    {absentCount}
                  </div>
                </div>
              </div>
            </div>

            {attendanceError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
                <span>{attendanceError}</span>
                <button
                  type="button"
                  onClick={() => void fetchChildAttendance(selectedChild.id)}
                  className="px-2.5 py-1 bg-white border border-rose-200 rounded-lg font-bold text-rose-700 cursor-pointer shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Month Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {availableMonths.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMonth(m)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedMonth === m
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Daily Hourly Matrix (H1-H5) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-6 p-3 bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-600 text-center">
                <div className="text-left pl-2">Date</div>
                <div>H1</div>
                <div>H2</div>
                <div>H3</div>
                <div>H4</div>
                <div>H5</div>
              </div>

              {attendanceLoading && attendanceItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Loading attendance records...
                </div>
              ) : monthMatrixRows.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {monthMatrixRows.map((row) => (
                    <div
                      key={row.date}
                      className="grid grid-cols-6 items-center p-2.5 text-center hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="text-left pl-2 text-xs font-semibold text-slate-800 font-mono">
                        {row.dayStr}
                      </div>
                      <div className="flex justify-center">{renderMatrixStatusIcon(row.h1, row.date, 1)}</div>
                      <div className="flex justify-center">{renderMatrixStatusIcon(row.h2, row.date, 2)}</div>
                      <div className="flex justify-center">{renderMatrixStatusIcon(row.h3, row.date, 3)}</div>
                      <div className="flex justify-center">{renderMatrixStatusIcon(row.h4, row.date, 4)}</div>
                      <div className="flex justify-center">{renderMatrixStatusIcon(row.h5, row.date, 5)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  No attendance recorded for {selectedMonth} yet.
                </div>
              )}
            </div>

            {/* Monthly Breakdown Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-700">
                Monthly Attendance Summary
              </div>
              {monthlySummaryRows.length > 0 ? (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3 text-right">Present</th>
                      <th className="py-2.5 px-3 text-right">Absent</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlySummaryRows.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {row.month} {row.year}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700 tabular-nums">
                          {row.present}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-700 tabular-nums">
                          {row.absent}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                          {row.recorded}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {row.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-5 text-center text-xs text-slate-400">
                  Monthly totals will appear once sessions are recorded by the Usthad.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 3: QURAN HIFZ TRACKER ===================== */}
        {activeParentTab === 'hifz' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">30-Juz Memorization</h3>
                  <p className="text-xs text-slate-500">{completedJuzCount} of 30 Juz Verified</p>
                </div>
                <span className="text-sm font-extrabold font-mono text-emerald-800 tabular-nums">
                  {progressPercent}%
                </span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 pt-2">
                {JUZ_NAMES.map((j) => {
                  const isCompleted = selectedChild.completedJuzList.includes(j.juz);
                  const isCurrent = selectedChild.currentJuz === j.juz && !isCompleted;
                  return (
                    <div
                      key={j.juz}
                      className={`py-2 px-1 rounded-xl text-center font-mono text-xs font-bold transition-all ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : isCurrent
                          ? 'bg-amber-500 text-white ring-2 ring-amber-400'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                      title={`Juz ${j.juz}: ${j.arabicName}`}
                    >
                      {j.juz}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              {latestSabq && (
                <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-xs space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-emerald-950">
                    <span>Sabq (السبق)</span>
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                      {latestSabq.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Surah {latestSabq.surahName} (Ayah {latestSabq.startAyah}–{latestSabq.endAyah})
                  </div>
                  {latestSabq.teacherRemarks && (
                    <p className="text-slate-600 italic">"{latestSabq.teacherRemarks}"</p>
                  )}
                </div>
              )}

              {latestMurajath && (
                <div className="bg-white p-4 rounded-3xl border border-teal-200 shadow-xs space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-teal-950">
                    <span>Murajath (المراجعة)</span>
                    <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">
                      {latestMurajath.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Surah {latestMurajath.surahName} (Ayah {latestMurajath.startAyah}–{latestMurajath.endAyah})
                  </div>
                  {latestMurajath.teacherRemarks && (
                    <p className="text-slate-600 italic">"{latestMurajath.teacherRemarks}"</p>
                  )}
                </div>
              )}

              {latestManzil && (
                <div className="bg-white p-4 rounded-3xl border border-sky-200 shadow-xs space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-sky-950">
                    <span>Manzil (المنزل)</span>
                    <span className="bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">
                      {latestManzil.status}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Juz {latestManzil.juzNumber} ({latestManzil.surahRangeText})
                  </div>
                  {latestManzil.teacherRemarks && (
                    <p className="text-slate-600 italic">"{latestManzil.teacherRemarks}"</p>
                  )}
                </div>
              )}

              {childRecords.length === 0 && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 text-xs text-slate-500 text-center">
                  No Hifz recitation logs recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 4: WARD DETAILS ===================== */}
        {activeParentTab === 'ward' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ward Enrolment
              </h3>
              <div className="space-y-2.5 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Student Name</span>
                  <span className="font-bold text-slate-900">{selectedChild.fullName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Admission Number</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedChild.admissionNumber}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Roll Number</span>
                  <span className="font-mono font-bold text-slate-900">
                    #{selectedChild.rollNumber}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Campus</span>
                  <span className="font-semibold text-slate-800">{campusName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Batch</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {childBatch?.name || selectedChild.classId}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Mentor Usthad</span>
                  <span className="font-bold text-emerald-800">{mentorName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Date of Birth</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedChild.dateOfBirth || '—'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => onOpenIdCard(selectedChild)}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <IdCard className="w-4 h-4" />
                  <span>View Student ID Card</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Guardian on Record
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Guardian Name</span>
                  <span className="font-bold text-slate-900">
                    {selectedChild.parentName || currentUser.fullName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Registered Mobile</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedChild.parentPhone || currentUser.phone}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Email</span>
                  <span className="font-semibold text-slate-800">
                    {selectedChild.parentEmail || currentUser.email}
                  </span>
                </div>
                {selectedChild.address && (
                  <div className="pt-1 space-y-1">
                    <span className="text-slate-400">Address</span>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                      {selectedChild.address}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM NAVIGATION BAR FOR PARENTS */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-4 py-2">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            onClick={() => switchParentTab('home')}
            className="flex flex-col items-center justify-center cursor-pointer group"
          >
            <div
              className={`px-4 py-1 rounded-full transition-colors ${
                activeParentTab === 'home'
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'text-slate-500 group-hover:text-slate-800'
              }`}
            >
              <Home className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 font-medium ${
                activeParentTab === 'home' ? 'text-slate-900 font-bold' : 'text-slate-500'
              }`}
            >
              Overview
            </span>
          </button>

          <button
            onClick={() => switchParentTab('attendance')}
            className="flex flex-col items-center justify-center cursor-pointer group"
          >
            <div
              className={`px-4 py-1 rounded-full transition-colors ${
                activeParentTab === 'attendance'
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'text-slate-500 group-hover:text-slate-800'
              }`}
            >
              <CalendarCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 font-medium ${
                activeParentTab === 'attendance' ? 'text-slate-900 font-bold' : 'text-slate-500'
              }`}
            >
              Attendance
            </span>
          </button>

          <button
            onClick={() => switchParentTab('hifz')}
            className="flex flex-col items-center justify-center cursor-pointer group"
          >
            <div
              className={`px-4 py-1 rounded-full transition-colors ${
                activeParentTab === 'hifz'
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'text-slate-500 group-hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 font-medium ${
                activeParentTab === 'hifz' ? 'text-slate-900 font-bold' : 'text-slate-500'
              }`}
            >
              Hifz
            </span>
          </button>

          <button
            onClick={() => switchParentTab('ward')}
            className="flex flex-col items-center justify-center cursor-pointer group"
          >
            <div
              className={`px-4 py-1 rounded-full transition-colors ${
                activeParentTab === 'ward'
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'text-slate-500 group-hover:text-slate-800'
              }`}
            >
              <User className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 font-medium ${
                activeParentTab === 'ward' ? 'text-slate-900 font-bold' : 'text-slate-500'
              }`}
            >
              Ward Profile
            </span>
          </button>
        </div>
      </div>

      {/* PARENT LEAVE SLIP MODAL */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Leave Slip</div>
                  <div className="text-[11px] text-slate-500">{selectedChild.fullName}</div>
                </div>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {leaveSubmitted ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Leave Slip Sent</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {mentorName} has been notified.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleLeaveSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Reason Type</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option>Medical / Illness</option>
                      <option>Family / Personal</option>
                      <option>Academic Event</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">From Date</label>
                      <input
                        type="date"
                        value={leaveStartDate}
                        onChange={(e) => setLeaveStartDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">To Date</label>
                      <input
                        type="date"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Note</label>
                    <textarea
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      rows={3}
                      placeholder="Enter reason for absence..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLeaveModalOpen(false)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTACT MENTOR MODAL */}
      {isContactUsthadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Campus Contacts</h3>
              <button
                onClick={() => setIsContactUsthadOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{mentorName}</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {childBatch?.name || 'Assigned Mentor'}
                  </div>
                </div>
                {mentorPhone && (
                  <a
                    href={`tel:${mentorPhone.replace(/\s+/g, '')}`}
                    className="px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1 shadow-2xs shrink-0"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </a>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{campusName}</div>
                  <div className="text-[10px] text-slate-500">Campus Office</div>
                </div>
                {campusPhone && (
                  <a
                    href={`tel:${campusPhone.replace(/\s+/g, '')}`}
                    className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1 shadow-2xs shrink-0"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </a>
                )}
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setIsContactUsthadOpen(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERIOD DETAIL MODAL */}
      {selectedPeriodDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-900 font-mono">
                Hour {selectedPeriodDetail.hour} · {selectedPeriodDetail.date}
              </div>
              <button
                onClick={() => setSelectedPeriodDetail(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="font-extrabold text-slate-900">
                {selectedPeriodDetail.subjectName}
              </div>
              <div className="text-slate-500">Mentor: {selectedPeriodDetail.faculty}</div>
              <div className="text-slate-500">Time: {selectedPeriodDetail.time}</div>
              {selectedPeriodDetail.topic && (
                <div className="text-slate-600 pt-1">{selectedPeriodDetail.topic}</div>
              )}
              <div className="pt-1 text-[11px] font-bold flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    selectedPeriodDetail.status === 'PRESENT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedPeriodDetail.status === 'ABSENT'
                      ? 'bg-rose-100 text-rose-800'
                      : selectedPeriodDetail.status === 'LATE'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {selectedPeriodDetail.status === 'NOT_MARKED'
                    ? 'Not Marked'
                    : selectedPeriodDetail.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPeriodDetail(null)}
              className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
