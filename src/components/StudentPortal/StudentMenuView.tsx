import React from 'react';
import {
  Clock,
  CalendarCheck,
  BookOpen,
  IdCard,
  FileText,
  Award,
  CreditCard,
  Library,
  Calendar,
  MessageSquare,
  Bus,
  Sparkles,
  ChevronRight,
  Shield,
  Coffee,
  HelpCircle,
} from 'lucide-react';

interface StudentMenuViewProps {
  onNavigateTab: (tab: string) => void;
  onOpenAttendance: () => void;
  onOpenIdCard: () => void;
  onOpenTimetable: () => void;
  onOpenFeedback: () => void;
  onOpenDutyLeave: () => void;
  onOpenHifz: () => void;
}

export const StudentMenuView: React.FC<StudentMenuViewProps> = ({
  onNavigateTab,
  onOpenAttendance,
  onOpenIdCard,
  onOpenTimetable,
  onOpenFeedback,
  onOpenDutyLeave,
  onOpenHifz,
}) => {
  const menuSections = [
    {
      title: 'Academic & Courses',
      items: [
        {
          id: 'attendance',
          label: 'Attendance Portal',
          sub: 'Course, hourly matrix & termly breakdown',
          icon: CalendarCheck,
          color: 'bg-emerald-50 text-emerald-600',
          onClick: onOpenAttendance,
          badge: '58.3%',
        },
        {
          id: 'timetable',
          label: 'Daily Bell Schedule',
          sub: 'Periods 1 to 5, rooms & faculty',
          icon: Clock,
          color: 'bg-indigo-50 text-indigo-600',
          onClick: onOpenTimetable,
        },
        {
          id: 'hifz',
          label: 'Tahfeezul Quran Tracker',
          sub: 'Daily Sabq, Murajath & Manzil progress',
          icon: BookOpen,
          color: 'bg-teal-50 text-teal-600',
          onClick: onOpenHifz,
          badge: 'Juz 21',
        },
        {
          id: 'marks',
          label: 'Continuous Assessment & Marks',
          sub: 'Internal exams, seminar & assignments',
          icon: Award,
          color: 'bg-amber-50 text-amber-600',
          onClick: () => alert('Internal marks: Chemistry Major Grade A+ (CGPA: 8.84)'),
        },
      ],
    },
    {
      title: 'Student Services & Requests',
      items: [
        {
          id: 'virtual_id',
          label: 'Digital Virtual ID Card',
          sub: 'Campus pass with barcode & seal',
          icon: IdCard,
          color: 'bg-blue-50 text-blue-600',
          onClick: onOpenIdCard,
        },
        {
          id: 'duty_leave',
          label: 'Duty Leave & Absence Request',
          sub: 'Apply for let-off / medical credit',
          icon: FileText,
          color: 'bg-purple-50 text-purple-600',
          onClick: onOpenDutyLeave,
        },
        {
          id: 'feedback',
          label: 'Faculty Feedback Survey',
          sub: 'Semester teacher evaluation',
          icon: MessageSquare,
          color: 'bg-rose-50 text-rose-600',
          onClick: onOpenFeedback,
          badge: 'Pending',
        },
      ],
    },
    {
      title: 'Campus Life & Facilities',
      items: [
        {
          id: 'library',
          label: 'Digital Library & E-Resources',
          sub: 'Catalog, book renewals & journals',
          icon: Library,
          color: 'bg-sky-50 text-sky-600',
          onClick: () => alert('Digital Library: 4 books checked out. Due date: 24 Nov 2026.'),
        },
        {
          id: 'events',
          label: 'College Events & Announcements',
          sub: 'Fests, competitions & holiday calendar',
          icon: Calendar,
          color: 'bg-amber-50 text-amber-600',
          onClick: () => onNavigateTab('events'),
        },
        {
          id: 'transport',
          label: 'Campus Bus Pass',
          sub: 'Mannarkkad - Kombam route #4',
          icon: Bus,
          color: 'bg-slate-100 text-slate-700',
          onClick: () => alert('Bus Pass #BP-2026-881: Active for Semester 6.'),
        },
        {
          id: 'mess',
          label: 'Hostel & Mess Schedule',
          sub: 'Daily nutritious dining menu',
          icon: Coffee,
          color: 'bg-orange-50 text-orange-600',
          onClick: () => alert('Mess menu: Breakfast - Appam & Stew; Lunch - Rice & Fish curry / Veg; Dinner - Chappathi & Dal.'),
        },
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-6 pb-28">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Campus Services</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Everything you need for your studies and student life in one place
        </p>
      </div>

      {/* Menu Sections */}
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
                  onClick={item.onClick}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${item.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.sub}</div>
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
