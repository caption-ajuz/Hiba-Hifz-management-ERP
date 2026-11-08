import React from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import { Student, Teacher, ClassBatch, HifzRecord, AttendanceSession, Announcement, UserProfile } from '../types';
import {
  Users,
  GraduationCap,
  Layers,
  CalendarCheck,
  BookOpen,
  Sparkles,
  ArrowRight,
  Clock,
  IdCard,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface AdminDashboardProps {
  students: Student[];
  teachers: Teacher[];
  classes: ClassBatch[];
  records: HifzRecord[];
  announcements: Announcement[];
  currentUser: UserProfile;
  onNavigate: (tab: string) => void;
  onOpenAttendance: () => void;
  onOpenAddHifz: () => void;
  onOpenTimetable: () => void;
  onOpenFeedback: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  teachers,
  classes,
  records,
  announcements,
  currentUser,
  onNavigate,
  onOpenAttendance,
  onOpenAddHifz,
  onOpenTimetable,
  onOpenFeedback,
}) => {
  const totalStudentsCount = students.length;
  const totalCompletedJuz = students.reduce((acc, s) => acc + s.completedJuzList.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Institution Welcome Banner (Mobile-Optimized) */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-emerald-800/80 text-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-700/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mudir Administrative Overview</span>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {INSTITUTION_INFO.name}
            </h1>
            <div className="text-xs sm:text-sm text-emerald-200 font-arabic mt-0.5">
              {INSTITUTION_INFO.arabicName}
            </div>
          </div>

          <p className="text-xs text-emerald-100/80 max-w-xl font-medium leading-relaxed hidden sm:block">
            Centralized Tahfeez campus operations for attendance verification, Sabq & Manzil tracking, teacher performance, and student retention.
          </p>

          {/* Quick Action Buttons on Banner */}
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
          </div>
        </div>

        {/* Ambient background decoration */}
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
              Enrolled Students
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 mt-1 sm:mt-2 tabular-nums">
            {totalStudentsCount}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-700 font-medium mt-0.5">3 active batches</div>
        </div>

        <div
          onClick={() => onNavigate('teachers')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Usthad Mentors
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 mt-1 sm:mt-2 tabular-nums">
            {teachers.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-sky-700 font-medium mt-0.5">Sanad specialists</div>
        </div>

        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Attendance Today
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 mt-1 sm:mt-2 tabular-nums">
            96.2%
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-0.5">19 Present · 5 Absent</div>
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
          <div className="text-[10px] sm:text-[11px] text-amber-700 font-medium mt-0.5">Cumulative milestone</div>
        </div>
      </div>

      {/* Main Grid: Sessions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Today's 5 Hours Sessions Status */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Today's Session Schedule</h2>
              <div className="text-[11px] text-slate-500 font-medium">Saturday · 5 Mandatory Hours</div>
            </div>
            <button
              onClick={onOpenTimetable}
              className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Timetable
            </button>
          </div>

          {/* 5 Hour circles fitting neatly on any screen */}
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
              <span>Active Session:</span>
              <span className="font-bold text-amber-800">Hour 3 · Tajweed Clinic</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Hall:</span>
              <span className="text-slate-800">Tahfeez Hall 101</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Supervising Mentor:</span>
              <span className="text-emerald-800 font-bold">Usthad Mohammed Ajash</span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity & Announcements */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Hifz Recitations & Grades</h2>
              <p className="text-[11px] text-slate-500">Verified Sabq, Murajath and Manzil records</p>
            </div>
            <button
              onClick={() => onNavigate('hifz')}
              className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {records.slice(0, 3).map((rec) => {
              const student = students.find((s) => s.id === rec.studentId);
              return (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {student && (
                      <img
                        src={student.photo}
                        alt={student.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 mt-0.5 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{student?.fullName}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          #{student?.rollNumber}
                        </span>
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
                      <div className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1">
                        "{rec.teacherRemarks}"
                      </div>
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
            })}
          </div>

          {/* Institutional Noticeboard (Clean typography and mobile-friendly borders) */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Campus Announcements
            </div>
            <div className="space-y-2">
              {announcements.map((ann) => (
                <div key={ann.id} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 leading-snug">{ann.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{ann.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-normal">{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
