import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import { Student, ClassBatch, HifzRecord, UserProfile, TeacherFeedbackReport } from '../types';
import { getUsthadEffectiveClassIds, sortBatchesWithPriority } from '../utils/batchUtils';
import { DEFAULT_STUDENT_AVATAR, getStudentPhotoSrc } from '../utils/avatarUtils';
import { api } from '../services/api';
import { subscribeToRealtimeEvents } from '../services/socket';
import {
  CalendarCheck,
  AlertTriangle,
  Clock,
  ChevronRight,
  Plus,
  MessageSquare,
} from 'lucide-react';

interface TeacherDashboardProps {
  currentUser: UserProfile;
  students: Student[];
  classes: ClassBatch[];
  records: HifzRecord[];
  onOpenAttendance: () => void;
  onOpenAddHifz: () => void;
  onOpenTimetable: () => void;
  onNavigate: (tab: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  students,
  classes,
  records,
  onOpenAttendance,
  onOpenAddHifz,
  onOpenTimetable,
  onNavigate,
}) => {
  // Dynamically resolved assigned batches and students
  const assignedBatchIds = useMemo(
    () => getUsthadEffectiveClassIds(currentUser, classes),
    [currentUser, classes]
  );
  const assignedBatches = useMemo(
    () => sortBatchesWithPriority(classes.filter((c) => assignedBatchIds.includes(c.id))),
    [classes, assignedBatchIds]
  );
  const primaryBatchId = assignedBatches[0]?.id || '';
  const assignedBatchLabel =
    assignedBatches.length > 0
      ? assignedBatches.map((b) => b.name.split('(')[0].trim()).join(' & ')
      : 'Assigned Batches';

  const myStudents = students.filter(
    (s) =>
      assignedBatchIds.includes(s.classId) ||
      s.assignedTeacherId === currentUser.id ||
      (currentUser.referenceId && s.assignedTeacherId === currentUser.referenceId)
  );

  // Students with revision required in their recent records
  const studentsNeedingRevision = records
    .filter((r) => r.status === 'Revision Required')
    .map((r) => myStudents.find((s) => s.id === r.studentId))
    .filter((s): s is Student => Boolean(s));

  // Today's saved attendance summary across assigned batches
  const todayIso = new Date().toISOString().split('T')[0];
  const [todayMarkedHours, setTodayMarkedHours] = useState<number[]>([]);
  const [todayAttendanceRate, setTodayAttendanceRate] = useState<number | null>(null);

  const loadTodayAttendanceSummary = useCallback(async () => {
    if (!primaryBatchId) {
      setTodayMarkedHours((prev) => (prev.length === 0 ? prev : []));
      setTodayAttendanceRate((prev) => (prev === null ? prev : null));
      return;
    }

    try {
      const results = await Promise.all(
        [1, 2, 3, 4, 5].map((hr) =>
          api.getAttendanceSession(primaryBatchId, todayIso, hr).catch(() => null)
        )
      );
      const markedHrs: number[] = [];
      let totalMarked = 0;
      let totalPresent = 0;

      results.forEach((sess, idx) => {
        if (sess && sess.records) {
          const statuses = Object.values(sess.records);
          const nonEmpty = statuses.filter((st) => st && st !== 'NOT_MARKED');
          if (nonEmpty.length > 0) {
            markedHrs.push(idx + 1);
            totalMarked += nonEmpty.length;
            totalPresent += nonEmpty.filter((st) => st === 'PRESENT' || st === 'LATE').length;
          }
        }
      });

      const nextRate = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : null;
      setTodayMarkedHours((prev) =>
        prev.length === markedHrs.length && prev.every((v, i) => v === markedHrs[i])
          ? prev
          : markedHrs
      );
      setTodayAttendanceRate((prev) => (prev === nextRate ? prev : nextRate));
    } catch {
      // ignore summary fetch error
    }
  }, [primaryBatchId, todayIso]);

  useEffect(() => {
    void loadTodayAttendanceSummary();
  }, [loadTodayAttendanceSummary]);

  // Real Sabq & Hifz counts for today
  const myStudentIds = new Set(myStudents.map((s) => s.id));
  const todaysRecords = records.filter(
    (r) => r.date === todayIso && myStudentIds.has(r.studentId)
  );
  const todaysSabqCount = todaysRecords.filter((r) => r.recordType === 'SABQ').length;
  const fallbackAvgRate =
    myStudents.length > 0
      ? Math.round(
          myStudents.reduce((acc, s) => acc + (s.attendanceRate || 0), 0) / myStudents.length
        )
      : 0;
  const displayedAttendanceRate =
    todayAttendanceRate !== null ? todayAttendanceRate : fallbackAvgRate;
  const markedHoursLabel =
    todayMarkedHours.length > 0
      ? `Hour ${todayMarkedHours.join(', ')} Marked`
      : 'No hours marked today';

  // Mudir Feedback Summary & Suggestions for this teacher
  const [feedbackReports, setFeedbackReports] = useState<TeacherFeedbackReport[]>([]);
  const [loadingReports, setLoadingReports] = useState<boolean>(true);

  const assignedBatchIdsRef = useRef<string[]>(assignedBatchIds);
  assignedBatchIdsRef.current = assignedBatchIds;

  const loadTodayAttendanceSummaryRef = useRef(loadTodayAttendanceSummary);
  loadTodayAttendanceSummaryRef.current = loadTodayAttendanceSummary;

  useEffect(() => {
    let active = true;
    const loadReports = async () => {
      try {
        const res = await api.getFeedbackReports();
        if (active && Array.isArray(res)) {
          setFeedbackReports(res);
        }
      } catch (err) {
        console.warn('[TeacherDashboard] Failed to load Mudir feedback reports:', err);
      } finally {
        if (active) setLoadingReports(false);
      }
    };
    loadReports();

    const unsubscribe = subscribeToRealtimeEvents({
      onAttendanceUpdated: (data: any) => {
        if (data?.date === todayIso && assignedBatchIdsRef.current.includes(data?.classId)) {
          void loadTodayAttendanceSummaryRef.current();
        }
      },
      onFeedbackReportUpdated: (report: TeacherFeedbackReport) => {
        const matchesTeacher =
          report.teacherId === currentUser.id ||
          (currentUser.referenceId && report.teacherId === currentUser.referenceId);
        if (matchesTeacher) {
          setFeedbackReports((prev) => [
            report,
            ...prev.filter((r) => r.id !== report.id),
          ]);
        }
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUser.id, currentUser.referenceId, todayIso]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Usthad Profile Hero Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src={currentUser.avatar}
            alt={currentUser.fullName}
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover border-2 sm:border-4 border-white/80 shadow-md shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-200">
              Assigned Usthad Mentor · {currentUser.referenceId}
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-white">
              {currentUser.fullName}
            </h1>
            <div className="text-xs text-emerald-100 font-arabic mt-0.5">
              {currentUser.arabicName} · {INSTITUTION_INFO.name}
            </div>
            <div className="text-[11px] sm:text-xs text-emerald-200/90 mt-1">
              Active Batches: <strong>{assignedBatchLabel}</strong>
            </div>
          </div>
        </div>

        {/* Quick action buttons on banner */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAttendance}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Daily Attendance</span>
          </button>
          <button
            onClick={onOpenAddHifz}
            className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Record Hifz</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Assigned Students
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {myStudents.length}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1 truncate">
            {assignedBatchLabel}
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Today's Attendance
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 mt-1 tabular-nums">
            {displayedAttendanceRate}%
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 truncate">
            {markedHoursLabel}
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Sabq Lessons Today
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {todaysSabqCount}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {todaysRecords.length > todaysSabqCount
              ? `${todaysRecords.length} total Hifz entries today`
              : 'Recorded & evaluated'}
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Revision Alerts
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600 mt-1 tabular-nums">
            {studentsNeedingRevision.length}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">Requires follow-up recitation</div>
        </div>
      </div>

      {/* Two Column Layout: Students Attention List & Recent Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Students needing revision follow-up */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Follow-up Revisions</h2>
            </div>
            {studentsNeedingRevision.length > 0 && (
              <span className="text-xs font-mono font-bold text-amber-700 tabular-nums">
                {studentsNeedingRevision.length}
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {studentsNeedingRevision.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                No revision follow-ups pending.
              </div>
            ) : (
              studentsNeedingRevision.map((std) => (
              <div
                key={std.id}
                className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={getStudentPhotoSrc(std.photo)}
                    alt={std.fullName}
                    className="w-8 h-8 rounded-full object-cover border border-amber-300 bg-slate-100"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_STUDENT_AVATAR;
                    }}
                  />
                  <div>
                    <div className="font-bold text-slate-900">{std.fullName}</div>
                    <div className="text-[10px] text-slate-500">Roll #{std.rollNumber} · Juz {std.currentJuz}</div>
                  </div>
                </div>

                <button
                  onClick={onOpenAddHifz}
                  className="px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 cursor-pointer"
                >
                  Retest
                </button>
              </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={onOpenTimetable}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>View Today's Session Schedule</span>
            </button>
          </div>
        </div>

        {/* Right: Assigned Students Roster Quick View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                My Students ({assignedBatchLabel})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View Full Directory</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myStudents.slice(0, 6).map((std) => (
              <div
                key={std.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={getStudentPhotoSrc(std.photo)}
                    alt={std.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-slate-100"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_STUDENT_AVATAR;
                    }}
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{std.fullName}</span>
                      <span className="font-mono text-[10px] text-slate-400 font-normal">#{std.rollNumber}</span>
                    </div>
                    <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                      Current: Juz {std.currentJuz}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {std.completedJuzList.length} of 30 Finished
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {std.attendanceRate}%
                  </span>
                  <div className="text-[10px] text-slate-400">Attended</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing top 6 of {myStudents.length} assigned students</span>
            <button
              onClick={() => onNavigate('hifz')}
              className="text-emerald-700 font-semibold hover:underline cursor-pointer"
            >
              Open Full Hifz Tracker →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Mudir Feedback Summary & Suggestions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/70 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Mudir Feedback Summary & Suggestions
              </h2>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
            {feedbackReports.length} {feedbackReports.length === 1 ? 'Report' : 'Reports'}
          </span>
        </div>

        {loadingReports ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Loading feedback reports...
          </div>
        ) : feedbackReports.length === 0 ? (
          <div className="p-5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 text-center">
            No feedback reports published by the Mudir yet.
          </div>
        ) : (
          <div className="space-y-3">
            {feedbackReports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 sm:p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200/60 text-xs">
                  <div className="font-bold text-slate-900">
                    {rep.term}
                    <span className="text-slate-400 font-normal mx-1.5">·</span>
                    <span className="text-emerald-800 font-semibold">
                      Reviewed by {rep.mudirName || 'Campus Mudir'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {new Date(rep.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Feedback Summary
                    </div>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                      {rep.summaryText}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-emerald-200 p-3.5 space-y-1">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Suggestions & Recommendations
                    </div>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                      {rep.suggestionsText || 'Continue maintaining high classroom engagement and Tajweed standards.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
