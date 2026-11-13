import React, { useState } from 'react';
import { X, Clock, MapPin, User, BookOpen, AlertCircle, CheckCircle2, FileText, Send } from 'lucide-react';

interface PeriodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodData: {
    hour: number;
    time: string;
    subjectCode: string;
    subjectName: string;
    faculty: string;
    room: string;
    status: string;
    topic?: string;
    date?: string;
  } | null;
  onOpenDutyLeave: () => void;
}

export const StudentPeriodDetailModal: React.FC<PeriodDetailModalProps> = ({
  isOpen,
  onClose,
  periodData,
  onOpenDutyLeave,
}) => {
  const [isReportingDiscrepancy, setIsReportingDiscrepancy] = useState(false);
  const [discrepancyReason, setDiscrepancyReason] = useState('');
  const [submittedReport, setSubmittedReport] = useState(false);

  if (!isOpen || !periodData) return null;

  const handleSubmitDiscrepancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discrepancyReason.trim()) return;
    setSubmittedReport(true);
    setTimeout(() => {
      setSubmittedReport(false);
      setIsReportingDiscrepancy(false);
      setDiscrepancyReason('');
      onClose();
    }, 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          label: 'Present (Attended)',
          icon: CheckCircle2,
          color: 'text-emerald-600',
        };
      case 'ABSENT':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          label: 'Absent',
          icon: AlertCircle,
          color: 'text-rose-600',
        };
      case 'LATE':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'Late Arrival',
          icon: Clock,
          color: 'text-amber-600',
        };
      case 'LET_OFF':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
          label: 'Let-off / Duty Leave',
          icon: CheckCircle2,
          color: 'text-sky-600',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: 'Scheduled / Unmarked',
          icon: Clock,
          color: 'text-slate-500',
        };
    }
  };

  const statusMeta = getStatusBadge(periodData.status);
  const StatusIcon = statusMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-sm">
              H{periodData.hour}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Period {periodData.hour} Details</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{periodData.time}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Capsule */}
          <div className={`p-3 rounded-2xl border ${statusMeta.bg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <StatusIcon className={`w-4 h-4 ${statusMeta.color}`} />
              <span className="text-xs font-bold">{statusMeta.label}</span>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              {periodData.date || 'Today'}
            </span>
          </div>

          {/* Course Details Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="text-[11px] font-mono font-bold text-indigo-700">
              {periodData.subjectCode}
            </div>
            <div className="text-sm font-extrabold text-slate-900 leading-snug">
              {periodData.subjectName}
            </div>

            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{periodData.faculty}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{periodData.room}</span>
              </div>
            </div>
          </div>

          {/* Topic Covered */}
          {periodData.topic && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Topic Covered Today</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed pt-1">
                {periodData.topic}
              </p>
            </div>
          )}

          {/* Discrepancy Reporting Form or Buttons */}
          {isReportingDiscrepancy ? (
            <form onSubmit={handleSubmitDiscrepancy} className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  Report Attendance Discrepancy
                </span>
                <button
                  type="button"
                  onClick={() => setIsReportingDiscrepancy(false)}
                  className="text-xs text-amber-700 hover:text-amber-950 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-amber-800">
                If you were physically present or on an official college duty during this hour, submit your explanation to the department tutor:
              </p>
              <textarea
                value={discrepancyReason}
                onChange={(e) => setDiscrepancyReason(e.target.value)}
                rows={2}
                placeholder="Explain here (e.g., I attended the lab session from 09:30 AM with Dr. Sreenivasan)..."
                className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                required
              />
              <button
                type="submit"
                disabled={submittedReport}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submittedReport ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Submitted to Tutor!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>Submit Correction Request</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsReportingDiscrepancy(true)}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Attendance Issue?</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenDutyLeave();
                }}
                className="p-2.5 rounded-xl border border-indigo-200 hover:border-indigo-300 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Duty Leave Slip</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
