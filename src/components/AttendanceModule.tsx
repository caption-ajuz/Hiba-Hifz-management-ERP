import React, { useState } from 'react';
import {
  Student,
  AttendanceStatus,
  AttendanceSession,
  ClassBatch,
  UserProfile,
} from '../types';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  CheckCheck,
  RotateCcw,
  LayoutGrid,
  List,
  Search,
  AlertTriangle,
  Info,
  ChevronDown,
  User,
  Sparkles,
  Save,
} from 'lucide-react';

interface AttendanceModuleProps {
  students: Student[];
  classes: ClassBatch[];
  currentUser: UserProfile;
  initialSession: AttendanceSession;
  onSaveSession: (session: AttendanceSession) => void;
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  students,
  classes,
  currentUser,
  initialSession,
  onSaveSession,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(initialSession.classId || 'batch-a');
  const [selectedDate, setSelectedDate] = useState<string>(initialSession.date || '2026-11-07');
  const [selectedHour, setSelectedHour] = useState<number>(initialSession.sessionHour || 1);
  const [sessionTopic, setSessionTopic] = useState<string>(initialSession.topic || 'Surah Al-Anbiya & Juz 17 Murajath');
  const [sessionDesc, setSessionDesc] = useState<string>(
    initialSession.description || 'Morning Fajr session. Checked individual Sabq memorization.'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'roll' | 'name'>('roll');
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>(initialSession.records || {});
  const [activeStudentHover, setActiveStudentHover] = useState<Student | null>(null);
  const [showUnmarkedModal, setShowUnmarkedModal] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  // Filter students by selected class
  const classStudents = students.filter((s) => s.classId === selectedClassId);

  // Sort students
  const sortedStudents = [...classStudents].sort((a, b) => {
    if (sortBy === 'roll') {
      return a.rollNumber - b.rollNumber;
    }
    return a.fullName.localeCompare(b.fullName);
  });

  // Filter by search
  const filteredStudents = sortedStudents.filter((s) =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rollNumber.toString().includes(searchQuery) ||
    s.admissionNumber.includes(searchQuery)
  );

  // Session hours metadata
  const sessionHours = [
    { hour: 1, name: 'Fajr Sabq', time: '07:00 - 08:30' },
    { hour: 2, name: 'Murajath', time: '09:00 - 10:30' },
    { hour: 3, name: 'Tajweed', time: '11:00 - 12:30' },
    { hour: 4, name: 'Manzil', time: '14:00 - 16:00' },
    { hour: 5, name: 'Testing', time: '16:30 - 17:30' },
  ];

  // Calculate live summary stats
  const total = classStudents.length;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let notMarkedCount = 0;

  classStudents.forEach((student) => {
    const status = records[student.id];
    if (status === 'PRESENT') presentCount++;
    else if (status === 'ABSENT') absentCount++;
    else if (status === 'LATE') lateCount++;
    else notMarkedCount++;
  });

  // Cycle status on student click: PRESENT -> ABSENT -> LATE -> NOT_MARKED -> PRESENT
  const cycleStatus = (studentId: string) => {
    const current = records[studentId];
    let next: AttendanceStatus;
    if (current === 'PRESENT') next = 'ABSENT';
    else if (current === 'ABSENT') next = 'LATE';
    else if (current === 'LATE') next = 'NOT_MARKED';
    else next = 'PRESENT';

    setRecords((prev) => ({
      ...prev,
      [studentId]: next,
    }));
  };

  const setDirectStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      updated[s.id] = 'PRESENT';
    });
    setRecords(updated);
  };

  const handleResetAttendance = () => {
    const updated: Record<string, AttendanceStatus> = {};
    classStudents.forEach((s) => {
      updated[s.id] = 'NOT_MARKED';
    });
    setRecords(updated);
  };

  const handleSubmit = () => {
    if (notMarkedCount > 0) {
      setShowUnmarkedModal(true);
      return;
    }
    saveSessionData();
  };

  const saveSessionData = () => {
    const sessionObj: AttendanceSession = {
      id: `session_${selectedClassId}_${selectedDate}_h${selectedHour}`,
      classId: selectedClassId,
      date: selectedDate,
      sessionHour: selectedHour,
      sessionName: `Hour ${selectedHour} · ${sessionHours.find((h) => h.hour === selectedHour)?.name || ''}`,
      usthadId: currentUser.id,
      topic: sessionTopic || 'Tahfeez Daily Session',
      description: sessionDesc,
      records: records,
      submittedAt: new Date().toISOString(),
    };

    onSaveSession(sessionObj);
    setShowUnmarkedModal(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3500);
  };

  const currentClassObj = classes.find((c) => c.id === selectedClassId) || classes[0];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Toast Alert */}
      {showSuccessToast && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-700 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <div className="font-bold">Attendance Saved Successfully</div>
            <div className="text-[11px] text-emerald-200">
              {currentClassObj.name} · Hour {selectedHour} recorded.
            </div>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Attendance Ledger</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Attendance Register & Status Grid
            </h1>
          </div>

          {/* Quick Date and Class Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden"
              />
            </div>

            <div className="relative flex-1 sm:flex-none">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-hidden pr-7 cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.totalStudents})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Hour / Session Selector (Inspired by EMBASE Screenshot: Select hour 1 2 3 4 5) */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center justify-between">
            <span>Select Hour / Session:</span>
            <span className="text-emerald-700 font-semibold">
              Hour {selectedHour} ({sessionHours[selectedHour - 1]?.time})
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
            {sessionHours.map((sh) => {
              const isSelected = selectedHour === sh.hour;
              return (
                <button
                  key={sh.hour}
                  onClick={() => setSelectedHour(sh.hour)}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs ring-2 ring-emerald-600/20 font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-medium'
                  }`}
                >
                  <div className="text-sm sm:text-base font-extrabold font-mono">{sh.hour}</div>
                  <div className="text-[9px] sm:text-[10px] truncate opacity-90">
                    {sh.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Class Banner (Responsive Gradient Bar) */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-emerald-200 font-medium">Active Batch Roster</div>
          <div className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
            <span>{currentClassObj.name}</span>
            <span className="text-xs font-normal text-emerald-300 font-arabic hidden sm:inline">
              ({currentClassObj.arabicName})
            </span>
          </div>
          <div className="text-[11px] text-emerald-100/80">
            {currentClassObj.roomNumber} · {classStudents.length} Students
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleMarkAllPresent}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Present</span>
          </button>
          <button
            onClick={handleResetAttendance}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-emerald-100 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* High-Priority Compact Summary Counters Strip (Fixed huge boxes on mobile!) */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
          <div className="text-[10px] sm:text-xs text-slate-500 font-semibold truncate">Total</div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-slate-900 mt-0.5 tabular-nums">
            {total}
          </div>
        </div>
        <div className="bg-emerald-50/70 p-2.5 sm:p-3 rounded-xl border border-emerald-300 text-center">
          <div className="text-[10px] sm:text-xs text-emerald-800 font-bold truncate">Present</div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-emerald-700 mt-0.5 tabular-nums">
            {presentCount}
          </div>
        </div>
        <div className="bg-rose-50/70 p-2.5 sm:p-3 rounded-xl border border-rose-300 text-center">
          <div className="text-[10px] sm:text-xs text-rose-800 font-bold truncate">Absent</div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-rose-700 mt-0.5 tabular-nums">
            {absentCount}
          </div>
        </div>
        <div className="bg-amber-50/70 p-2.5 sm:p-3 rounded-xl border border-amber-300 text-center">
          <div className="text-[10px] sm:text-xs text-amber-800 font-bold truncate">Late / Unmk</div>
          <div className="text-base sm:text-xl font-extrabold font-mono text-amber-700 mt-0.5 tabular-nums">
            {lateCount + notMarkedCount}
          </div>
        </div>
      </div>

      {/* Search, Sort & View Mode Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="relative flex-1 min-w-[160px] sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or roll #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort toggle */}
          <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setSortBy('roll')}
              className={`px-2 py-1 rounded cursor-pointer ${
                sortBy === 'roll' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'
              }`}
            >
              Roll #
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2 py-1 rounded cursor-pointer ${
                sortBy === 'name' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'
              }`}
            >
              Name
            </button>
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded cursor-pointer transition-colors ${
                viewMode === 'grid' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500'
              }`}
              title="Numbered Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded cursor-pointer transition-colors ${
                viewMode === 'list' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500'
              }`}
              title="Detailed List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Numbered Roll Grid (Mobile-Optimized Touch Grid) */}
      {viewMode === 'grid' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-100">
            <span className="font-medium">
              Tap box to cycle: Present → Absent → Late → Unmarked
            </span>
            <span className="font-mono text-slate-400">
              {filteredStudents.length} Students
            </span>
          </div>

          {/* Responsive Numbered Grid (5 cols on mobile, 8-10 on larger screens) */}
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-10 gap-2 sm:gap-2.5">
            {filteredStudents.map((student) => {
              const status = records[student.id];

              let boxStyle =
                'border-slate-300 bg-white text-slate-700 hover:border-slate-400';
              let cornerIndicator = 'bg-slate-300';

              if (status === 'PRESENT') {
                boxStyle =
                  'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold ring-1 ring-emerald-500/20';
                cornerIndicator = 'bg-emerald-600';
              } else if (status === 'ABSENT') {
                boxStyle =
                  'border-rose-500 bg-rose-50/80 text-rose-950 font-bold ring-1 ring-rose-500/20';
                cornerIndicator = 'bg-rose-500';
              } else if (status === 'LATE') {
                boxStyle =
                  'border-amber-500 bg-amber-50/80 text-amber-950 font-bold ring-1 ring-amber-500/20';
                cornerIndicator = 'bg-amber-500';
              }

              return (
                <button
                  type="button"
                  key={student.id}
                  onClick={() => cycleStatus(student.id)}
                  onMouseEnter={() => setActiveStudentHover(student)}
                  className={`relative h-13 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 select-none ${boxStyle}`}
                >
                  {/* Roll number */}
                  <span className="text-base sm:text-lg font-black font-mono tracking-tight leading-none">
                    {student.rollNumber}
                  </span>
                  {/* Truncated first name */}
                  <span className="text-[9px] text-slate-600 truncate max-w-[90%] px-0.5 mt-0.5">
                    {student.fullName.split(' ')[0]}
                  </span>
                  {/* Status dot */}
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${cornerIndicator}`}></span>
                </button>
              );
            })}
          </div>

          {/* Hover / Tap Student Quick Inspector */}
          {activeStudentHover && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mt-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={activeStudentHover.photo}
                  alt={activeStudentHover.fullName}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="font-bold text-slate-900">
                    #{activeStudentHover.rollNumber} {activeStudentHover.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Juz {activeStudentHover.currentJuz} · Attendance: {activeStudentHover.attendanceRate}%
                  </div>
                </div>
              </div>

              {/* Direct status buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={() => setDirectStatus(activeStudentHover.id, 'PRESENT')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white cursor-pointer"
                >
                  Present
                </button>
                <button
                  onClick={() => setDirectStatus(activeStudentHover.id, 'ABSENT')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-600 text-white cursor-pointer"
                >
                  Absent
                </button>
                <button
                  onClick={() => setDirectStatus(activeStudentHover.id, 'LATE')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-600 text-white cursor-pointer"
                >
                  Late
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Detailed List View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                  <th className="py-2.5 px-3">Roll & Name</th>
                  <th className="py-2.5 px-3">Juz</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((std) => {
                  const status = records[std.id];
                  return (
                    <tr key={std.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 w-5">
                            #{std.rollNumber}
                          </span>
                          <span className="font-semibold text-slate-900">{std.fullName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-emerald-800">Juz {std.currentJuz}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setDirectStatus(std.id, 'PRESENT')}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                              status === 'PRESENT'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            P
                          </button>
                          <button
                            onClick={() => setDirectStatus(std.id, 'ABSENT')}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                              status === 'ABSENT'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            A
                          </button>
                          <button
                            onClick={() => setDirectStatus(std.id, 'LATE')}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                              status === 'LATE'
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            L
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Session Topic, Description & Submission Card (Clean Responsive Layout) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Session Topic
            </label>
            <input
              type="text"
              placeholder="e.g. Surah Al-Anbiya & Juz 17 Murajath"
              value={sessionTopic}
              onChange={(e) => setSessionTopic(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Session Remarks / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Morning Fajr session. Checked individual Sabq memorization."
              value={sessionDesc}
              onChange={(e) => setSessionDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 self-start sm:self-auto">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Attendance will be recorded against date {selectedDate} and session hour {selectedHour}.</span>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Submit Attendance</span>
          </button>
        </div>
      </div>

      {/* Warning Modal for Unmarked Students before Submission */}
      {showUnmarkedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Unmarked Students Found ({notMarkedCount})
            </h3>
            <p className="text-xs text-slate-600 leading-normal">
              You have {notMarkedCount} unmarked student{notMarkedCount > 1 ? 's' : ''}. In HYBA, Unmarked is distinct from Absent.
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={saveSessionData}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl"
              >
                Save Attendance As-Is
              </button>
              <button
                onClick={() => {
                  const updated = { ...records };
                  classStudents.forEach((s) => {
                    if (!updated[s.id] || updated[s.id] === 'NOT_MARKED') {
                      updated[s.id] = 'ABSENT';
                    }
                  });
                  setRecords(updated);
                  saveSessionData();
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-xl"
              >
                Mark Unmarked as Absent & Save
              </button>
              <button
                onClick={() => setShowUnmarkedModal(false)}
                className="w-full py-1.5 text-xs text-slate-500 font-semibold hover:text-slate-700"
              >
                Review Unmarked
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
