import React, { useState } from 'react';
import { X, Clock, Calendar, BookOpen, Layers } from 'lucide-react';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimetableModal: React.FC<TimetableModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [activeDay, setActiveDay] = useState<string>('D1');

  const days = [
    { id: 'D1', label: 'Saturday (السبت)' },
    { id: 'D2', label: 'Sunday (الأحد)' },
    { id: 'D3', label: 'Monday (الإثنين)' },
    { id: 'D4', label: 'Tuesday (الثلاثاء)' },
    { id: 'D5', label: 'Wednesday (الأربعاء)' },
  ];

  const scheduleSlots = [
    {
      slot: 1,
      time: '07:00 - 08:30',
      title: 'Sabq (السبق) · New Lesson Memorization',
      batch: 'Hifz Batch A (Hifz Ul Uloom)',
      room: 'Tahfeez Hall 101',
      mentor: 'Usthad Mohammed Ajash T.',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-950',
      tag: 'Sabq Focus',
    },
    {
      slot: 2,
      time: '09:00 - 10:30',
      title: 'Forenoon Murajath (المراجعة) · Recent Revision',
      batch: 'Hifz Batch A & B',
      room: 'Tahfeez Hall 101',
      mentor: 'Usthad Mohammed Ajash T.',
      color: 'bg-teal-50 border-teal-200 text-teal-950',
      tag: 'Revision',
    },
    {
      slot: 3,
      time: '11:00 - 12:30',
      title: 'Tajweed Rules, Makharij & Quranic Sciences',
      batch: 'Combined Hifz Department',
      room: 'Auditorium Hall',
      mentor: 'Dr. Abdul Wahab (Mudir) & Usthad Ajash',
      color: 'bg-sky-50 border-sky-200 text-sky-950',
      tag: 'Tajweed',
    },
    {
      slot: 4,
      time: '14:00 - 16:00',
      title: 'Manzil (المنزل) · Full Juz Cumulative Revision',
      batch: 'Hifz Batch A',
      room: 'Tahfeez Hall 101',
      mentor: 'Usthad Mohammed Ajash T.',
      color: 'bg-amber-50 border-amber-200 text-amber-950',
      tag: 'Manzil',
    },
    {
      slot: 5,
      time: '16:30 - 17:30',
      title: 'Sanad Verification & One-on-One Oral Testing',
      batch: 'Advanced Sanad Candidates',
      room: 'Library Sanctuary',
      mentor: 'Academic Advisor Dr. Sreenivasan K.P.',
      color: 'bg-purple-50 border-purple-200 text-purple-950',
      tag: 'Oral Exam',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Academic Timetable & Schedule</h2>
              <p className="text-xs text-slate-500">
                Markazul Hidayathil Islamiyya · Daily Hifz Routine 2026-27
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Day Selectors (Inspired directly by user reference screen D1, D2, D3, D4, D5) */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 overflow-x-auto">
            {days.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDay(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  activeDay === d.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d.id} · {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Slots List */}
        <div className="p-6 space-y-3.5 overflow-y-auto">
          {scheduleSlots.map((item) => (
            <div
              key={item.slot}
              className={`p-4 rounded-2xl border flex items-start gap-4 transition-all hover:shadow-xs ${item.color}`}
            >
              <div className="w-8 h-8 rounded-full bg-white/80 border border-current flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                {item.slot}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold font-mono tracking-tight opacity-75">
                    {item.time}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/70 px-2 py-0.5 rounded border border-current">
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {item.title}
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2 font-medium">
                  <span>{item.batch}</span>
                  <span>·</span>
                  <span>{item.room}</span>
                  <span>·</span>
                  <span className="text-emerald-800 font-semibold">{item.mentor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Daily minimum requirement: 1 Juz Manzil + 1/4 Juz Sabq</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
