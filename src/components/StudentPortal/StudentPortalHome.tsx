import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Plus,
  ArrowRight,
  Megaphone,
  Calendar,
  MapPin,
  MessageSquare,
} from 'lucide-react';
import {
  STUDENT_PROFILE_DATA,
  TODAY_ATTENDANCE_HOURS,
  ALL_FAVORITES_OPTIONS,
} from '../../data/studentPortalData';
import {
  Announcement,
  AttendanceItemRecord,
  CollegeEvent,
  Student,
  TimetableSlot,
  UserProfile,
} from '../../types';
import { DEFAULT_STUDENT_AVATAR, getStudentPhotoSrc } from '../../utils/avatarUtils';

interface StudentPortalHomeProps {
  student?: Student;
  currentUser?: UserProfile;
  attendanceItems?: AttendanceItemRecord[];
  events?: CollegeEvent[];
  announcements?: Announcement[];
  timetableSlots?: TimetableSlot[];
  feedbackEnabled?: boolean;
  feedbackPendingCount?: number;
  onOpenAttendance: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onOpenFavoritesCustomizer: () => void;
  onOpenPeriodDetail: (period: any) => void;
  onOpenTimetable: () => void;
  onOpenIdCard: () => void;
  onOpenDutyLeave: () => void;
  onOpenHifz: () => void;
  onOpenFeedback: () => void;
  onNavigateEvents?: () => void;
  pinnedFavoriteIds: string[];
}

const TIMETABLE_DAYS = [
  { id: 'D1', short: 'Sat' },
  { id: 'D2', short: 'Sun' },
  { id: 'D3', short: 'Mon' },
  { id: 'D4', short: 'Tue' },
  { id: 'D5', short: 'Wed' },
];

export const StudentPortalHome: React.FC<StudentPortalHomeProps> = ({
  student,
  currentUser,
  attendanceItems = [],
  events = [],
  announcements = [],
  timetableSlots = [],
  feedbackEnabled = false,
  feedbackPendingCount = 0,
  onOpenAttendance,
  onOpenProfile,
  onOpenNotifications,
  onOpenFavoritesCustomizer,
  onOpenPeriodDetail,
  onOpenTimetable,
  onOpenIdCard,
  onOpenDutyLeave,
  onOpenHifz,
  onOpenFeedback,
  onNavigateEvents,
  pinnedFavoriteIds,
}) => {
  const displayName = student?.fullName || currentUser?.fullName || STUDENT_PROFILE_DATA.fullName;
  const displayAdmNo =
    student?.admissionNumber || currentUser?.referenceId || STUDENT_PROFILE_DATA.admissionNo;
  const displayAvatar = getStudentPhotoSrc(
    student?.photo || currentUser?.avatar || STUDENT_PROFILE_DATA.avatarUrl
  );
  const [semesterView, setSemesterView] = useState<number>(6);
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<string>('D1');

  const todayIso = new Date().toISOString().split('T')[0];
  const todayDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
  });

  // Map today's real attendance records to the 5 circular hour indicators
  const todaySlots = useMemo(() => {
    const todayItems = attendanceItems.filter((item) => item.date === todayIso);
    return TODAY_ATTENDANCE_HOURS.map((baseSlot) => {
      const matched = todayItems.find((item) => Number(item.sessionHour) === baseSlot.hour);
      const status = matched?.status || 'NOT_MARKED';
      const topicText = matched
        ? [matched.topic, matched.description].filter(Boolean).join(' — ') || baseSlot.topic
        : 'Attendance has not been marked for this hour yet.';

      return {
        ...baseSlot,
        status,
        subjectName: matched?.sessionName || baseSlot.subjectName,
        faculty: matched?.markedByName || baseSlot.faculty,
        topic: topicText,
        date: todayIso,
      };
    });
  }, [attendanceItems, todayIso]);

  const presentTodayCount = todaySlots.filter(
    (s) => s.status === 'PRESENT' || s.status === 'LATE'
  ).length;
  const markedTodayCount = todaySlots.filter((s) => s.status !== 'NOT_MARKED').length;

  // Live timetable slots filtered for student's class & selected day
  const dayScheduleSlots = useMemo(() => {
    const daySlots = timetableSlots.filter((s) => s.day === selectedScheduleDay);
    const matched = daySlots.filter(
      (s) => !s.classId || !student?.classId || s.classId === student.classId
    );
    const pool = matched.length > 0 ? matched : daySlots;
    return [...pool].sort((a, b) => Number(a.slotNumber || 0) - Number(b.slotNumber || 0));
  }, [timetableSlots, selectedScheduleDay, student?.classId]);

  // Visible student events (ALL or STUDENTS)
  const visibleEvents = useMemo(
    () =>
      events.filter(
        (ev) => !ev.targetAudience || ev.targetAudience === 'ALL' || ev.targetAudience === 'STUDENTS'
      ),
    [events]
  );

  // Clean favorite IDs (never show feedback when disabled, ignore legacy removed IDs)
  const visibleFavoriteIds = useMemo(() => {
    const allowedIds = new Set(
      ALL_FAVORITES_OPTIONS.filter((opt) => feedbackEnabled || opt.id !== 'fav_feedback').map(
        (opt) => opt.id
      )
    );
    return pinnedFavoriteIds.filter((id) => allowedIds.has(id));
  }, [pinnedFavoriteIds, feedbackEnabled]);

  const renderMiniDonut = (percentage: number, size = 96, strokeWidth = 8) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let strokeColor = '#10b981';
    if (percentage === 0) {
      strokeColor = '#e2e8f0';
    } else if (percentage < 75) {
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
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  const handleLaunchFavorite = (id: string) => {
    switch (id) {
      case 'fav_attendance':
        onOpenAttendance();
        break;
      case 'fav_virtual_id':
        onOpenIdCard();
        break;
      case 'fav_hifz':
        onOpenHifz();
        break;
      case 'fav_leave':
        onOpenDutyLeave();
        break;
      case 'fav_feedback':
        if (feedbackEnabled) onOpenFeedback();
        break;
      default:
        break;
    }
  };

  const markedItems = attendanceItems.filter((item) => item.status !== 'NOT_MARKED');
  const sem6LiveTotal = markedItems.length;
  const sem6LivePresent = markedItems.filter(
    (item) => item.status === 'PRESENT' || item.status === 'LATE'
  ).length;
  const sem6LivePct =
    markedItems.length > 0 ? (sem6LivePresent / sem6LiveTotal) * 100 : student?.attendanceRate ?? 0;

  const semTotalHours = semesterView === 5 ? 66.0 : sem6LiveTotal;
  const semHoursPresent = semesterView === 5 ? 38.5 : sem6LivePresent;
  const semPercentage = semesterView === 5 ? 58.3 : sem6LivePct;
  const hasUnreadAlerts = visibleEvents.length > 0 || announcements.length > 0;

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4 sm:space-y-5 pb-28">
      {/* 1. TOP HEADER */}
      <div className="flex items-center justify-between pt-1 pb-1">
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm ring-2 ring-slate-100 group-hover:ring-emerald-300 transition-all bg-slate-100 shrink-0">
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_STUDENT_AVATAR;
              }}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors uppercase">
                {displayName}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500 text-white shrink-0" />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Admission No : {displayAdmNo}
            </div>
          </div>
        </button>

        {/* Notification Bell Button */}
        <button
          onClick={onOpenNotifications}
          className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors relative cursor-pointer"
          title="Notifications & Upcoming Events"
        >
          <Bell className="w-5 h-5" />
          {hasUnreadAlerts && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white tabular-nums">
              {visibleEvents.length + announcements.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Feedback Prompt (only when Mudir enabled feedback) */}
      {feedbackEnabled && feedbackPendingCount > 0 && (
        <div className="bg-emerald-950 text-white rounded-3xl p-4 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-800 text-emerald-200 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold">Faculty Feedback Requested by Mudir</div>
              <div className="text-[11px] text-emerald-200 mt-0.5">
                {feedbackPendingCount}{' '}
                {feedbackPendingCount === 1 ? 'teacher evaluation' : 'teacher evaluations'}{' '}
                pending submission.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenFeedback}
            className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs rounded-xl shrink-0 cursor-pointer"
          >
            Submit Now
          </button>
        </div>
      )}

      {/* 3. TODAY'S ATTENDANCE CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Today's Attendance
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{todayDateString}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-mono font-bold border tabular-nums ${
              presentTodayCount > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : markedTodayCount > 0
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {presentTodayCount}/5
          </span>
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-1">
          {todaySlots.map((slot) => {
            let circleStyle =
              'border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 text-slate-700';
            if (slot.status === 'PRESENT') {
              circleStyle =
                'border-emerald-600 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm';
            } else if (slot.status === 'ABSENT') {
              circleStyle =
                'border-rose-600 bg-rose-500 hover:bg-rose-600 text-white shadow-sm';
            } else if (slot.status === 'LATE') {
              circleStyle =
                'border-amber-500 bg-amber-500 hover:bg-amber-600 text-white shadow-sm';
            }

            return (
              <button
                key={slot.hour}
                type="button"
                data-status={slot.status}
                onClick={() => onOpenPeriodDetail(slot)}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs ${circleStyle}`}
                title={`Period ${slot.hour}: ${slot.subjectName} — ${slot.status}`}
              >
                <span className="text-xs sm:text-sm font-bold leading-none">
                  {slot.hour} hr
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Present
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Absent
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Late
            </span>
          </div>
          <span className="text-slate-400">Tap hour for details</span>
        </div>
      </div>

      {/* 4. FAVORITES CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Quick Shortcuts</h2>
          <button
            onClick={onOpenFavoritesCustomizer}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Customize
          </button>
        </div>

        <button
          onClick={onOpenFavoritesCustomizer}
          className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-200 flex items-center gap-3 transition-colors text-left cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors shrink-0 shadow-2xs">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-slate-700">
              Pin favorite shortcuts
            </span>
          </div>
        </button>

        {visibleFavoriteIds.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
            {visibleFavoriteIds.map((id) => {
              const item = ALL_FAVORITES_OPTIONS.find((f) => f.id === id);
              if (!item) return null;

              return (
                <button
                  key={id}
                  onClick={() => handleLaunchFavorite(id)}
                  className="p-2.5 rounded-2xl border border-slate-200/90 hover:border-emerald-300 bg-white hover:bg-slate-50 flex flex-col items-center text-center transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                    {item.title.charAt(0)}
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-800 mt-1 truncate max-w-full">
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. LIVE TIMETABLE SCHEDULE CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Class Timetable
            </h2>
          </div>
          <button
            onClick={onOpenTimetable}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer shrink-0"
          >
            Weekly Schedule →
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {TIMETABLE_DAYS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedScheduleDay(d.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedScheduleDay === d.id
                  ? 'bg-emerald-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d.short}
            </button>
          ))}
        </div>

        {dayScheduleSlots.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 text-center">
            No classes scheduled for this day yet.
          </div>
        ) : (
          <div className="space-y-2.5 pt-1">
            {dayScheduleSlots.map((slot) => (
              <div
                key={slot.id}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-1"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono font-semibold text-emerald-800 tabular-nums">
                  <span>
                    Period {slot.slotNumber} · {slot.time}
                  </span>
                  {slot.tag && <span className="text-slate-500 font-sans">{slot.tag}</span>}
                </div>
                <div className="text-sm font-bold text-slate-900">{slot.title}</div>
                <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{slot.room}</span>
                  <span>·</span>
                  <span className="truncate">{slot.mentor}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. SEMESTER WISE ATTENDANCE CARD */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Semester Wise Attendance
          </h2>
          <button
            onClick={onOpenAttendance}
            className="text-xs font-bold text-slate-800 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>See All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Semester {semesterView}</div>
              <div className="text-xs text-slate-400 font-medium">
                {semesterView === 6 ? 'Current Semester' : 'Odd Semester'}
              </div>
            </div>

            <div className="space-y-1 pt-1 text-xs font-mono tabular-nums">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-3 rounded-full bg-slate-300" />
                <span>
                  Total Hours: <strong>{semTotalHours.toFixed(1)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-3 rounded-full bg-emerald-700" />
                <span>
                  Hours Present: <strong>{semHoursPresent.toFixed(1)}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 pt-1">
              {[5, 6].map((s) => (
                <button
                  key={s}
                  onClick={() => setSemesterView(s)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    semesterView === s
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Sem {s}
                </button>
              ))}
            </div>
          </div>

          <div onClick={onOpenAttendance} className="cursor-pointer group">
            {renderMiniDonut(semPercentage, 100, 9)}
          </div>
        </div>
      </div>

      {/* 7. NOTICE BOARD */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Notice Board</h2>
          <button
            onClick={onOpenNotifications}
            className="text-xs font-bold text-slate-800 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>See All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {announcements.length > 0 ? (
          <div className="space-y-2.5">
            {announcements.slice(0, 2).map((ann) => (
              <div
                key={ann.id}
                className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">{ann.title}</span>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">{ann.date}</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">No Active Notices</div>
            </div>
          </div>
        )}
      </div>

      {/* 8. LIVE COLLEGE EVENTS & PROGRAMS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Events & Programs</h2>
          <button
            onClick={() => (onNavigateEvents ? onNavigateEvents() : onOpenNotifications())}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>See All ({visibleEvents.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {visibleEvents.length > 0 ? (
          <div className="space-y-3">
            {visibleEvents.slice(0, 3).map((ev) => (
              <div
                key={ev.id}
                onClick={() => onNavigateEvents?.()}
                className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/40 border border-slate-200 transition-colors cursor-pointer flex gap-3 items-start"
              >
                {ev.posterUrl ? (
                  <img
                    src={ev.posterUrl}
                    alt={ev.title}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
                    <span className="font-sans font-bold text-emerald-800">{ev.category}</span>
                    <span>
                      {ev.startDate}
                      {ev.startTime ? ` · ${ev.startTime}` : ''}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {ev.title}
                  </div>
                  {ev.arabicTitle && (
                    <div dir="rtl" className="text-xs font-arabic text-emerald-800 truncate">
                      {ev.arabicTitle}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span className="truncate">{ev.venue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">No Upcoming Events</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
