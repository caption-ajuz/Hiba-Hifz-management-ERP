import React, { useState } from 'react';
import { Student, HifzRecord, AttendanceSession, ClassBatch } from '../types';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
  Users,
  BookOpen,
} from 'lucide-react';

interface ReportsModuleProps {
  students: Student[];
  records: HifzRecord[];
  classes: ClassBatch[];
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  students,
  records,
  classes,
}) => {
  const [reportType, setReportType] = useState<'ATTENDANCE' | 'HIFZ'>('HIFZ');
  const [selectedClassId, setSelectedClassId] = useState<string>('batch-a');

  const classStudents = students.filter((s) => s.classId === selectedClassId);

  // Stats calculation
  const totalMemorizedAll = students.reduce((acc, s) => acc + s.completedJuzList.length, 0);
  const avgJuzPerStudent = (totalMemorizedAll / (students.length || 1)).toFixed(1);

  const topStudents = [...students].sort(
    (a, b) => b.completedJuzList.length - a.completedJuzList.length
  ).slice(0, 5);

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (reportType === 'HIFZ') {
      csvContent += 'Roll,Student Name,Admission,Current Juz,Completed Juz Count,Attendance Rate\n';
      classStudents.forEach((s) => {
        csvContent += `${s.rollNumber},"${s.fullName}",${s.admissionNumber},${s.currentJuz},${s.completedJuzList.length},${s.attendanceRate}%\n`;
      });
    } else {
      csvContent += 'Roll,Student Name,Admission,Attendance Rate,Status\n';
      classStudents.forEach((s) => {
        csvContent += `${s.rollNumber},"${s.fullName}",${s.admissionNumber},${s.attendanceRate}%,${s.accountStatus}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HYBA_${reportType}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <FileText className="w-3.5 h-3.5" />
            <span>Institutional Analytics & Audits</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Reports & Progress Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Generate and export comprehensive attendance sheets and Hifz retention records.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setReportType('HIFZ')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              reportType === 'HIFZ' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Hifz Memorization Progress
          </button>
          <button
            onClick={() => setReportType('ATTENDANCE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              reportType === 'ATTENDANCE' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Monthly Attendance Ledger
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Target Class:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Average Retention Rate</div>
          <div className="text-2xl font-bold font-mono text-emerald-800 mt-1 tabular-nums">
            {avgJuzPerStudent} Juz / Student
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">Across 3 Active Hifz Batches</div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Juz Memorized</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {totalMemorizedAll} Finished Juz
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cumulative Institutional Milestone</div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Average Attendance</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
            95.8%
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">Above institutional threshold (90%)</div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">
            {reportType === 'HIFZ' ? 'Student Memorization Breakdown' : 'Monthly Attendance Breakdown'}
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {classStudents.length} Students Included
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Roll</th>
                <th className="py-3 px-4 font-semibold">Student Name</th>
                <th className="py-3 px-4 font-semibold">Admission #</th>
                {reportType === 'HIFZ' ? (
                  <>
                    <th className="py-3 px-4 font-semibold">Current Active Juz</th>
                    <th className="py-3 px-4 font-semibold">Completed Portions</th>
                    <th className="py-3 px-4 font-semibold">Progress Bar</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4 font-semibold">Present Days</th>
                    <th className="py-3 px-4 font-semibold">Absent Days</th>
                    <th className="py-3 px-4 font-semibold">Late Days</th>
                  </>
                )}
                <th className="py-3 px-4 font-semibold text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std) => {
                const completedCount = std.completedJuzList.length;
                const percentage = Math.round((completedCount / 30) * 100);

                return (
                  <tr key={std.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{std.rollNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{std.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{std.admissionNumber}</td>
                    {reportType === 'HIFZ' ? (
                      <>
                        <td className="py-3 px-4 font-semibold text-emerald-800">
                          Juz {std.currentJuz}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {completedCount} of 30 Juz
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-bold">24</td>
                        <td className="py-3 px-4 font-mono text-rose-700 font-bold">1</td>
                        <td className="py-3 px-4 font-mono text-amber-700 font-bold">1</td>
                      </>
                    )}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {std.attendanceRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
