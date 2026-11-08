import React, { useState, useRef } from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import { Student, HifzRecord, UserProfile, TeacherEvaluation } from '../types';
import { JUZ_NAMES } from '../data/quranData';
import { api } from '../services/api';
import {
  BookOpen,
  CalendarCheck,
  Sparkles,
  IdCard,
  Clock,
  MessageSquare,
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Camera,
  Loader2,
  Edit2,
  Phone,
} from 'lucide-react';

interface StudentDashboardProps {
  currentUser: UserProfile;
  student: Student;
  records: HifzRecord[];
  evaluations: TeacherEvaluation[];
  onOpenIdCard: () => void;
  onOpenTimetable: () => void;
  onOpenFeedback: () => void;
  onNavigate: (tab: string) => void;
  onStudentUpdated?: (student: Student) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  student,
  records,
  evaluations,
  onOpenIdCard,
  onOpenTimetable,
  onOpenFeedback,
  onNavigate,
  onStudentUpdated,
}) => {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be smaller than 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      const uploadRes = await api.uploadMedia(file, 'students', student.photoPublicId);
      const updated = await api.updateStudent(student.id, {
        photo: uploadRes.secure_url,
        photoPublicId: uploadRes.public_id,
      });
      if (onStudentUpdated) {
        onStudentUpdated(updated);
      }
      setPhotoMessage('Profile photo updated successfully!');
      setTimeout(() => setPhotoMessage(null), 4000);
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      alert('Failed to upload photo. Please try another image.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const studentRecords = records.filter((r) => r.studentId === student.id);
  const latestSabq = studentRecords.find((r) => r.recordType === 'SABQ');
  const latestMurajath = studentRecords.find((r) => r.recordType === 'MURAJATH');
  const latestManzil = studentRecords.find((r) => r.recordType === 'MANZIL');

  const pendingEval = evaluations.find((e) => e.status === 'Pending');
  const completedJuzCount = student.completedJuzList.length;
  const progressPercent = Math.round((completedJuzCount / 30) * 100);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Photo update status toast */}
      {photoMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{photoMessage}</span>
          </div>
          <button onClick={() => setPhotoMessage(null)} className="text-emerald-700 hover:text-emerald-950">×</button>
        </div>
      )}

      {/* Student Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0 group">
            <img
              src={student.photo}
              alt={student.fullName}
              className="w-14 h-14 sm:w-18 sm:h-18 rounded-full object-cover border-2 sm:border-4 border-white/80 shadow-md group-hover:opacity-85 transition-opacity"
              referrerPolicy="no-referrer"
            />
            {/* Camera upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              title="Upload new profile photo"
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-white flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Camera className="w-3 h-3" />
              )}
            </button>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-extrabold uppercase tracking-tight text-white leading-tight">
                {student.fullName}
              </h1>
              <span className="text-xs text-emerald-300 font-arabic hidden sm:inline">
                {student.arabicName}
              </span>
            </div>
            <div className="text-xs text-emerald-200 font-mono mt-0.5">
              Admission No : {student.admissionNumber} · Roll #{student.rollNumber}
            </div>
            <div className="text-[11px] text-emerald-100/80">
              Batch A (Hifz Ul Uloom) · {INSTITUTION_INFO.shortAddress}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={onOpenIdCard}
            className="px-3.5 py-2 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <IdCard className="w-4 h-4 text-emerald-700" />
            <span>Digital ID Card</span>
          </button>
          <button
            onClick={onOpenTimetable}
            className="px-3 py-2 bg-emerald-800/80 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl border border-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-200" />
            <span>Timetable</span>
          </button>
        </div>
      </div>

      {/* Mandatory Feedback Pending Alert Box */}
      {pendingEval && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-rose-950">
                  Faculty Evaluation Required
                </h3>
                <span className="text-[9px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded-full uppercase">
                  Pending
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-rose-800 mt-0.5 leading-normal">
                Please complete your student review for <strong>{pendingEval.course}</strong> (Odd Semester 2026-27).
              </p>
            </div>
          </div>

          <button
            onClick={onOpenFeedback}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer whitespace-nowrap"
          >
            Complete Feedback
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Current Memorization
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-800 mt-1 tabular-nums">
            Juz {student.currentJuz}
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-700 font-medium mt-0.5">Active daily Sabq</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Finished Juz
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {completedJuzCount} / 30
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">{progressPercent}% of the Quran</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Attendance Rate
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 mt-1 tabular-nums">
            {student.attendanceRate}%
          </div>
          <div className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-0.5">Regular and on time</div>
        </div>

        <div className="bg-white p-3.5 sm:p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Memorized Ayahs
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 mt-1 tabular-nums">
            {student.totalMemorizedAyahs.toLocaleString()}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">Total verified Ayahs</div>
        </div>
      </div>

      {/* 30-Juz Progress Bar & Visual Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">Holy Quran 30-Juz Memorization Status</h2>
            <p className="text-xs text-slate-500">Track your completed and active Juz portions</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs sm:text-sm font-extrabold font-mono text-emerald-800">
              {completedJuzCount} of 30 Juz Completed ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Continuous progress bar */}
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-700 to-teal-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* 30-Juz responsive pills grid */}
        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5 pt-1">
          {JUZ_NAMES.map((j) => {
            const isCompleted = student.completedJuzList.includes(j.juz);
            const isCurrent = student.currentJuz === j.juz && !isCompleted;

            return (
              <div
                key={j.juz}
                className={`py-1.5 px-0.5 rounded-lg text-center font-mono text-[11px] font-bold transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
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

      {/* Latest Academic Lessons */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Latest Recitation Evaluations</h2>
            <p className="text-xs text-slate-500">Evaluated by mentor Usthad Mohammed Ajash T.</p>
          </div>
          <button
            onClick={() => onNavigate('hifz')}
            className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            History →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Sabq */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-950">Sabq (السبق)</span>
              <span className="text-[10px] font-bold bg-emerald-200 text-emerald-950 px-1.5 py-0.2 rounded">
                {latestSabq?.status || 'Passed'}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              Surah {latestSabq?.surahName || 'Al-Anbiya'}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              Ayah {latestSabq?.startAyah || 1} → {latestSabq?.endAyah || 15}
            </div>
            <div className="text-[10px] text-slate-500 italic pt-1 border-t border-emerald-100">
              "{latestSabq?.teacherRemarks}"
            </div>
          </div>

          {/* Murajath */}
          <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-teal-950">Murajath (المراجعة)</span>
              <span className="text-[10px] font-bold bg-teal-200 text-teal-950 px-1.5 py-0.2 rounded">
                {latestMurajath?.status || 'Passed'}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              Surah {latestMurajath?.surahName || 'Taha'}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              Ayah {latestMurajath?.startAyah || 80} → {latestMurajath?.endAyah || 135}
            </div>
            <div className="text-[10px] text-slate-500 italic pt-1 border-t border-teal-100">
              "{latestMurajath?.teacherRemarks}"
            </div>
          </div>

          {/* Manzil */}
          <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/50 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-sky-950">Manzil (المنزل)</span>
              <span className="text-[10px] font-bold bg-sky-200 text-sky-950 px-1.5 py-0.2 rounded">
                {latestManzil?.status || 'Passed'}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-900">
              Juz {latestManzil?.juzNumber || 15} Revision
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              {latestManzil?.surahRangeText || 'Al-Isra 1 to Al-Kahf 74'}
            </div>
            <div className="text-[10px] text-slate-500 italic pt-1 border-t border-sky-100">
              "{latestManzil?.teacherRemarks}"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
