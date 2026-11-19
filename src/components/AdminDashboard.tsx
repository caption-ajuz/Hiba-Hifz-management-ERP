import React from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import {
  Student,
  Teacher,
  ClassBatch,
  HifzRecord,
  UserProfile,
  Campus,
} from '../types';
import { getFacultyDisplayList, sortBatchesWithPriority } from '../utils/batchUtils';
import { DEFAULT_STUDENT_AVATAR, getStudentPhotoSrc } from '../utils/avatarUtils';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  MapPin,
  Layers,
  Calendar,
  Clock,
  MessageSquare,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface AdminDashboardProps {
  students: Student[];
  teachers: Teacher[];
  classes: ClassBatch[];
  records: HifzRecord[];
  currentUser: UserProfile;
  assignedCampus?: Campus;
  feedbackEnabled?: boolean;
  onNavigate: (tab: string) => void;
  onOpenAttendance: () => void;
  onOpenAddHifz: () => void;
  onOpenTimetable: () => void;
  onOpenFeedback: () => void;
  onOpenChangePassword?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  teachers,
  classes,
  records,
  currentUser,
  assignedCampus,
  feedbackEnabled = true,
  onNavigate,
  onOpenAttendance,
  onOpenAddHifz,
  onOpenTimetable,
  onOpenFeedback,
  onOpenChangePassword,
}) => {
  const totalStudentsCount = students.length;
  const totalCompletedJuz = students.reduce((acc, s) => acc + s.completedJuzList.length, 0);
  const avgAttendance =
    students.length > 0
      ? (students.reduce((acc, s) => acc + (s.attendanceRate || 0), 0) / students.length).toFixed(1)
      : '0.0';
  const sortedBatches = sortBatchesWithPriority(classes);
  const facultyMentors = getFacultyDisplayList(teachers, currentUser, assignedCampus);
  const supervisingMentor = currentUser.fullName || teachers[0]?.fullName || 'Campus Mentor Usthad';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Assigned Campus Mudeer Welcome Banner */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-emerald-800/80 text-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-700/80">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mudeer · Campus Admin Portal</span>
            </div>
            {assignedCampus?.code && (
              <span className="font-mono text-[11px] font-bold bg-amber-400/15 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full">
                {assignedCampus.code}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {assignedCampus?.name || INSTITUTION_INFO.name}
            </h1>
            <div className="text-xs sm:text-sm text-emerald-200 font-arabic mt-0.5">
              {assignedCampus?.arabicName || INSTITUTION_INFO.arabicName}
            </div>
            {assignedCampus?.address && (
              <div className="text-[11px] text-emerald-100/75 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{assignedCampus.address}</span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenAttendance}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-emerald-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Take Attendance</span>
            </button>
            <button
              onClick={onOpenAddHifz}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-white/20"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>+ Record Hifz</span>
            </button>
            {onOpenChangePassword && (
              <button
                onClick={onOpenChangePassword}
                className="px-3.5 py-2 bg-amber-400/15 hover:bg-amber-400/25 text-amber-100 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-amber-400/30"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>Change Password</span>
              </button>
            )}
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden sm:flex items-center justify-center">
          <img
            src={INSTITUTION_INFO.logoUrl}
            alt="Watermark"
            className="w-80 h-80 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div
          onClick={() => onNavigate('students')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Campus Students
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 mt-1 sm:mt-2 tabular-nums">
            {totalStudentsCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-700 font-medium mt-0.5 tabular-nums">
            {classes.length} active {classes.length === 1 ? 'batch' : 'batches'}
          </div>
        </div>

        <div
          onClick={() => onNavigate('teachers')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Campus Usthads
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 mt-1 sm:mt-2 tabular-nums">
            {teachers.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-sky-700 font-medium mt-0.5">
            Assigned mentors
          </div>
        </div>

        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avg Attendance
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 mt-1 sm:mt-2 tabular-nums">
            {avgAttendance}%
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-0.5">
            {totalStudentsCount > 0 ? `${totalStudentsCount} active roster` : 'No students enrolled yet'}
          </div>
        </div>

        <div
          onClick={() => onNavigate('hifz')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Finished Juz
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 mt-1 sm:mt-2 tabular-nums">
            {totalCompletedJuz}
          </div>
          <div className="text-[10px] sm:text-[11px] text-amber-700 font-medium mt-0.5">
            Completed Juz
          </div>
        </div>
      </div>

      {/* Campus Operations Menu */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Campus Menu</h2>
          <span className="text-[11px] font-mono text-emerald-800 font-semibold">
            {assignedCampus?.code || 'HYBA-MAIN'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              group: 'Academic Operations',
              items: [
                {
                  id: 'attendance',
                  label: 'Daily Attendance',
                  sub: '5-hour session marking & tracking',
                  icon: CalendarCheck,
                  tone: 'bg-emerald-50 text-emerald-700',
                  action: onOpenAttendance,
                },
                {
                  id: 'hifz',
                  label: 'Hifz Records & Evaluations',
                  sub: 'Sabq, Murajath & Manzil logbook',
                  icon: BookOpen,
                  tone: 'bg-teal-50 text-teal-700',
                  action: () => onNavigate('hifz'),
                },
                {
                  id: 'timetable',
                  label: 'Campus Timetable',
                  sub: 'Manage D1–D5 bell schedule & rooms',
                  icon: Clock,
                  tone: 'bg-indigo-50 text-indigo-700',
                  action: onOpenTimetable,
                },
              ],
            },
            {
              group: 'Campus Registry & Batches',
              items: [
                {
                  id: 'students',
                  label: 'Students Directory',
                  sub: `${totalStudentsCount} enrolled Talaba & ID cards`,
                  icon: GraduationCap,
                  tone: 'bg-sky-50 text-sky-700',
                  action: () => onNavigate('students'),
                },
                {
                  id: 'teachers',
                  label: 'Usthad & Faculty Roster',
                  sub: `${teachers.length} faculty members & batches`,
                  icon: Users,
                  tone: 'bg-amber-50 text-amber-700',
                  action: () => onNavigate('teachers'),
                },
                {
                  id: 'classes',
                  label: 'Class Batches',
                  sub: `${classes.length} active Hifz & academic halls`,
                  icon: Layers,
                  tone: 'bg-slate-100 text-slate-700',
                  action: () => onNavigate('classes'),
                },
              ],
            },
            {
              group: 'Feedback, Events & Reports',
              items: [
                {
                  id: 'feedback',
                  label: 'Feedback Management',
                  sub: feedbackEnabled
                    ? 'Active · Questions, teacher reviews & reports'
                    : 'Paused · Click to configure or enable',
                  icon: MessageSquare,
                  tone: feedbackEnabled
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-slate-100 text-slate-600',
                  action: onOpenFeedback,
                },
                {
                  id: 'events',
                  label: 'Events & Calendar',
                  sub: 'Publish programs, posters & notices',
                  icon: Calendar,
                  tone: 'bg-purple-50 text-purple-700',
                  action: () => onNavigate('events'),
                },
                {
                  id: 'reports',
                  label: 'Assessment Reports',
                  sub: 'Batch analytics & progress exports',
                  icon: FileText,
                  tone: 'bg-rose-50 text-rose-700',
                  action: () => onNavigate('reports'),
                },
              ],
            },
          ].map((section) => (
            <div key={section.group} className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                {section.group}
              </div>
              <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      className="w-full p-3 flex items-center justify-between gap-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.tone}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 truncate">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{item.sub}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Batch Assignments Overview (Visible to Campus Mudeer, including Mudeer faculty role) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">Batch Assignments & Faculty</h2>
          </div>
          <button
            onClick={() => onNavigate('classes')}
            className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Manage Batches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedBatches.map((batch) => {
            const mentor = facultyMentors.find(
              (m) => m.id === batch.usthadId || m.teacherId === batch.usthadId
            );
            const batchStudentsCount = students.filter((s) => s.classId === batch.id).length;
            const isMudeerAssigned = mentor?.roleType === 'MUDEER' || batch.usthadId === currentUser.id;
            return (
              <div
                key={batch.id}
                onClick={() => onNavigate('classes')}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:border-emerald-300 transition-all flex items-center justify-between gap-2.5 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 truncate">{batch.name}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="truncate font-medium">
                      {mentor?.fullName || (isMudeerAssigned ? currentUser.fullName : 'Assigned Faculty')}
                    </span>
                    {isMudeerAssigned && (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded shrink-0">
                        Mudeer · Faculty
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-lg shrink-0">
                  {batchStudentsCount} Students
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Sessions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Today's 5 Hours Sessions Status */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Daily Sessions (5 Hours)</h2>
            <button
              onClick={onOpenTimetable}
              className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Timetable
            </button>
          </div>

          <div className="flex items-center justify-between py-1">
            {[1, 2, 3, 4, 5].map((hr) => (
              <div key={hr} className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 flex items-center justify-center font-mono font-bold text-xs ${
                    hr <= 2
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : hr === 3
                      ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-400/20'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {hr}h
                </div>
                <span className="text-[9px] font-medium text-slate-500">
                  {hr === 1 ? 'Sabq' : hr === 2 ? 'Murajath' : hr === 3 ? 'Tajweed' : hr === 4 ? 'Manzil' : 'Test'}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between font-medium">
              <span>Campus:</span>
              <span className="text-slate-800 truncate max-w-[160px]">
                {assignedCampus?.name || 'Main Campus'}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Supervising Mentor:</span>
              <span className="text-emerald-800 font-bold truncate max-w-[160px]">{supervisingMentor}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Hifz Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Recent Hifz Recitations</h2>
            <button
              onClick={() => onNavigate('hifz')}
              className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {records.length > 0 ? (
              records.slice(0, 5).map((rec) => {
                const student = students.find((s) => s.id === rec.studentId);
                return (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {student && (
                        <img
                          src={getStudentPhotoSrc(student.photo)}
                          alt={student.fullName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200 mt-0.5 shrink-0 bg-slate-100"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_STUDENT_AVATAR;
                          }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 truncate">
                            {student?.fullName || 'Campus Student'}
                          </span>
                          {student?.rollNumber && (
                            <span className="text-[10px] font-mono text-slate-400">
                              #{student.rollNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600 text-[11px] mt-0.5">
                          {rec.recordType === 'MANZIL' ? (
                            <span>
                              Manzil: <strong>Juz {rec.juzNumber}</strong>
                            </span>
                          ) : (
                            <span>
                              {rec.recordType}: <strong>Surah {rec.surahName}</strong> (Ayah {rec.startAyah}–{rec.endAyah})
                            </span>
                          )}
                        </div>
                        {rec.teacherRemarks && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                            "{rec.teacherRemarks}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          rec.performance === 'Excellent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {rec.performance}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.date}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 text-center">
                No Hifz records yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
