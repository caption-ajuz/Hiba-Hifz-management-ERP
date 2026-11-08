import React, { useState } from 'react';
import { Teacher, ClassBatch, UserProfile, Campus } from '../types';
import { api } from '../services/api';
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
  KeyRound,
  Shield,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface TeacherManagementProps {
  teachers: Teacher[];
  classes: ClassBatch[];
  currentUser: UserProfile;
  campuses?: Campus[];
  onAddTeacher?: (teacher: Teacher) => void;
  onRefreshTeachers?: () => void;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({
  teachers,
  classes,
  currentUser,
  campuses = [],
  onAddTeacher,
  onRefreshTeachers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedTeacherForReset, setSelectedTeacherForReset] = useState<Teacher | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // New Usthad Form State
  const [fullName, setFullName] = useState('');
  const [arabicTitle, setArabicTitle] = useState('');
  const [teacherId, setTeacherId] = useState(`FAC-0${teachers.length + 20}`);
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('usthad123');
  const [assignedCampusId, setAssignedCampusId] = useState('campus-main');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [qualification, setQualification] = useState('Hafiz & Qari (Shatibiyyah & Durrah Sanad)');
  const [experienceYears, setExperienceYears] = useState(5);
  const [specialization, setSpecialization] = useState('Hifz, Tajweed & Murajath');
  const [accountStatus, setAccountStatus] = useState<'Active' | 'On Leave'>('Active');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleClassToggle = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        fullName,
        arabicTitle: arabicTitle || `الأستاذ ${fullName}`,
        teacherId,
        phone,
        email: email || `${username}@markazulhidaya.edu.in`,
        username: username.toLowerCase().trim(),
        password,
        assignedCampusId,
        assignedClassIds: selectedClassIds,
        qualification,
        experienceYears: Number(experienceYears),
        specialization,
        accountStatus,
        photo: '/assets/images/avatar_usthad_male_1794118062835.jpg',
      };

      const res = await api.createTeacher(payload);

      if (onAddTeacher && res.data?.teacher) {
        onAddTeacher(res.data.teacher);
      }
      if (onRefreshTeachers) {
        onRefreshTeachers();
      }

      setShowAddModal(false);
      // Reset form
      setFullName('');
      setArabicTitle('');
      setUsername('');
      setPassword('usthad123');
      setSelectedClassIds([]);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create Usthad account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForReset || !newPasswordInput) return;

    try {
      await api.resetTeacherPassword(selectedTeacherForReset.id, newPasswordInput);
      setResetMessage(`Password successfully updated for ${selectedTeacherForReset.fullName}`);
      setTimeout(() => {
        setShowResetModal(false);
        setResetMessage(null);
        setNewPasswordInput('');
      }, 2000);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

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
            Manage Hifz mentors, class batch assignments, authentication accounts, and credentials.
          </p>
        </div>

        {currentUser.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Usthad Faculty</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search mentors by name, teacher ID, specialization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {filteredTeachers.length} Usthad Mentors
        </div>
      </div>

      {/* Teachers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTeachers.map((teacher) => {
          const assignedClassNames = classes
            .filter((c) => teacher.assignedClassIds?.includes(c.id))
            .map((c) => c.name);

          return (
            <div
              key={teacher.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={teacher.photo}
                      alt={teacher.fullName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-emerald-600/30 shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-900 leading-tight">
                        {teacher.fullName}
                      </div>
                      <div className="text-xs text-emerald-700 font-arabic mt-0.5">
                        {teacher.arabicTitle}
                      </div>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {teacher.teacherId}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border self-start ${
                      teacher.accountStatus === 'Active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {teacher.accountStatus}
                  </span>
                </div>

                <div className="space-y-2 mt-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-800 leading-normal">
                      {teacher.qualification}
                    </span>
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

              <div className="pt-3 border-t border-slate-100 text-[11px] flex items-center justify-between">
                <span className="text-slate-400 truncate max-w-[150px]">
                  {teacher.specialization.split(',')[0]}
                </span>

                {currentUser.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => {
                      setSelectedTeacherForReset(teacher);
                      setNewPasswordInput('');
                      setShowResetModal(true);
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer inline-flex items-center gap-1 hover:underline"
                    title="Reset Login Password"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Reset Pass</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Usthad Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold">Create Usthad Faculty Account</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="p-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Usthad Full Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Mohammed Ajash T."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teacher ID *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="FAC-021"
                    value={teacherId}
                    onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Login Username *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. ajash"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono lowercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Password *
                  </label>
                  <input
                    required
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="+91 99610 65284"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="usthad@markazulhidaya.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus Assignment
                  </label>
                  <select
                    value={assignedCampusId}
                    onChange={(e) => setAssignedCampusId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="campus-main">Main Campus</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={accountStatus}
                    onChange={(e) => setAccountStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              {/* Class Batches Multi-Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Assigned Classes (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                  {classes.map((cls) => {
                    const isChecked = selectedClassIds.includes(cls.id);
                    return (
                      <label
                        key={cls.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-emerald-50 text-emerald-950 border-emerald-300 font-bold'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleClassToggle(cls.id)}
                          className="rounded text-emerald-700 focus:ring-emerald-500"
                        />
                        <span className="truncate">{cls.name.split('(')[0]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Qualification & Ijazah
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hafiz & Qari (Shatibiyyah & Durrah Sanad)"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specialization Focus
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sabq Acceleration & Tajweed Rules"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Creating Usthad...' : 'Save & Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showResetModal && selectedTeacherForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold">Reset Password</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetMessage ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetMessage}</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="text-xs text-slate-600">
                  Setting a new password for Usthad <strong>{selectedTeacherForReset.fullName}</strong> ({selectedTeacherForReset.teacherId}).
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password (min 6 characters)
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="Enter new password..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3.5 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
