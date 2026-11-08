import React, { useState } from 'react';
import { ClassBatch, Teacher, Student, UserProfile } from '../types';
import { Layers, Users, Building, Plus, Calendar, CheckCircle } from 'lucide-react';

interface ClassManagementProps {
  classes: ClassBatch[];
  teachers: Teacher[];
  students: Student[];
  currentUser: UserProfile;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
  classes,
  teachers,
  students,
  currentUser,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <Layers className="w-3.5 h-3.5" />
            <span>Class & Batch Architecture</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Tahfeez Batches & Classrooms
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Overview of study halls, assigned mentor Usthads, and student distribution.
          </p>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls) => {
          const mentor = teachers.find((t) => t.id === cls.usthadId);
          const enrolledCount = students.filter((s) => s.classId === cls.id).length;
          const capacityPercent = Math.round((enrolledCount / cls.capacity) * 100);

          return (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{cls.name}</h3>
                  <div className="text-xs text-emerald-700 font-arabic mt-0.5">{cls.arabicName}</div>
                </div>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {cls.roomNumber}
                </span>
              </div>

              {mentor && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <img
                    src={mentor.photo}
                    alt={mentor.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Class Mentor Usthad</div>
                    <div className="text-xs font-bold text-slate-900">{mentor.fullName}</div>
                    <div className="text-[10px] text-emerald-700">{mentor.teacherId}</div>
                  </div>
                </div>
              )}

              {/* Strength & Capacity */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Student Enrollment</span>
                  <span className="font-mono font-bold text-slate-900">
                    {enrolledCount} / {cls.capacity} Seats ({capacityPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${Math.min(100, capacityPercent)}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Academic Year: {cls.academicYear}</span>
                <span className="text-emerald-700 font-semibold">Active Session</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
