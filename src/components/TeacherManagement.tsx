import React, { useState } from 'react';
import { Teacher, ClassBatch, UserProfile } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Award,
  BookOpen,
  Briefcase,
  X,
  CheckCircle,
} from 'lucide-react';

interface TeacherManagementProps {
  teachers: Teacher[];
  classes: ClassBatch[];
  currentUser: UserProfile;
  onAddTeacher?: (teacher: Teacher) => void;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({
  teachers,
  classes,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTeachers = teachers.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.fullName.toLowerCase().includes(q) ||
        t.teacherId.toLowerCase().includes(q) ||
        t.specialization.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <Users className="w-3.5 h-3.5" />
            <span>Faculty & Mentorship</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Usthad Faculty Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Manage Hifz mentors, class batch assignments, and academic credentials.
          </p>
        </div>
      </div>

      {/* Teachers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeachers.map((teacher) => {
          const assignedClassNames = classes
            .filter((c) => teacher.assignedClassIds.includes(c.id))
            .map((c) => c.name);

          return (
            <div
              key={teacher.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center gap-3.5 pb-3 border-b border-slate-100">
                  <img
                    src={teacher.photo}
                    alt={teacher.fullName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-600/30 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{teacher.fullName}</span>
                    </div>
                    <div className="text-xs text-emerald-700 font-arabic mt-0.5">{teacher.arabicTitle}</div>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {teacher.teacherId}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 mt-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-800">{teacher.qualification}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{teacher.experienceYears} Years Tahfeez Experience</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-mono">{teacher.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                </div>

                {/* Assigned Batches */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Assigned Classes
                  </div>
                  {assignedClassNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedClassNames.map((cn) => (
                        <span
                          key={cn}
                          className="text-[11px] font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/60 px-2 py-0.5 rounded-md"
                        >
                          {cn.split('(')[0]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No direct batch assigned</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Specialization:</span>
                <span className="font-semibold text-slate-700">{teacher.specialization.split(',')[0]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
