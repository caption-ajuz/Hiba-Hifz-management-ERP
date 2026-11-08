import React from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import { Student, ClassBatch, HifzRecord, UserProfile } from '../types';
import {
  CalendarCheck,
  BookOpen,
  Sparkles,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  Plus,
  Bookmark,
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
  // Assigned students
  const assignedBatchIds = currentUser.assignedClassIds || ['batch-a', 'batch-b'];
  const myStudents = students.filter((s) => assignedBatchIds.includes(s.classId));

  // Students with revision required in their recent records
  const studentsNeedingRevision = records
    .filter((r) => r.status === 'Revision Required')
    .map((r) => students.find((s) => s.id === r.studentId))
    .filter((s): s is Student => Boolean(s));

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
              Active Batches: <strong>Batch A</strong> & <strong>Batch B</strong>
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
          <div className="text-[11px] text-emerald-700 font-medium mt-1">Batch A & Batch B roster</div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Today's Attendance
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 mt-1 tabular-nums">
            96%
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Hour 1 & 2 Marked</div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Sabq Lessons Today
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            18
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">Recorded & evaluated</div>
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
            <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              Attention Required
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-normal">
            Students who stumbled during today’s Sabq or Murajath and require repeat testing:
          </p>

          <div className="space-y-2.5">
            {studentsNeedingRevision.map((std) => (
              <div
                key={std.id}
                className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={std.photo}
                    alt={std.fullName}
                    className="w-8 h-8 rounded-full object-cover border border-amber-300"
                    referrerPolicy="no-referrer"
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
            ))}
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
              <h2 className="text-sm font-bold text-slate-900">My Students Roster (Batch A)</h2>
              <p className="text-xs text-slate-500">Active students in your morning Sabq & afternoon Manzil classes</p>
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
                    src={std.photo}
                    alt={std.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
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
              Open Full Hifz Matrix →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
