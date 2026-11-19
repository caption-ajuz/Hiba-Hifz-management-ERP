import React from 'react';
import {
  CalendarCheck,
  BookOpen,
  IdCard,
  FileText,
  Calendar,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';

interface StudentMenuViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenAttendance: () => void;
  onOpenIdCard: () => void;
  onOpenFeedback: () => void;
  onOpenDutyLeave: () => void;
  onOpenHifz: () => void;
  feedbackEnabled?: boolean;
  feedbackPendingCount?: number;
  currentJuz?: number;
  attendanceRate?: number;
}

export const StudentMenuView: React.FC<StudentMenuViewProps> = ({
  onNavigateTab,
  onOpenAttendance,
  onOpenIdCard,
  onOpenFeedback,
  onOpenDutyLeave,
  onOpenHifz,
  feedbackEnabled = false,
  feedbackPendingCount = 0,
  currentJuz,
  attendanceRate,
}) => {
  const serviceItems = [
    {
      id: 'virtual_id',
      label: 'Digital Virtual ID Card',
      sub: 'Official campus pass with admission barcode',
      icon: IdCard,
      color: 'bg-blue-50 text-blue-600',
      onClick: onOpenIdCard,
      meta: '',
    },
    {
      id: 'duty_leave',
      label: 'Duty Leave & Absence Request',
      sub: 'Apply for let-off or medical leave approval',
      icon: FileText,
      color: 'bg-purple-50 text-purple-600',
      onClick: onOpenDutyLeave,
      meta: '',
    },
    {
      id: 'events',
      label: 'College Events & Announcements',
      sub: 'Upcoming campus programs, posters & schedule',
      icon: Calendar,
      color: 'bg-amber-50 text-amber-600',
      onClick: () => onNavigateTab('events'),
      meta: '',
    },
    ...(feedbackEnabled
      ? [
          {
            id: 'feedback',
            label: 'Faculty Feedback Survey',
            sub: 'Evaluate your assigned Usthad & faculty mentors',
            icon: MessageSquare,
            color: 'bg-emerald-50 text-emerald-700',
            onClick: onOpenFeedback,
            meta: feedbackPendingCount > 0 ? `${feedbackPendingCount} pending` : 'Completed',
          },
        ]
      : []),
  ];

  const menuSections = [
    {
      title: 'Academic & Quran Studies',
      items: [
        {
          id: 'attendance',
          label: 'Attendance Portal',
          sub: 'Hourly session attendance & semester percentage',
          icon: CalendarCheck,
          color: 'bg-emerald-50 text-emerald-600',
          onClick: onOpenAttendance,
          meta: typeof attendanceRate === 'number' ? `${attendanceRate}%` : '',
        },
        {
          id: 'hifz',
          label: 'Tahfeezul Quran Tracker',
          sub: 'Daily Sabq, Murajath & Manzil progress',
          icon: BookOpen,
          color: 'bg-teal-50 text-teal-600',
          onClick: onOpenHifz,
          meta: currentJuz ? `Juz ${currentJuz}` : '',
        },
      ],
    },
    {
      title: 'Student Services & Campus Life',
      items: serviceItems,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-6 pb-28">
      <div className="px-1">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Student Services</h1>
      </div>

      {menuSections.map((section) => (
        <div key={section.title} className="space-y-2.5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
            {section.title}
          </h2>
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${item.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                        <span className="truncate">{item.label}</span>
                        {item.meta && (
                          <span className="text-[11px] font-mono font-semibold text-emerald-700 shrink-0 tabular-nums">
                            · {item.meta}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{item.sub}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
