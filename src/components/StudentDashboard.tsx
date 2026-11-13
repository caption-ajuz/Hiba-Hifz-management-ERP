import React, { useState, useRef } from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import { Student, HifzRecord, UserProfile, TeacherEvaluation } from '../types';
import { JUZ_NAMES } from '../data/quranData';
import { api } from '../services/api';
import {
  Home,
  LayoutGrid,
  User,
  ArrowLeft,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
  Camera,
  Loader2,
} from 'lucide-react';

// Subcomponents for Student Portal
import { StudentPortalHome } from './StudentPortal/StudentPortalHome';
import { StudentAttendanceView } from './StudentPortal/StudentAttendanceView';
import { StudentProfileView } from './StudentPortal/StudentProfileView';
import { StudentMenuView } from './StudentPortal/StudentMenuView';
import { StudentPeriodDetailModal } from './StudentPortal/StudentPeriodDetailModal';
import { StudentDutyLeaveModal } from './StudentPortal/StudentDutyLeaveModal';
import { StudentFavoritesModal } from './StudentPortal/StudentFavoritesModal';
import { StudentNotificationsModal } from './StudentPortal/StudentNotificationsModal';
import { DEFAULT_PINNED_FAVORITES } from '../data/studentPortalData';

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
  // Navigation within the student portal
  const [activePortalTab, setActivePortalTab] = useState<'home' | 'menu' | 'profile' | 'attendance' | 'hifz'>('home');
  const [pinnedFavorites, setPinnedFavorites] = useState<string[]>(DEFAULT_PINNED_FAVORITES);

  // Modals
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isDutyLeaveOpen, setIsDutyLeaveOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);

  // Profile photo upload
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

  // Hifz stats
  const studentRecords = records.filter((r) => r.studentId === student.id);
  const latestSabq = studentRecords.find((r) => r.recordType === 'SABQ');
  const latestMurajath = studentRecords.find((r) => r.recordType === 'MURAJATH');
  const latestManzil = studentRecords.find((r) => r.recordType === 'MANZIL');
  const completedJuzCount = student.completedJuzList.length;
  const progressPercent = Math.round((completedJuzCount / 30) * 100);

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 relative">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Photo update toast notification */}
      {photoMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{photoMessage}</span>
          <button onClick={() => setPhotoMessage(null)} className="ml-2 text-emerald-700 hover:text-emerald-950">×</button>
        </div>
      )}

      {/* Main Viewport Content based on active portal tab */}
      {activePortalTab === 'home' && (
        <StudentPortalHome
          onOpenAttendance={() => setActivePortalTab('attendance')}
          onOpenProfile={() => setActivePortalTab('profile')}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenFavoritesCustomizer={() => setIsFavoritesOpen(true)}
          onOpenPeriodDetail={(slot) => setSelectedPeriod(slot)}
          onOpenTimetable={onOpenTimetable}
          onOpenIdCard={onOpenIdCard}
          onOpenDutyLeave={() => setIsDutyLeaveOpen(true)}
          onOpenHifz={() => setActivePortalTab('hifz')}
          onOpenFeedback={onOpenFeedback}
          pinnedFavoriteIds={pinnedFavorites}
        />
      )}

      {activePortalTab === 'attendance' && (
        <StudentAttendanceView
          onBack={() => setActivePortalTab('home')}
          onOpenDutyLeave={() => setIsDutyLeaveOpen(true)}
          onSelectPeriod={(slot) => setSelectedPeriod(slot)}
        />
      )}

      {activePortalTab === 'menu' && (
        <StudentMenuView
          onNavigateTab={onNavigate}
          onOpenAttendance={() => setActivePortalTab('attendance')}
          onOpenIdCard={onOpenIdCard}
          onOpenTimetable={onOpenTimetable}
          onOpenFeedback={onOpenFeedback}
          onOpenDutyLeave={() => setIsDutyLeaveOpen(true)}
          onOpenHifz={() => setActivePortalTab('hifz')}
        />
      )}

      {activePortalTab === 'profile' && (
        <StudentProfileView
          onOpenIdCard={onOpenIdCard}
          onLogout={() => {
            localStorage.removeItem('hyba_auth_user_id');
            window.location.reload();
          }}
          onChangePhoto={() => fileInputRef.current?.click()}
        />
      )}

      {/* Dedicated Hifz Tracker view if navigated */}
      {activePortalTab === 'hifz' && (
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-28">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActivePortalTab('home')}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Tahfeezul Quran Tracker
                </h1>
                <p className="text-xs text-slate-500">
                  Mentor: Usthad Mohammed Ajash T. · Juz {student.currentJuz} Active Sabq
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('hifz')}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Full Academy Records →
            </button>
          </div>

          {/* 30-Juz Progress Bar & Visual Grid */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Holy Quran 30-Juz Memorization Status
                </h2>
                <p className="text-xs text-slate-500">
                  {completedJuzCount} of 30 Juz memorized with Tajweed
                </p>
              </div>
              <span className="text-sm font-extrabold font-mono text-emerald-800">
                {progressPercent}% Complete
              </span>
            </div>

            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5 pt-2">
              {JUZ_NAMES.map((j) => {
                const isCompleted = student.completedJuzList.includes(j.juz);
                const isCurrent = student.currentJuz === j.juz && !isCompleted;

                return (
                  <div
                    key={j.juz}
                    className={`py-2 px-1 rounded-xl text-center font-mono text-[11px] font-bold transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : isCurrent
                        ? 'bg-amber-500 text-white ring-2 ring-amber-400 font-extrabold'
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

          {/* Recitation Lessons: Sabq, Murajath, Manzil */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-3xl border border-emerald-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Sabq (السبق)</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                  {latestSabq?.status || 'Passed'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                Surah {latestSabq?.surahName || 'Al-Anbiya'}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Ayah {latestSabq?.startAyah || 1} → {latestSabq?.endAyah || 15}
              </div>
              <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-100">
                "{latestSabq?.teacherRemarks}"
              </p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-teal-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">Murajath (المراجعة)</span>
                <span className="text-[10px] font-bold bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">
                  {latestMurajath?.status || 'Passed'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                Surah {latestMurajath?.surahName || 'Taha'}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Ayah {latestMurajath?.startAyah || 80} → {latestMurajath?.endAyah || 135}
              </div>
              <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-100">
                "{latestMurajath?.teacherRemarks}"
              </p>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-sky-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950 uppercase tracking-wider">Manzil (المنزل)</span>
                <span className="text-[10px] font-bold bg-sky-100 text-sky-900 px-2 py-0.5 rounded-full">
                  {latestManzil?.status || 'Passed'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                Juz {latestManzil?.juzNumber || 15} Revision
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {latestManzil?.surahRangeText || 'Al-Isra 1 to Al-Kahf 74'}
              </div>
              <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-100">
                "{latestManzil?.teacherRemarks}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (Matches Screenshots 1, 2, 3) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-6 py-2">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {/* 1. Home Tab */}
          <button
            onClick={() => setActivePortalTab('home')}
            className="flex flex-col items-center justify-center cursor-pointer group"
          >
            <div
              className={`px-4 py-1 rounded-full transition-colors ${
                activePortalTab === 'home'
                  ? 'bg-indigo-100 text-indigo-700 font-bold'
                  : 'text-slate-500 group-hover:text-slate-800'
              }`}
            >
              <Home className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 font-medium ${
                activePortalTab === 'home' ? 'text-slate-900 font-bold' : 'text-slate-500'
              }`}
            >
              Home
            </span>
          </button>

          {/* 2. Menu Tab */}
          <button
            onClick={() => setActivePortalTab('menu')}
            className="flex flex-col items-center justify-center cursor-pointer group"
          >
            <div
              className={`px-4 py-1 rounded-full transition-colors ${
                activePortalTab === 'menu'
                  ? 'bg-indigo-100 text-indigo-700 font-bold'
                  : 'text-slate-500 group-hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 font-medium ${
                activePortalTab === 'menu' ? 'text-slate-900 font-bold' : 'text-slate-500'
              }`}
            >
              Menu
            </span>
          </button>

          {/* 3. Profile Tab */}
          <button
            onClick={() => setActivePortalTab('profile')}
            className="flex flex-col items-center justify-center cursor-pointer group"
          >
            <div
              className={`px-4 py-1 rounded-full transition-colors ${
                activePortalTab === 'profile'
                  ? 'bg-indigo-100 text-indigo-700 font-bold'
                  : 'text-slate-500 group-hover:text-slate-800'
              }`}
            >
              <User className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] mt-0.5 font-medium ${
                activePortalTab === 'profile' ? 'text-slate-900 font-bold' : 'text-slate-500'
              }`}
            >
              Profile
            </span>
          </button>
        </div>
      </div>

      {/* Sub-Modals */}
      <StudentPeriodDetailModal
        isOpen={Boolean(selectedPeriod)}
        onClose={() => setSelectedPeriod(null)}
        periodData={selectedPeriod}
        onOpenDutyLeave={() => {
          setSelectedPeriod(null);
          setIsDutyLeaveOpen(true);
        }}
      />

      <StudentDutyLeaveModal
        isOpen={isDutyLeaveOpen}
        onClose={() => setIsDutyLeaveOpen(false)}
      />

      <StudentFavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        pinnedIds={pinnedFavorites}
        onSavePinned={(newIds) => setPinnedFavorites(newIds)}
      />

      <StudentNotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </div>
  );
};
