import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  CalendarCheck,
  Clock,
  IdCard,
  BookOpen,
  Award,
  CreditCard,
  Plus,
  ArrowRight,
  Megaphone,
  Calendar,
  X,
  MapPin,
  ChevronRight,
  Maximize2,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  STUDENT_PROFILE_DATA,
  TODAY_ATTENDANCE_HOURS,
  ALL_FAVORITES_OPTIONS,
  DEFAULT_PINNED_FAVORITES,
  STUDENT_COURSES_DATA,
} from '../../data/studentPortalData';

interface StudentPortalHomeProps {
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
  pinnedFavoriteIds: string[];
}

export const StudentPortalHome: React.FC<StudentPortalHomeProps> = ({
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
  pinnedFavoriteIds,
}) => {
  const [showCampusBanner, setShowCampusBanner] = useState<boolean>(true);
  const [activeAttendanceFilter, setActiveAttendanceFilter] = useState<number | null>(null);
  const [semesterView, setSemesterView] = useState<number>(5); // 5 or 6

  // Formatted today date string
  const todayDateString = 'Monday, November 09';

  // Circular gauge renderer
  const renderMiniDonut = (percentage: number, size = 96, strokeWidth = 8) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let strokeColor = '#10b981'; // emerald
    if (percentage === 0) {
      strokeColor = '#e2e8f0'; // slate-200
    } else if (percentage < 60) {
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
            {percentage.toFixed(2)}%
          </span>
        </div>
      </div>
    );
  };

  // Launch shortcut from favorites
  const handleLaunchFavorite = (id: string) => {
    switch (id) {
      case 'fav_attendance':
        onOpenAttendance();
        break;
      case 'fav_timetable':
        onOpenTimetable();
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
        onOpenFeedback();
        break;
      case 'fav_marks':
        alert('Continuous Internal Evaluation: Grade A+ (88.4%)');
        break;
      case 'fav_library':
        alert('Digital Library Portal: 4 books active on card #KIAYSCH024.');
        break;
      default:
        break;
    }
  };

  // Current semester stats
  const semTotalHours = semesterView === 5 ? 66.0 : 35.0;
  const semHoursPresent = semesterView === 5 ? 38.5 : 32.0;
  const semPercentage = semesterView === 5 ? 58.3 : 91.4;

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4 sm:space-y-5 pb-28">
      {/* 1. TOP HEADER (Matches Screenshot 1 & 2) */}
      <div className="flex items-center justify-between pt-1 pb-1">
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-3 text-left group cursor-pointer"
        >
          {/* Avatar with glow */}
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm ring-2 ring-slate-100 group-hover:ring-indigo-300 transition-all bg-slate-100 shrink-0">
            <img
              src={STUDENT_PROFILE_DATA.avatarUrl}
              alt={STUDENT_PROFILE_DATA.fullName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors uppercase">
                {STUDENT_PROFILE_DATA.fullName}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500 text-white shrink-0" />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Admission No : {STUDENT_PROFILE_DATA.admissionNo}
            </div>
          </div>
        </button>

        {/* Notification Bell Button (Matches Screenshot 1 & 2) */}
        <button
          onClick={onOpenNotifications}
          className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors relative cursor-pointer"
          title="Notifications & Circulars"
        >
          <Bell className="w-5 h-5" />
          {/* Active dot indicator */}
          <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white"></span>
        </button>
      </div>

      {/* 2. CAMPUS PHOTO BANNER (Matches Screenshot 1) */}
      {showCampusBanner && (
        <div className="relative rounded-3xl overflow-hidden shadow-sm border border-slate-200 group animate-fade-in">
          <img
            src={STUDENT_PROFILE_DATA.campusPhotoUrl}
            alt={STUDENT_PROFILE_DATA.collegeName}
            className="w-full h-44 sm:h-52 object-cover transition-transform duration-700 group-hover:scale-102"
            referrerPolicy="no-referrer"
          />

          {/* Dismiss button on top right */}
          <button
            onClick={() => setShowCampusBanner(false)}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer backdrop-blur-xs"
            title="Dismiss photo"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Bottom scrim label with college name */}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white">
            <div className="text-xs sm:text-sm font-extrabold tracking-tight leading-snug">
              {STUDENT_PROFILE_DATA.collegeName}
            </div>
            <div className="text-[10px] text-slate-300 font-medium">
              Estd. 1994 · Kombam, Kodakkad, Mannarkkad, Palakkad
            </div>
          </div>
        </div>
      )}

      {/* 3. TODAY'S ATTENDANCE CARD (Matches Screenshot 1) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
        {/* Card Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Today's Attendance
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {todayDateString}
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
            5/5
          </span>
        </div>

        {/* Period Hour Circles: 1 hr, 2 hr, 3 hr, 4 hr, 5 hr */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          {TODAY_ATTENDANCE_HOURS.map((slot) => (
            <button
              key={slot.hour}
              onClick={() => onOpenPeriodDetail(slot)}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/50 flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs group"
              title={`Period ${slot.hour}: ${slot.subjectName} (${slot.time})`}
            >
              <span className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-indigo-700">
                {slot.hour} hr
              </span>
            </button>
          ))}
        </div>

        <div className="text-[11px] text-slate-400 text-center pt-1 border-t border-slate-100">
          Tap any hour to inspect faculty, room number, or topic covered
        </div>
      </div>

      {/* 4. FAVORITES CARD (Matches Screenshot 1) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Favorites</h2>
          <button
            onClick={onOpenFavoritesCustomizer}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            Customize
          </button>
        </div>

        {/* Add favorite menus button (Matches Screenshot 1) */}
        <button
          onClick={onOpenFavoritesCustomizer}
          className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 flex items-center gap-3 transition-colors text-left cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 shadow-2xs">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xs sm:text-sm text-slate-700">
              Now you can add your <strong className="text-slate-900 font-extrabold">favorite menus</strong> here
            </span>
            <div className="text-[11px] text-slate-400">
              Pin shortcuts for timetable, attendance, Quran tracker & more
            </div>
          </div>
        </button>

        {/* Pinned Favorite Quick Chips */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
          {pinnedFavoriteIds.map((id) => {
            const item = ALL_FAVORITES_OPTIONS.find((f) => f.id === id);
            if (!item) return null;

            return (
              <button
                key={id}
                onClick={() => handleLaunchFavorite(id)}
                className="p-2.5 rounded-2xl border border-slate-200/90 hover:border-indigo-300 bg-white hover:bg-slate-50 flex flex-col items-center text-center transition-all cursor-pointer group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                  {item.title.charAt(0)}
                </div>
                <span className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-700 mt-1 truncate max-w-full">
                  {item.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. TODAY'S SCHEDULE CARD (Matches Screenshot 1) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Today's schedule
            </h2>
            <p className="text-xs text-slate-500 font-medium">Monday, Nov 9</p>
          </div>
          <button
            onClick={onOpenTimetable}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            Weekly Schedule →
          </button>
        </div>

        {/* Timeline item */}
        <div className="flex items-start gap-3 pt-1">
          {/* Blue exclamation indicator circle matching screenshot */}
          <div className="relative flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              !
            </div>
            <div className="w-0.5 h-16 bg-blue-200 my-1"></div>
          </div>

          {/* Schedule content card matching screenshot */}
          <div className="flex-1 p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-1">
            <div className="text-xs font-mono font-semibold text-slate-400">
              10:30 AM - 11:30 AM (Hour 2)
            </div>
            <div className="text-sm font-bold text-slate-900">
              CHE5CJ301 - Theoretical Chemistry II
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Class Room : Room 204 (Chemistry Block)</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Faculty: Dr. Sreenivasan K.P.
            </div>
          </div>
        </div>
      </div>

      {/* 6. SEMESTER WISE ATTENDANCE CARD (Matches Screenshot 2) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Semester Wise Attendance
          </h2>
          <button
            onClick={onOpenAttendance}
            className="text-xs font-bold text-slate-800 hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>See All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Semester 6 / 5 Toggle & Stats */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div>
              <div className="text-sm font-extrabold text-slate-900">
                Semester {semesterView}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {semesterView === 6 ? 'Current Semester' : 'Odd Semester'}
              </div>
            </div>

            <div className="space-y-1 pt-1 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-3 rounded-full bg-slate-300"></span>
                <span>Total Hours: <strong>{semTotalHours.toFixed(1)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-1.5 h-3 rounded-full bg-indigo-600"></span>
                <span>Hours Present: <strong>{semHoursPresent.toFixed(1)}</strong></span>
              </div>
            </div>

            {/* Quick semester switcher */}
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

          {/* Circular Donut Gauge on the right (Matches Screenshot 2) */}
          <div onClick={onOpenAttendance} className="cursor-pointer group">
            {renderMiniDonut(semPercentage, 100, 9)}
          </div>
        </div>

        {/* Shortage guidance strip */}
        {semPercentage < 75 ? (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <span>
              Attendance is at <strong>{semPercentage}%</strong>. Target 75% for exam clearance.
            </span>
            <button
              onClick={onOpenAttendance}
              className="text-xs font-extrabold text-indigo-700 hover:underline shrink-0 ml-2 cursor-pointer"
            >
              Analyze →
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <span>
              Great record! You are at <strong>{semPercentage}%</strong> (Eligible for exams).
            </span>
            <button
              onClick={onOpenAttendance}
              className="text-xs font-extrabold text-emerald-800 hover:underline shrink-0 ml-2 cursor-pointer"
            >
              Details →
            </button>
          </div>
        )}
      </div>

      {/* 7. NOTICE BOARD (Matches Screenshot 2) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Notice Board</h2>
          <button
            onClick={onOpenNotifications}
            className="text-xs font-bold text-slate-800 hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>See All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quiet card matching Screenshot 2 */}
        <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Notice Board is Quiet Today</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Stay tuned — exciting updates are on the way
            </div>
          </div>
        </div>
      </div>

      {/* 8. EVENTS & NEWS (Matches Screenshot 2) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Events & News</h2>
          <button
            onClick={() => alert('College Events: Annual Chemistry Exhibition scheduled for Dec 15.')}
            className="text-xs font-bold text-slate-800 hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>See All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Coming soon card matching Screenshot 2 */}
        <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Big Things Coming Soon</div>
            <div className="text-xs text-slate-500 mt-0.5">
              New updates and upcoming events will be available soon.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
