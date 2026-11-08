import React, { useState } from 'react';
import {
  Student,
  HifzRecord,
  HifzRecordType,
  UserProfile,
} from '../types';
import { JUZ_NAMES } from '../data/quranData';
import {
  BookOpen,
  Sparkles,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Plus,
  Bookmark,
  Award,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface HifzModuleProps {
  records: HifzRecord[];
  students: Student[];
  currentUser: UserProfile;
  onOpenAddModal: () => void;
}

export const HifzModule: React.FC<HifzModuleProps> = ({
  records,
  students,
  currentUser,
  onOpenAddModal,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | HifzRecordType | 'HEATMAP'>('ALL');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [performanceFilter, setPerformanceFilter] = useState<string>('ALL');

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (activeTab !== 'ALL' && activeTab !== 'HEATMAP' && r.recordType !== activeTab) {
      return false;
    }
    if (selectedStudentFilter !== 'ALL' && r.studentId !== selectedStudentFilter) {
      return false;
    }
    if (performanceFilter !== 'ALL' && r.performance !== performanceFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const std = students.find((s) => s.id === r.studentId);
      const stdName = std ? std.fullName.toLowerCase() : '';
      const surah = (r.surahName || '').toLowerCase();
      const remarks = (r.teacherRemarks || '').toLowerCase();
      return stdName.includes(q) || surah.includes(q) || remarks.includes(q);
    }
    return true;
  });

  // Highlight student for 30-Juz Heatmap
  const heatmapStudent =
    selectedStudentFilter !== 'ALL'
      ? students.find((s) => s.id === selectedStudentFilter) || students[0]
      : students[4] || students[0]; // default to Mohammed Ajash or first student

  const getPerformanceBadge = (perf: string) => {
    switch (perf) {
      case 'Excellent':
        return 'text-emerald-800 bg-emerald-50 border-emerald-200';
      case 'Good':
        return 'text-teal-800 bg-teal-50 border-teal-200';
      case 'Average':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'Needs Improvement':
        return 'text-rose-800 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Passed':
        return 'text-emerald-700 bg-emerald-100/70';
      case 'Revision Required':
        return 'text-amber-700 bg-amber-100/70';
      case 'Not Passed':
        return 'text-rose-700 bg-rose-100/70';
      default:
        return 'text-slate-700 bg-slate-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Hifz Learning Management</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Sabq, Murajath & Manzil Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Track daily new memorization portions, recent revisions, and full Juz retention milestones.
          </p>
        </div>

        {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'USTHAD') && (
          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Hifz Lesson</span>
          </button>
        )}
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Categories
          </button>
          <button
            onClick={() => setActiveTab('SABQ')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'SABQ' ? 'bg-white text-emerald-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sabq (السبق · New Lesson)
          </button>
          <button
            onClick={() => setActiveTab('MURAJATH')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'MURAJATH' ? 'bg-white text-emerald-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Murajath (المراجعة · Revision)
          </button>
          <button
            onClick={() => setActiveTab('MANZIL')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'MANZIL' ? 'bg-white text-emerald-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manzil (المنزل · Juz Revision)
          </button>
          <button
            onClick={() => setActiveTab('HEATMAP')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'HEATMAP' ? 'bg-white text-emerald-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>30-Juz Progress Matrix</span>
          </button>
        </div>

        {/* Student Selector Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Filter Student:</span>
          <select
            value={selectedStudentFilter}
            onChange={(e) => setSelectedStudentFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden"
          >
            <option value="ALL">All Students ({students.length})</option>
            {students.map((std) => (
              <option key={std.id} value={std.id}>
                #{std.rollNumber} {std.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main View Area */}
      {activeTab === 'HEATMAP' ? (
        /* 30-Juz Visual Completion Grid / Heatmap */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <img
                src={heatmapStudent.photo}
                alt={heatmapStudent.fullName}
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{heatmapStudent.fullName}</h3>
                  <span className="text-xs text-slate-400 font-arabic">{heatmapStudent.arabicName}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Roll #{heatmapStudent.rollNumber} · Admission: {heatmapStudent.admissionNumber} · Target Sanad Completion
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-400 font-medium">Completed Juz</div>
                <div className="text-xl font-bold font-mono text-emerald-800 tabular-nums">
                  {heatmapStudent.completedJuzList.length} / 30
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-800 font-mono text-sm">
                {Math.round((heatmapStudent.completedJuzList.length / 30) * 100)}%
              </div>
            </div>
          </div>

          {/* 30-Juz Heatmap Grid */}
          <div>
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Quranic 30 Juz Retention Grid</span>
              <div className="flex items-center gap-3 text-[11px] font-normal text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-emerald-600"></span> Memorized
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-amber-500"></span> In Progress
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-slate-100 border border-slate-300"></span> Upcoming
                </span>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2.5">
              {JUZ_NAMES.map((j) => {
                const isCompleted = heatmapStudent.completedJuzList.includes(j.juz);
                const isCurrent = heatmapStudent.currentJuz === j.juz && !isCompleted;

                let cardStyle = 'bg-slate-50 border-slate-200 text-slate-600';
                if (isCompleted) {
                  cardStyle = 'bg-emerald-600 border-emerald-700 text-white shadow-xs';
                } else if (isCurrent) {
                  cardStyle = 'bg-amber-500 border-amber-600 text-white shadow-xs animate-pulse';
                }

                return (
                  <div
                    key={j.juz}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all hover:scale-105 cursor-pointer ${cardStyle}`}
                    title={`Juz ${j.juz}: ${j.arabicName} (${j.startSurah})`}
                  >
                    <div className="text-xs font-mono font-bold">Juz {j.juz}</div>
                    <div className="text-sm font-arabic font-semibold mt-0.5">{j.arabicName}</div>
                    <div className="text-[9px] mt-1 opacity-90 truncate max-w-full">
                      {isCompleted ? 'Completed' : isCurrent ? 'Active' : 'Queued'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Records List */
        <div className="space-y-4">
          {/* Search and Secondary Filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search surah, student or remarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
              <span className="text-slate-400">Performance:</span>
              <select
                value={performanceFilter}
                onChange={(e) => setPerformanceFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">All Grades</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Needs Improvement">Needs Improvement</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((record) => {
              const student = students.find((s) => s.id === record.studentId);

              return (
                <div
                  key={record.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Card Top: Category & Date */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-[11px] px-2 py-0.5 rounded border ${
                            record.recordType === 'SABQ'
                              ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                              : record.recordType === 'MURAJATH'
                              ? 'text-teal-800 bg-teal-50 border-teal-200'
                              : 'text-sky-800 bg-sky-50 border-sky-200'
                          }`}
                        >
                          {record.recordType === 'SABQ'
                            ? 'SABQ (سبق)'
                            : record.recordType === 'MURAJATH'
                            ? 'MURAJATH (مراجعة)'
                            : 'MANZIL (منزل)'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">{record.date}</span>
                      </div>

                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${getStatusBadge(record.status)}`}>
                        {record.status}
                      </span>
                    </div>

                    {/* Student Info */}
                    {student && (
                      <div className="flex items-center gap-2.5 mt-3">
                        <img
                          src={student.photo}
                          alt={student.fullName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{student.fullName}</div>
                          <div className="text-[11px] text-slate-400">
                            Roll #{student.rollNumber} · Current Juz {student.currentJuz}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lesson Portion */}
                    <div className="mt-3.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      {record.recordType === 'MANZIL' ? (
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Juz {record.juzNumber} Revision
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Portion: {record.surahRangeText}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              Surah {record.surahName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Ayah {record.startAyah} → Ayah {record.endAyah}
                            </div>
                          </div>
                          {record.surahArabic && (
                            <div className="text-sm font-arabic font-bold text-emerald-800">
                              {record.surahArabic}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Performance & Mistakes */}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Grade:</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getPerformanceBadge(record.performance)}`}>
                          {record.performance}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        Mistakes: <strong className={record.mistakeCount > 0 ? 'text-rose-600' : 'text-emerald-700'}>{record.mistakeCount}</strong>
                      </div>
                    </div>

                    {/* Teacher Remarks */}
                    {record.teacherRemarks && (
                      <div className="mt-3 text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/80">
                        "{record.teacherRemarks}"
                      </div>
                    )}
                  </div>

                  {/* Next Lesson Assignment (if confirmed) */}
                  {record.nextLessonPosition && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-900 flex items-center justify-between font-medium">
                      <span className="text-slate-400">Assigned Next:</span>
                      <span className="font-semibold">{record.nextLessonPosition}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredRecords.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">No Hifz records match your filter</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try selecting a different category or clearing the search query.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
