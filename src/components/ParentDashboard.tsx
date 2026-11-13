import React, { useState } from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import { Student, HifzRecord, UserProfile } from '../types';
import { JUZ_NAMES } from '../data/quranData';
import {
  HeartHandshake,
  CalendarCheck,
  BookOpen,
  Phone,
  Clock,
  IdCard,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  X,
  User,
  ArrowRight,
  FileText,
  Send,
  Upload,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  Download,
  Bell,
  Home,
  Award,
} from 'lucide-react';
import {
  STUDENT_COURSES_DATA,
  TERMLY_ATTENDANCE_SEMESTER_5,
  TODAY_ATTENDANCE_HOURS,
} from '../data/studentPortalData';

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
  // Navigation tabs within parent portal: 'home' | 'attendance' | 'hifz' | 'ward'
  const [activeParentTab, setActiveParentTab] = useState<'home' | 'attendance' | 'hifz' | 'ward'>('home');

  // Linked children
  const linkedIds = currentUser.linkedStudentIds || ['std_05', 'std_08'];
  const myChildren = students.filter((s) => linkedIds.includes(s.id));
  const [selectedChildId, setSelectedChildId] = useState<string>(myChildren[0]?.id || 'std_05');

  const selectedChild = myChildren.find((c) => c.id === selectedChildId) || myChildren[0] || students[4];
  const childRecords = records.filter((r) => r.studentId === selectedChild.id);
  const latestSabq = childRecords.find((r) => r.recordType === 'SABQ');
  const latestMurajath = childRecords.find((r) => r.recordType === 'MURAJATH');
  const latestManzil = childRecords.find((r) => r.recordType === 'MANZIL');

  // Modals state
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isContactUsthadOpen, setIsContactUsthadOpen] = useState(false);
  const [selectedPeriodDetail, setSelectedPeriodDetail] = useState<any | null>(null);
  const [showCampusBanner, setShowCampusBanner] = useState(true);

  // Leave Form state
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('2026-11-10');
  const [leaveEndDate, setLeaveEndDate] = useState('2026-11-10');
  const [leaveType, setLeaveType] = useState('Medical / Illness');
  const [leaveSubmitted, setLeaveSubmitted] = useState(false);

  // Calculations
  const completedJuzCount = selectedChild.completedJuzList.length;
  const progressPercent = Math.round((completedJuzCount / 30) * 100);

  // Circular Donut Renderer matching Student Portal
  const renderDonutChart = (percentage: number, size = 96, strokeWidth = 8) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let strokeColor = '#10b981'; // emerald
    if (percentage < 60) {
      strokeColor = '#f59e0b'; // amber
    } else if (percentage < 75) {
      strokeColor = '#f59e0b';
    }

    return (
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
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
          <span className="text-sm font-extrabold text-slate-800 font-mono tracking-tighter">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveSubmitted(true);
    setTimeout(() => {
      setLeaveSubmitted(false);
      setIsLeaveModalOpen(false);
      setLeaveReason('');
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 pb-28">
      <div className="max-w-xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4 sm:space-y-5">
        {/* 1. TOP PARENT HEADER */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm ring-2 ring-emerald-100 bg-emerald-50 shrink-0">
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
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Parent / Guardian
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {INSTITUTION_INFO.name}
              </div>
            </div>
          </div>

          {/* Contact Usthad quick button */}
          <button
            onClick={() => setIsContactUsthadOpen(true)}
            className="w-10 h-10 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Call Mentor Usthad"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>

        {/* 2. WARD SWITCHER TABS (Multiple Children) */}
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
                    src={child.photo}
                    alt={child.fullName}
                    className="w-5 h-5 rounded-full object-cover"
                    referrerPolicy="no-referrer"
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

        {/* 3. CAMPUS BANNER (Uses uploaded image) */}
        {showCampusBanner && (
          <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-200 group animate-fade-in">
            <img
              src={INSTITUTION_INFO.campusBannerUrl}
              alt={INSTITUTION_INFO.name}
              className="w-full h-44 sm:h-52 object-cover transition-transform duration-700 group-hover:scale-102"
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setShowCampusBanner(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer backdrop-blur-xs"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white">
              <div className="text-xs sm:text-sm font-extrabold tracking-tight">
                {INSTITUTION_INFO.name}
              </div>
              <div className="text-[10px] text-slate-300 font-medium">
                {INSTITUTION_INFO.shortAddress} · Established {INSTITUTION_INFO.established}
              </div>
            </div>
          </div>
        )}

        {/* TAB NAVIGATION: Home | Attendance | Quran Hifz | Ward Details */}
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
                onClick={() => setActiveParentTab(tab.id as any)}
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

        {/* ===================== TAB 1: OVERVIEW (HOME) ===================== */}
        {activeParentTab === 'home' && (
          <div className="space-y-4">
            {/* Child's Identity Card strip */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <img
                  src={selectedChild.photo}
                  alt={selectedChild.fullName}
                  className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      {selectedChild.fullName}
                    </h2>
                    <span className="text-xs font-arabic text-emerald-800 hidden sm:inline">
                      {selectedChild.arabicName}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Roll #{selectedChild.rollNumber} · Adm: {selectedChild.admissionNumber}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    Hifz Batch A (Hifz Ul Uloom) · Semester 6
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

            {/* Child's Today's Attendance Widget */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Today's Attendance ({selectedChild.fullName.split(' ')[0]})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Monday, November 09 · Live Campus Tracking
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  5/5 Present
                </span>
              </div>

              {/* 5 Period Circles */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {TODAY_ATTENDANCE_HOURS.map((slot) => (
                  <button
                    key={slot.hour}
                    onClick={() => setSelectedPeriodDetail(slot)}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs group"
                    title={`Hour ${slot.hour}: ${slot.subjectName} (Present)`}
                  >
                    <span className="text-xs sm:text-sm font-bold text-emerald-900">
                      {slot.hour} hr
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Ward is present in all sessions today.
                </span>
                <button
                  onClick={() => setIsLeaveModalOpen(true)}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Submit Leave Slip</span>
                </button>
              </div>
            </div>

            {/* Child's Memorization Progress (Quran Hifz Journey) */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Holy Quran Memorization Status
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mentored by Usthad Mohammed Ajash T.
                  </p>
                </div>
                <button
                  onClick={() => setActiveParentTab('hifz')}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Details →
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-emerald-900">Juz {selectedChild.currentJuz} Active Sabq</span>
                  <span className="text-slate-700">{completedJuzCount} of 30 Juz ({progressPercent}%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Latest Sabq lesson */}
              {latestSabq && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950">Yesterday's Lesson (Sabq)</span>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      {latestSabq.status}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    Surah {latestSabq.surahName} (Ayah {latestSabq.startAyah} to {latestSabq.endAyah})
                  </div>
                  <p className="text-slate-600 italic text-[11px]">
                    "{latestSabq.teacherRemarks}"
                  </p>
                </div>
              )}
            </div>

            {/* Semester Attendance & Exam Clearance Gauge */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Semester Attendance & Exam Eligibility
                  </h3>
                  <p className="text-xs text-slate-500">
                    University minimum requirement: 75.0%
                  </p>
                </div>
                <button
                  onClick={() => setActiveParentTab('attendance')}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Breakdown →
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="text-sm font-extrabold text-slate-900">
                    Semester 5 & 6 Cumulative
                  </div>
                  <div className="text-slate-600">Total Hours: <strong>66.0</strong></div>
                  <div className="text-slate-600">Hours Present: <strong>38.5</strong></div>
                  <div className="pt-1">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Shortage Warning (&lt; 75%)
                    </span>
                  </div>
                </div>

                <div onClick={() => setActiveParentTab('attendance')} className="cursor-pointer">
                  {renderDonutChart(58.3, 100, 9)}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Notice to Parents: Ward is currently at <strong>58.3%</strong>. Must attend 14 consecutive classes to achieve 75% examination hall ticket clearance.
              </div>
            </div>

            {/* Parent Quick Action Shortcuts */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-3 transition-colors text-left cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Submit Leave Slip</div>
                  <div className="text-[10px] text-slate-400">Medical / Emergency</div>
                </div>
              </button>

              <button
                onClick={() => setIsContactUsthadOpen(true)}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-3 transition-colors text-left cursor-pointer shadow-2xs"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Contact Mentor</div>
                  <div className="text-[10px] text-slate-400">Usthad Mohammed Ajash</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: DETAILED ATTENDANCE ===================== */}
        {activeParentTab === 'attendance' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header summary */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Subject-wise Attendance Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ward: {selectedChild.fullName} · Semester 5
                  </p>
                </div>
                {renderDonutChart(58.3, 76, 7)}
              </div>
            </div>

            {/* Courses List */}
            <div className="space-y-3">
              {STUDENT_COURSES_DATA.map((course) => (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start gap-3">
                    {renderDonutChart(course.percentage, 72, 7)}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-extrabold text-slate-900">
                        {course.code} - {course.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Faculty: {course.faculty}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        Attended: <strong>{course.attendedHours}</strong> / Total: <strong>{course.totalHours}</strong> hrs
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded-xl text-[11px] font-medium ${
                      course.percentage >= 75
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {course.percentage >= 75
                      ? '✓ Above university 75% threshold. Regular attendance.'
                      : `⚠ Below 75% threshold (${course.percentage}%). Ward must attend next classes without absence.`}
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-700">
                Monthly Termly Log (Semester 5)
              </div>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3 text-right">Attended</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TERMLY_ATTENDANCE_SEMESTER_5.map((row) => (
                    <tr key={row.month} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{row.month} 2026</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.attendance.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{row.total.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{row.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: QURAN HIFZ TRACKER ===================== */}
        {activeParentTab === 'hifz' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Holy Quran 30-Juz Memorization Status
                  </h3>
                  <p className="text-xs text-slate-500">
                    {completedJuzCount} of 30 Juz Verified & Certified
                  </p>
                </div>
                <span className="text-sm font-extrabold font-mono text-emerald-800">
                  {progressPercent}%
                </span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {/* 30-Juz Interactive visual grid */}
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

            {/* Recitation lessons breakdown */}
            <div className="space-y-3">
              {latestSabq && (
                <div className="bg-white p-4 rounded-3xl border border-emerald-200 shadow-xs space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-emerald-950">
                    <span>Sabq (السبق - Daily New Lesson)</span>
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">{latestSabq.status}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Surah {latestSabq.surahName} (Ayah {latestSabq.startAyah} to {latestSabq.endAyah})
                  </div>
                  <p className="text-slate-600 italic">"{latestSabq.teacherRemarks}"</p>
                </div>
              )}

              {latestMurajath && (
                <div className="bg-white p-4 rounded-3xl border border-teal-200 shadow-xs space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-teal-950">
                    <span>Murajath (المراجعة - Near Revision)</span>
                    <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">{latestMurajath.status}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Surah {latestMurajath.surahName} (Ayah {latestMurajath.startAyah} to {latestMurajath.endAyah})
                  </div>
                  <p className="text-slate-600 italic">"{latestMurajath.teacherRemarks}"</p>
                </div>
              )}

              {latestManzil && (
                <div className="bg-white p-4 rounded-3xl border border-sky-200 shadow-xs space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-sky-950">
                    <span>Manzil (المنزل - Quarterly Revision)</span>
                    <span className="bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">{latestManzil.status}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Juz {latestManzil.juzNumber} Revision ({latestManzil.surahRangeText})
                  </div>
                  <p className="text-slate-600 italic">"{latestManzil.teacherRemarks}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB 4: WARD DETAILS & GUARDIAN PROFILE ===================== */}
        {activeParentTab === 'ward' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
                Official Enrolment Record
              </h3>
              <div className="space-y-2.5 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Student Name</span>
                  <span className="font-bold text-slate-900">{selectedChild.fullName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Admission Number</span>
                  <span className="font-mono font-bold text-slate-900">{selectedChild.admissionNumber}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Register Number</span>
                  <span className="font-mono font-bold text-indigo-700">KIAYSCH024</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Roll Number</span>
                  <span className="font-mono font-bold text-slate-900">#{selectedChild.rollNumber}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Campus & Branch</span>
                  <span className="font-semibold text-slate-800">{INSTITUTION_INFO.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Enrolled Programme</span>
                  <span className="font-semibold text-slate-800 text-right">B.Sc Chemistry (Aided) & Tahfeez</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Class Advisor</span>
                  <span className="font-bold text-emerald-800">Dr. Sreenivasan K.P.</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Tahfeez Mentor</span>
                  <span className="font-bold text-emerald-800">Usthad Mohammed Ajash T.</span>
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

            {/* Guardian Contact Information */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
                Guardian on Record
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Father's Name</span>
                  <span className="font-bold text-slate-900">{currentUser.fullName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Registered Mobile</span>
                  <span className="font-mono font-bold text-slate-900">{currentUser.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Email</span>
                  <span className="font-semibold text-slate-800">{currentUser.email}</span>
                </div>
                <div className="pt-1 space-y-1">
                  <span className="text-slate-400">Postal Address</span>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                    Thekkath House, Kombam, Kodakkad (P.O), Mannarkkad, Palakkad, Kerala - 678583
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM NAVIGATION BAR FOR PARENTS */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-4 py-2">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            onClick={() => setActiveParentTab('home')}
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
            onClick={() => setActiveParentTab('attendance')}
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
            onClick={() => setActiveParentTab('hifz')}
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
              Hifz Quran
            </span>
          </button>

          <button
            onClick={() => setActiveParentTab('ward')}
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
                  <div className="text-sm font-bold text-slate-900">Parent Absence / Leave Slip</div>
                  <div className="text-[11px] text-slate-500">For: {selectedChild.fullName}</div>
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
                  <h4 className="text-base font-bold text-slate-900">Leave Slip Sent to Usthad!</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Usthad Mohammed Ajash and the college attendance office have received your notification.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleLeaveSubmit} className="space-y-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Leave Nature</label>
                    <select
                      value={leaveType}
                      onChange={(e) => setLeaveType(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                    >
                      <option>Medical / Illness</option>
                      <option>Family / Urgent Personal</option>
                      <option>Academic Event / Competition</option>
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
                    <label className="font-bold text-slate-700">Parent Reason / Doctor Note</label>
                    <textarea
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      rows={3}
                      placeholder="e.g., Mohammed Ajash has fever and doctor advised rest today..."
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
                      <span>Submit Slip</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTACT USTHAD MODAL */}
      {isContactUsthadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Direct Faculty Hotline</h3>
              <button
                onClick={() => setIsContactUsthadOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Usthad Mohammed Ajash T.</div>
                  <div className="text-[10px] text-slate-500">Senior Tahfeez Faculty & Mentor</div>
                </div>
                <a
                  href="tel:+919961065284"
                  className="px-3 py-1.5 bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1 shadow-2xs"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call</span>
                </a>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Dr. Sreenivasan K.P.</div>
                  <div className="text-[10px] text-slate-500">Head of Chemistry & Class Advisor</div>
                </div>
                <a
                  href="tel:+919447355102"
                  className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1 shadow-2xs"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call</span>
                </a>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Administrative Office</div>
                  <div className="text-[10px] text-slate-500">Markazul Hidaya Kombam Helpdesk</div>
                </div>
                <a
                  href="tel:+914924222123"
                  className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-xl flex items-center gap-1 shadow-2xs"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call</span>
                </a>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsContactUsthadOpen(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERIOD DETAIL POPOVER FOR PARENTS */}
      {selectedPeriodDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-900">
                Period {selectedPeriodDetail.hour} ({selectedPeriodDetail.time})
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
                {selectedPeriodDetail.subjectCode} - {selectedPeriodDetail.subjectName}
              </div>
              <div className="text-slate-500">Faculty: {selectedPeriodDetail.faculty}</div>
              <div className="text-slate-500">Room: {selectedPeriodDetail.room}</div>
              <div className="pt-1 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Status: Present & Verified in Hall</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPeriodDetail(null)}
              className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
