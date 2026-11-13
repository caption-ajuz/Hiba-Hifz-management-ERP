import React from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import { Student } from '../types';
import { X, Printer, Download, Check, ShieldCheck } from 'lucide-react';

interface StudentIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

export const StudentIdCardModal: React.FC<StudentIdCardModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] overflow-y-auto">
        {/* Header toolbar */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Student ID Card
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body (Inspired exactly by reference screenshot!) */}
        <div className="p-5 flex flex-col items-center">
          <div className="w-full bg-white rounded-2xl border-2 border-slate-200 shadow-md overflow-hidden relative">
            {/* Top Green Curved Header */}
            <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-4 text-center relative pb-10">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-9 h-9 rounded-lg bg-white p-1 flex items-center justify-center shadow-xs overflow-hidden">
                  <img
                    src={INSTITUTION_INFO.logoUrl}
                    alt="Emblem"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold tracking-tight text-white leading-tight">
                    {INSTITUTION_INFO.name}
                  </div>
                  <div className="text-[9px] text-emerald-200 font-arabic">
                    {INSTITUTION_INFO.arabicName}
                  </div>
                </div>
              </div>
              <div className="text-[9px] tracking-wider uppercase text-emerald-200 font-semibold mt-1">
                Tahfeezul Quran & Islamic Studies
              </div>

              {/* Decorative scalloped background element */}
              <div className="absolute -bottom-4 left-0 right-0 h-8 bg-white rounded-t-3xl"></div>
            </div>

            {/* Student Photo */}
            <div className="flex flex-col items-center -mt-8 relative z-10">
              <div className="w-22 h-22 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-100">
                <img
                  src={student.photo}
                  alt={student.fullName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Student Name */}
              <h2 className="text-base font-bold text-slate-900 mt-2 text-center px-4">
                {student.fullName}
              </h2>
              <div className="text-[11px] font-mono font-semibold text-emerald-700 mt-0.5">
                ID: MH2024-{student.admissionNumber}
              </div>
            </div>

            {/* Details Table */}
            <div className="p-4 mx-4 my-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400 font-medium">Register No</span>
                <span className="text-slate-900 font-bold font-mono">KIAYSCH024</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400 font-medium">Department</span>
                <span className="text-slate-900 font-semibold text-right">Chemistry (Aided) & Tahfeez</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400 font-medium">Batch</span>
                <span className="text-slate-900 font-semibold">2024 - 2027</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400 font-medium">Roll No.</span>
                <span className="text-slate-900 font-bold font-mono">#{student.rollNumber} (Adm: {student.admissionNumber})</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400 font-medium">Blood Group</span>
                <span className="text-rose-600 font-bold font-mono">O +ve</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400 font-medium">Status</span>
                <span className="text-emerald-700 font-semibold">Verified Active</span>
              </div>
            </div>

            {/* Simulated Barcode */}
            <div className="px-6 py-2 flex flex-col items-center">
              <div className="flex items-center gap-[2.5px] h-10 w-4/5 justify-center py-1">
                {[...Array(38)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-full bg-slate-900 ${
                      i % 4 === 0 ? 'w-1.5' : i % 3 === 0 ? 'w-1' : 'w-0.5'
                    }`}
                  ></div>
                ))}
              </div>
              <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                *KIAY-2026-{student.admissionNumber}-CHEM*
              </span>
            </div>

            {/* Principal Signature Line */}
            <div className="px-6 pb-4 pt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 mt-1">
              <span>Card Valid: 2026-2027</span>
              <div className="text-right">
                <div className="font-semibold text-slate-800">Principal & Mudir</div>
                <div className="text-[9px] text-emerald-800 font-medium">Markazul Hidaya Kombam / HYBA</div>
              </div>
            </div>

            {/* Bottom green accent bar */}
            <div className="h-2 bg-gradient-to-r from-emerald-800 to-teal-900"></div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print ID Card</span>
          </button>
        </div>
      </div>
    </div>
  );
};
