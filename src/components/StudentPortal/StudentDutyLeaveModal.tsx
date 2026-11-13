import React, { useState } from 'react';
import { X, FileText, Calendar, Clock, CheckCircle2, Upload, AlertCircle } from 'lucide-react';

interface StudentDutyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentDutyLeaveModal: React.FC<StudentDutyLeaveModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [leaveType, setLeaveType] = useState<'DUTY_LEAVE' | 'MEDICAL_LEAVE' | 'TAHFEEZ_PROGRAM'>('DUTY_LEAVE');
  const [startDate, setStartDate] = useState('2026-11-10');
  const [endDate, setEndDate] = useState('2026-11-10');
  const [hoursOption, setHoursOption] = useState<'FULL_DAY' | 'SPECIFIC_HOURS'>('FULL_DAY');
  const [selectedHours, setSelectedHours] = useState<number[]>([1, 2]);
  const [reason, setReason] = useState('');
  const [fileAttached, setFileAttached] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleHour = (h: number) => {
    setSelectedHours((prev) =>
      prev.includes(h) ? prev.filter((item) => item !== h) : [...prev, h].sort()
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Apply for Duty Leave / Let-Off</div>
              <div className="text-[11px] text-slate-500">Official absence clearance for attendance credit</div>
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
        <div className="p-5 overflow-y-auto flex-1">
          {isSuccess ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Application Submitted!</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Your duty leave request (#DL-2026-881) has been routed to <strong>Dr. Sreenivasan K.P.</strong> and the Head of Department for verified attendance adjustment.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Leave Type Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Category of Leave</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLeaveType('DUTY_LEAVE')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center text-center transition-all cursor-pointer ${
                      leaveType === 'DUTY_LEAVE'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Duty Leave</span>
                    <span className="text-[10px] text-slate-400 font-normal">NSS / Fest / Event</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('MEDICAL_LEAVE')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center text-center transition-all cursor-pointer ${
                      leaveType === 'MEDICAL_LEAVE'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Medical Leave</span>
                    <span className="text-[10px] text-slate-400 font-normal">Doctor advice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('TAHFEEZ_PROGRAM')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center text-center transition-all cursor-pointer ${
                      leaveType === 'TAHFEEZ_PROGRAM'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Tahfeez Special</span>
                    <span className="text-[10px] text-slate-400 font-normal">Sanad / Qira'at</span>
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Scope (Full Day vs Specific Hours) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Absence Coverage</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="hoursScope"
                      checked={hoursOption === 'FULL_DAY'}
                      onChange={() => setHoursOption('FULL_DAY')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Full Day (All 5 Hours)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="hoursScope"
                      checked={hoursOption === 'SPECIFIC_HOURS'}
                      onChange={() => setHoursOption('SPECIFIC_HOURS')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Select Specific Hours</span>
                  </label>
                </div>

                {hoursOption === 'SPECIFIC_HOURS' && (
                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((h) => {
                      const isSelected = selectedHours.includes(h);
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => toggleHour(h)}
                          className={`w-9 h-9 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          H{h}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reason Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Reason / Details</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Provide official reason (e.g., Participated in University Inter-Collegiate Quiz / District Tilawat Majlis)..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Upload Certificate / Letter */}
              <div className="p-3 border border-dashed border-slate-300 rounded-2xl bg-slate-50 text-center space-y-1">
                <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-700">
                  {fileAttached ? fileAttached : 'Attach Certificate / Permission Slip (Optional)'}
                </div>
                <div className="text-[10px] text-slate-400">PDF, JPG, or PNG up to 5MB</div>
                <button
                  type="button"
                  onClick={() => setFileAttached('Faculty_Duty_Permit_Signature.pdf')}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer pt-1"
                >
                  {fileAttached ? 'Replace Attachment' : '+ Choose File'}
                </button>
              </div>

              {/* Submit */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
