import React, { useState } from 'react';
import { ClassBatch, Teacher, Student, UserProfile } from '../types';
import { api } from '../services/api';
import {
  Layers,
  Users,
  Building,
  Plus,
  Calendar,
  CheckCircle,
  X,
  AlertCircle,
  DoorOpen,
} from 'lucide-react';

interface ClassManagementProps {
  classes: ClassBatch[];
  teachers: Teacher[];
  students: Student[];
  currentUser: UserProfile;
  onAddClass?: (newClass: ClassBatch) => void;
  onRefreshClasses?: () => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
  classes,
  teachers,
  students,
  currentUser,
  onAddClass,
  onRefreshClasses,
}) => {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isUsthad = currentUser.role === 'USTHAD';

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [arabicName, setArabicName] = useState('');
  const [usthadId, setUsthadId] = useState(teachers[0]?.id || 'usr_teacher_01');
  const [roomNumber, setRoomNumber] = useState('Hall 103');
  const [capacity, setCapacity] = useState(30);
  const [academicYear, setAcademicYear] = useState('2026 - 2027');
  const [campusId, setCampusId] = useState('campus-main');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If Usthad, filter or sort to show assigned classes first
  const displayClasses = isUsthad
    ? classes.filter((c) => currentUser.assignedClassIds?.includes(c.id))
    : classes;

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        arabicName: arabicName || name,
        usthadId,
        roomNumber,
        capacity: Number(capacity),
        academicYear,
        campusId,
      };

      const created = await api.createClass(payload);
      if (onAddClass) onAddClass(created);
      if (onRefreshClasses) onRefreshClasses();

      setShowAddModal(false);
      setName('');
      setArabicName('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create class.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            {isUsthad ? 'My Assigned Class Batches' : 'Tahfeez Batches & Classrooms'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            {isUsthad
              ? 'Class study halls and student enrollments assigned to your mentorship.'
              : 'Overview of study halls, assigned mentor Usthads, and student distribution.'}
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Batch</span>
          </button>
        )}
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayClasses.map((cls) => {
          const mentor = teachers.find((t) => t.id === cls.usthadId);
          const enrolledCount = students.filter((s) => s.classId === cls.id).length;
          const capacityPercent = Math.round((enrolledCount / cls.capacity) * 100);
          const isMyBatch = isUsthad && currentUser.assignedClassIds?.includes(cls.id);

          return (
            <div
              key={cls.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all space-y-4 ${
                isMyBatch ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{cls.name}</h3>
                    {isMyBatch && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                        My Batch
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-emerald-700 font-arabic mt-0.5">{cls.arabicName}</div>
                </div>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                  {cls.roomNumber}
                </span>
              </div>

              {mentor && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <img
                    src={mentor.photo}
                    alt={mentor.fullName}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Class Mentor Usthad</div>
                    <div className="text-xs font-bold text-slate-900">{mentor.fullName}</div>
                    <div className="text-[10px] text-emerald-700 font-mono">{mentor.teacherId}</div>
                  </div>
                </div>
              )}

              {/* Strength & Capacity */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Student Enrollment</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    {enrolledCount} / {cls.capacity} Seats ({capacityPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
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

      {/* Create Class Modal (Super Admin only) */}
      {showAddModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold">Create New Classroom Batch</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Batch Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Hifz Batch D (Al-Kawthar)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Arabic Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. شعبة الكوثر"
                  value={arabicName}
                  onChange={(e) => setArabicName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-arabic"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mentor Usthad *
                </label>
                <select
                  value={usthadId}
                  onChange={(e) => setUsthadId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.teacherId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Room / Hall Number
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Seat Capacity
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
