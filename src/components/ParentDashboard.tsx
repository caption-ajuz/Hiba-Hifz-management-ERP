import React, { useState } from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import { Student, HifzRecord, UserProfile } from '../types';
import {
  HeartHandshake,
  Calendar,
  BookOpen,
  CalendarCheck,
  Phone,
  MessageSquare,
  Award,
  ChevronRight,
  Sparkles,
  IdCard,
} from 'lucide-react';

interface ParentDashboardProps {
  currentUser: UserProfile;
  students: Student[];
  records: HifzRecord[];
  onOpenIdCard: (student: Student) => void;
  onNavigate: (tab: string) => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  currentUser,
  students,
  records,
  onOpenIdCard,
  onNavigate,
}) => {
  const linkedIds = currentUser.linkedStudentIds || ['std_05', 'std_08'];
  const myChildren = students.filter((s) => linkedIds.includes(s.id));
  const [selectedChildId, setSelectedChildId] = useState<string>(myChildren[0]?.id || 'std_05');

  const selectedChild = myChildren.find((c) => c.id === selectedChildId) || myChildren[0];
  const childRecords = records.filter((r) => r.studentId === selectedChild.id);
  const latestSabq = childRecords.find((r) => r.recordType === 'SABQ');

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-emerald-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-800/80 text-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-700">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Parent & Guardian Portal</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-white mt-1">
            Welcome, {currentUser.fullName}
          </h1>
          <p className="text-xs text-emerald-200/90 mt-0.5">
            Real-time academic oversight for your children at {INSTITUTION_INFO.name}
          </p>
        </div>

        {/* Children Switcher Pills */}
        <div className="flex items-center gap-2 p-1.5 bg-black/20 rounded-2xl border border-white/10 self-start md:self-auto">
          {myChildren.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedChildId === child.id
                  ? 'bg-white text-emerald-950 shadow-md ring-2 ring-emerald-400/40'
                  : 'text-emerald-200 hover:text-white hover:bg-white/10'
              }`}
            >
              <img
                src={child.photo}
                alt={child.fullName}
                className="w-6 h-6 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span>{child.fullName.split(' ')[0]} (Juz {child.currentJuz})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Child Progress Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <img
              src={selectedChild.photo}
              alt={selectedChild.fullName}
              className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{selectedChild.fullName}</h2>
                <span className="text-xs text-slate-400 font-arabic">{selectedChild.arabicName}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Roll #{selectedChild.rollNumber} · Admission: {selectedChild.admissionNumber} · Batch A (Hifz Ul Uloom)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenIdCard(selectedChild)}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <IdCard className="w-3.5 h-3.5 text-emerald-700" />
              <span>View ID Card</span>
            </button>
            <button
              onClick={() => onNavigate('events')}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>College Events</span>
            </button>
          </div>
        </div>

        {/* Child's Key KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div className="text-xs font-medium text-emerald-900">Current Memorization</div>
            <div className="text-2xl font-bold font-mono text-emerald-800 mt-1 tabular-nums">
              Juz {selectedChild.currentJuz}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">Active daily Sabq focus</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500">Completed Portions</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
              {selectedChild.completedJuzList.length} / 30 Juz
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {Math.round((selectedChild.completedJuzList.length / 30) * 100)}% of the Quran
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500">Attendance Rate</div>
            <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
              {selectedChild.attendanceRate}%
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Regular and on time</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500">Mentor Usthad</div>
            <div className="text-sm font-bold text-slate-900 mt-1 truncate">
              Usthad Mohammed Ajash
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Senior Tahfeez Faculty</div>
          </div>
        </div>

        {/* Latest Sabq Lesson Progress */}
        {latestSabq && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">
                Latest Memorization Lesson (Sabq · السبق)
              </span>
              <span className="font-mono text-slate-400">{latestSabq.date}</span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              Surah {latestSabq.surahName} (Ayah {latestSabq.startAyah} to {latestSabq.endAyah})
            </div>
            <p className="text-xs text-slate-600 italic">"{latestSabq.teacherRemarks}"</p>
            {latestSabq.nextLessonPosition && (
              <div className="text-[11px] text-emerald-800 font-semibold pt-1">
                Target Next Lesson: {latestSabq.nextLessonPosition}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usthad Contact & Communication Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Assigned Usthad Mentor Direct Line</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Contact Usthad Mohammed Ajash T. for academic reviews or excused leave permissions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="tel:+919961065284"
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Faculty Office</span>
          </a>
        </div>
      </div>
    </div>
  );
};
