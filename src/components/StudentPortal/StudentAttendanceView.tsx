import React, { useState } from 'react';
import {
  ArrowLeft,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  Ban,
  Download,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Calculator,
  Calendar,
  FileText,
} from 'lucide-react';
import {
  STUDENT_COURSES_DATA,
  HOURLY_ATTENDANCE_DATA,
  TERMLY_ATTENDANCE_SEMESTER_5,
  TERMLY_ATTENDANCE_SEMESTER_6,
  HourlyAttendanceCell,
  StudentCourseAttendance,
} from '../../data/studentPortalData';

interface StudentAttendanceViewProps {
  onBack: () => void;
  onOpenDutyLeave: () => void;
  onSelectPeriod: (data: any) => void;
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({
  onBack,
  onOpenDutyLeave,
  onSelectPeriod,
}) => {
  const [activeTab, setActiveTab] = useState<'Course' | 'Hourly' | 'Termly'>('Course');
  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [selectedMonth, setSelectedMonth] = useState<string>('August');
  const [searchCourse, setSearchCourse] = useState<string>('');
  const [filterShortageOnly, setFilterShortageOnly] = useState<boolean>(false);
  const [targetPercentage, setTargetPercentage] = useState<number>(75);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);

  // Month list for Hourly tab
  const months = ['July', 'August', 'September', 'October', 'November'];

  // Filter courses
  const filteredCourses = STUDENT_COURSES_DATA.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchCourse.toLowerCase()) ||
      c.name.toLowerCase().includes(searchCourse.toLowerCase()) ||
      c.faculty.toLowerCase().includes(searchCourse.toLowerCase());
    const matchesShortage = filterShortageOnly ? c.percentage < targetPercentage : true;
    return matchesSearch && matchesShortage;
  });

  // Calculate margin/bunk for a course
  const calculateMargin = (attended: number, total: number, targetPct: number) => {
    const currentPct = total > 0 ? (attended / total) * 100 : 0;
    const targetDecimal = targetPct / 100;

    if (currentPct >= targetPct) {
      // Safe to bunk: how many future classes can we miss?
      // attended / (total + x) >= targetDecimal => attended >= targetDecimal * total + targetDecimal * x
      // x <= (attended - targetDecimal * total) / targetDecimal
      const safeToBunk = Math.floor((attended - targetDecimal * total) / targetDecimal);
      return {
        isSafe: true,
        hours: Math.max(0, safeToBunk),
        message:
          safeToBunk > 0
            ? `You can safely miss ${safeToBunk} class${safeToBunk > 1 ? 'es' : ''} without dropping below ${targetPct}%.`
            : `You are exactly at the margin (${currentPct.toFixed(1)}%). Do not miss the next class.`,
      };
    } else {
      // In shortage: how many consecutive classes must we attend?
      // (attended + x) / (total + x) >= targetDecimal
      // attended + x >= targetDecimal * total + targetDecimal * x
      // x * (1 - targetDecimal) >= targetDecimal * total - attended
      // x >= (targetDecimal * total - attended) / (1 - targetDecimal)
      const needToAttend = Math.ceil((targetDecimal * total - attended) / (1 - targetDecimal));
      return {
        isSafe: false,
        hours: Math.max(1, needToAttend),
        message: `You need to attend ${needToAttend} consecutive class${needToAttend > 1 ? 'es' : ''} to reach ${targetPct}%.`,
      };
    }
  };

  // Helper for Circular Donut Progress Ring
  const renderDonutChart = (percentage: number, size = 76, strokeWidth = 7) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let strokeColor = '#10b981'; // emerald-500 >= 75%
    if (percentage < 60) {
      strokeColor = '#f59e0b'; // amber-500 (matches screenshot yellow circle!)
    } else if (percentage < 75) {
      strokeColor = '#f59e0b'; // amber-500
    }

    return (
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress stroke */}
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
          <span className="text-[12px] font-bold text-slate-800 font-mono tracking-tighter">
            {percentage.toFixed(percentage % 1 === 0 ? 1 : 2)}%
          </span>
        </div>
      </div>
    );
  };

  // Status icon mapper for Hourly Matrix (matches the reference screenshot exactly)
  const renderHourlyStatusIcon = (status: string, cell: HourlyAttendanceCell, hourNum: number) => {
    const clickHandler = () => {
      onSelectPeriod({
        hour: hourNum,
        time:
          hourNum === 1
            ? '09:30 AM - 10:30 AM'
            : hourNum === 2
            ? '10:30 AM - 11:30 AM'
            : hourNum === 3
            ? '11:45 AM - 12:45 PM'
            : hourNum === 4
            ? '01:30 PM - 02:30 PM'
            : '02:30 PM - 03:30 PM',
        subjectCode:
          hourNum === 1
            ? 'CHE5CJ302'
            : hourNum === 2
            ? 'CHE5CJ301'
            : hourNum === 3
            ? 'CHE5FS 112'
            : hourNum === 4
            ? 'CHE5CJ303'
            : 'HIFZ501',
        subjectName:
          hourNum === 1
            ? 'Inorganic Chemistry - III'
            : hourNum === 2
            ? 'Theoretical Chemistry II'
            : hourNum === 3
            ? 'Chemistry in everyday life'
            : hourNum === 4
            ? 'Major - Organic Chemistry-III'
            : 'Tahfeezul Quran & Tajweed',
        faculty: hourNum === 3 ? 'FAUSIA K H' : hourNum === 5 ? 'Usthad Mohammed Ajash T' : 'Dr. Sreenivasan K.P',
        room: hourNum === 4 ? 'Chemistry Lab 2' : hourNum === 5 ? 'Tahfeez Chamber' : 'Room 204',
        status: status,
        topic: 'Regular curriculum lecture with practical problems and syllabus review.',
        date: cell.dayStr,
      });
    };

    switch (status) {
      case 'PRESENT':
        return (
          <button
            onClick={clickHandler}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-400 text-emerald-600 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-2xs"
            title="Present (Click for details)"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 fill-emerald-500 text-white" />
          </button>
        );
      case 'ABSENT':
        return (
          <button
            onClick={clickHandler}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-400 text-rose-600 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-2xs"
            title="Absent (Click to report discrepancy or apply leave)"
          >
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-rose-500 text-white" />
          </button>
        );
      case 'LATE':
        return (
          <button
            onClick={clickHandler}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-400 text-amber-600 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-2xs"
            title="Late (Click for details)"
          >
            <Clock className="w-4 h-4 text-amber-600" />
          </button>
        );
      case 'LET_OFF':
        return (
          <button
            onClick={clickHandler}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-2xs"
            title="Let-off / Duty Leave"
          >
            <Info className="w-4 h-4 text-slate-600" />
          </button>
        );
      case 'UNMARKED':
      default:
        return (
          <button
            onClick={clickHandler}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50/60 hover:bg-indigo-100 border border-indigo-200 text-indigo-500 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
            title="Unmarked / Free Hour"
          >
            <Ban className="w-4 h-4 text-indigo-400" />
          </button>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4 pb-24">
      {/* Top Header Bar with Back button and Title */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Attendance</h1>
            <p className="text-[11px] text-slate-500">
              Department of Chemistry · Calicut University & Tahfeez
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              showCalculator
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Attendance Target & Bunk Calculator"
          >
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Calculator</span>
          </button>
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Filter & Thresholds"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation (Course | Hourly | Termly) */}
      <div className="flex items-center border-b border-slate-200 text-sm font-semibold">
        {(['Course', 'Hourly', 'Termly'] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-center transition-colors relative cursor-pointer ${
                isActive ? 'text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab}</span>
              {isActive && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-600 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Calculator Expandable Panel (Convenience Feature) */}
      {showCalculator && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-lg space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-300" />
              <span className="text-xs font-bold tracking-wide uppercase text-indigo-200">
                Attendance Margin & Bunk Calculator
              </span>
            </div>
            <button
              onClick={() => setShowCalculator(false)}
              className="text-indigo-300 hover:text-white text-xs cursor-pointer"
            >
              × Close
            </button>
          </div>
          <p className="text-xs text-indigo-100">
            Set your target percentage to see how many classes you must attend to maintain university exam eligibility:
          </p>
          <div className="flex items-center gap-4 pt-1">
            <span className="text-xs font-bold text-indigo-200">Eligibility Target:</span>
            <div className="flex items-center gap-1.5">
              {[70, 75, 80, 85].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setTargetPercentage(pct)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    targetPercentage === pct
                      ? 'bg-indigo-500 text-white ring-2 ring-white/50'
                      : 'bg-white/10 hover:bg-white/20 text-indigo-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter Drawer */}
      {showFilterDrawer && (
        <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={filterShortageOnly}
              onChange={(e) => setFilterShortageOnly(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span>Show Only Shortage Courses (&lt; {targetPercentage}%)</span>
          </label>
          <button
            onClick={onOpenDutyLeave}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Apply for Duty Leave</span>
          </button>
        </div>
      )}

      {/* TAB 1: COURSE TAB */}
      {activeTab === 'Course' && (
        <div className="space-y-3.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search course code or faculty..."
              value={searchCourse}
              onChange={(e) => setSearchCourse(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* List of Courses (Matching Screenshot 4) */}
          <div className="space-y-3">
            {filteredCourses.map((course) => {
              const margin = calculateMargin(
                course.attendedHours,
                course.totalHours,
                targetPercentage
              );

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:border-indigo-200 transition-all space-y-3.5"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Circular Percentage Meter (Donut chart on left) */}
                    {renderDonutChart(course.percentage, 78, 8)}

                    {/* Course Code & Name & Faculty */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                        {course.code}-{course.name}
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">
                        Faculty: {course.faculty}
                      </div>
                    </div>
                  </div>

                  {/* Stat Capsules: Total Hours vs Attended (Matches Screenshot 4) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-2.5 text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Total Hours
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-slate-800 font-mono mt-0.5 tabular-nums">
                        {course.totalHours}
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl p-2.5 text-center">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        Attended
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-slate-800 font-mono mt-0.5 tabular-nums">
                        {course.attendedHours}
                      </div>
                    </div>
                  </div>

                  {/* Calculator Advice Strip */}
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                      margin.isSafe
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50/80 border-amber-200 text-amber-950 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {margin.isSafe ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span>{margin.message}</span>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('Hourly');
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:underline shrink-0 cursor-pointer"
                    >
                      View Log →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: HOURLY MATRIX TAB */}
      {activeTab === 'Hourly' && (
        <div className="space-y-4">
          {/* Horizontal Month Chips (Matches Screenshot 5) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {months.map((m) => {
              const isSelected = selectedMonth === m;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-white border-2 border-slate-900 text-slate-900 shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Matrix Card (Matches Screenshot 5) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-6 p-3.5 bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-600 text-center">
              <div className="text-left pl-2">Day</div>
              <div>H1</div>
              <div>H2</div>
              <div>H3</div>
              <div>H4</div>
              <div>H5</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-100">
              {(HOURLY_ATTENDANCE_DATA[selectedMonth] || []).map((row) => (
                <div
                  key={row.dayStr}
                  className="grid grid-cols-6 items-center p-3 text-center hover:bg-slate-50/60 transition-colors"
                >
                  <div className="text-left pl-2 text-xs font-semibold text-slate-800 font-mono">
                    {row.dayStr}
                  </div>
                  <div className="flex justify-center">{renderHourlyStatusIcon(row.h1, row, 1)}</div>
                  <div className="flex justify-center">{renderHourlyStatusIcon(row.h2, row, 2)}</div>
                  <div className="flex justify-center">{renderHourlyStatusIcon(row.h3, row, 3)}</div>
                  <div className="flex justify-center">{renderHourlyStatusIcon(row.h4, row, 4)}</div>
                  <div className="flex justify-center">{renderHourlyStatusIcon(row.h5, row, 5)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend (Matches Screenshot 5) */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Attendance Legend & Status
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full border border-emerald-300 text-emerald-800 bg-emerald-50 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Present
              </span>
              <span className="px-3 py-1 rounded-full border border-rose-300 text-rose-800 bg-rose-50 font-bold flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600" /> Absent
              </span>
              <span className="px-3 py-1 rounded-full border border-amber-300 text-amber-800 bg-amber-50 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Late
              </span>
              <span className="px-3 py-1 rounded-full border border-slate-300 text-slate-700 bg-slate-50 font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-500" /> Let-off
              </span>
              <span className="px-3 py-1 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50 font-bold flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-indigo-400" /> Unmarked
              </span>
            </div>
            <p className="text-[10px] text-slate-400 text-center pt-1">
              Tap any icon to view class subject, room, teacher, or submit a duty-leave correction.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: TERMLY TAB */}
      {activeTab === 'Termly' && (
        <div className="space-y-4">
          {/* Semester Selector Header (Matches Screenshot 6) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900">
                Semester-{selectedSemester}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold">
                {selectedSemester === 6 ? 'Current' : 'Previous'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {[5, 6].map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSemester === sem
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Sem {sem}
                </button>
              ))}
            </div>
          </div>

          {/* Main Term Gauge Card (Matches Screenshot 6) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col items-center justify-center space-y-4">
            {/* Big Circular Percentage Gauge */}
            {renderDonutChart(selectedSemester === 5 ? 58.3 : 91.3, 150, 14)}

            {/* Term Period */}
            <div className="text-center space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Term
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tracking-tight">
                {selectedSemester === 5 ? '01-06-2026 To 30-10-2026' : '01-11-2026 To 31-03-2027'}
              </div>
            </div>

            {selectedSemester === 5 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 text-center font-medium max-w-sm">
                Shortage Alert: Attendance is currently 58.3%. Minimum requirement for University Exam hall ticket eligibility is 75.0%.
              </div>
            )}
          </div>

          {/* Monthly Breakdown Table (Matches Screenshot 6) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3.5 text-center">SI</th>
                  <th className="py-3 px-3">Year</th>
                  <th className="py-3 px-3">Month</th>
                  <th className="py-3 px-3 text-right">Attendan...</th>
                  <th className="py-3 px-3 text-right">Total</th>
                  <th className="py-3 px-3.5 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedSemester === 5
                  ? TERMLY_ATTENDANCE_SEMESTER_5
                  : TERMLY_ATTENDANCE_SEMESTER_6
                ).map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3.5 text-center font-bold text-slate-900">{row.sl}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{row.year}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{row.month}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                      {row.attendance.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">
                      {row.total.toFixed(1)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-extrabold text-slate-900">
                      {row.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-extrabold text-slate-900">
                  <td colSpan={3} className="py-3 px-3.5 text-left font-bold text-slate-600">
                    Total
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {selectedSemester === 5 ? '38.5' : '32.0'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {selectedSemester === 5 ? '66.0' : '35.0'}
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-indigo-700">
                    {selectedSemester === 5 ? '58.3%' : '91.4%'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Statement download action */}
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
            <div>
              <div className="text-xs font-bold text-slate-900">Official Attendance Statement</div>
              <div className="text-[10px] text-slate-500">Certified by Principal & Academic Dean</div>
            </div>
            <button
              onClick={() => alert('Attendance statement downloaded successfully for Semester ' + selectedSemester)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
