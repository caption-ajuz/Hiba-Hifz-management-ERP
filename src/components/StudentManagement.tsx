import React, { useState } from 'react';
import { Student, ClassBatch, Teacher, UserProfile } from '../types';
import { api } from '../services/api';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  IdCard,
  BookOpen,
  CalendarCheck,
  User,
  Phone,
  Mail,
  MoreVertical,
  X,
  CheckCircle2,
  UploadCloud,
  Camera,
  Loader2,
} from 'lucide-react';

interface StudentManagementProps {
  students: Student[];
  classes: ClassBatch[];
  teachers: Teacher[];
  currentUser: UserProfile;
  onOpenIdCard: (student: Student) => void;
  onAddStudent: (student: Student) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  classes,
  teachers,
  currentUser,
  onOpenIdCard,
  onAddStudent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Student Form State
  const [fullName, setFullName] = useState('');
  const [arabicName, setArabicName] = useState('');
  const [rollNumber, setRollNumber] = useState(students.length + 1);
  const [admissionNumber, setAdmissionNumber] = useState(`248${students.length + 1}`);
  const [dob, setDob] = useState('2011-01-01');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('+91 ');
  const [classId, setClassId] = useState(classes[0]?.id || 'batch-a');
  const [photoUrl, setPhotoUrl] = useState('/src/assets/images/avatar_student_male_1794118079992.jpg');
  const [photoPublicId, setPhotoPublicId] = useState<string | undefined>(undefined);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const res = await api.uploadMedia(file, 'students', photoPublicId);
      setPhotoUrl(res.secure_url);
      setPhotoPublicId(res.public_id);
    } catch (err: any) {
      console.error('Failed to upload image to Cloudinary', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (selectedClassFilter !== 'ALL' && s.classId !== selectedClassFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.admissionNumber.includes(q) ||
        s.rollNumber.toString().includes(q) ||
        s.parentName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const newStudent: Student = {
      id: `std_${Date.now()}`,
      rollNumber: Number(rollNumber),
      admissionNumber: admissionNumber,
      fullName: fullName,
      arabicName: arabicName || fullName,
      photo: photoUrl,
      dateOfBirth: dob,
      gender: gender,
      parentName: parentName,
      parentPhone: parentPhone,
      parentEmail: `${fullName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      admissionDate: new Date().toISOString().split('T')[0],
      campusId: 'campus-main',
      classId: classId,
      assignedTeacherId: 'usr_teacher_01',
      accountStatus: 'Active',
      currentJuz: 1,
      completedJuzList: [30],
      totalMemorizedAyahs: 564,
      attendanceRate: 100,
    };

    onAddStudent(newStudent);
    setShowAddModal(false);
    setFullName('');
    setArabicName('');
    setParentName('');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Registry</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Student Management & Profiles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Browse enrolled Hifz students, review memorization progress, and generate official ID cards.
          </p>
        </div>

        {currentUser.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll New Student</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, roll # or adm #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <span className="text-slate-400">Filter Batch:</span>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">All Batches ({students.length})</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Roll & Student</th>
                <th className="py-3 px-4 font-semibold">Admission #</th>
                <th className="py-3 px-4 font-semibold">Batch</th>
                <th className="py-3 px-4 font-semibold">Current Juz</th>
                <th className="py-3 px-4 font-semibold">Total Completed</th>
                <th className="py-3 px-4 font-semibold">Attendance</th>
                <th className="py-3 px-4 font-semibold">Parent Contact</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStudents.map((std) => {
                const cls = classes.find((c) => c.id === std.classId);
                return (
                  <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center font-mono font-bold text-slate-400">
                          #{std.rollNumber}
                        </span>
                        <img
                          src={std.photo}
                          alt={std.fullName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{std.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-arabic">{std.arabicName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-600">
                      {std.admissionNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-800 font-medium">
                        {cls?.name.split('(')[0] || 'Batch A'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                        Juz {std.currentJuz}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {std.completedJuzList.length} / 30 Juz
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span
                          className={`font-bold ${
                            std.attendanceRate >= 95 ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {std.attendanceRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[11px] text-slate-700 font-medium">{std.parentName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{std.parentPhone}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onOpenIdCard(std)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="View Official Digital Student ID Card"
                      >
                        <IdCard className="w-3.5 h-3.5" />
                        <span>ID Card</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Enroll New Tahfeez Student</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Cloudinary Photo Upload & Preview */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500 bg-slate-100 shrink-0">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">Student Profile Photo</div>
                  <div className="text-[11px] text-slate-500">Secure Cloudinary CDN upload</div>
                  <label className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Uploading to Cloudinary...' : 'Upload Picture'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                      disabled={isUploadingPhoto}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Full Name
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Tariq Anwar"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Arabic Name
                  </label>
                  <input
                    type="text"
                    placeholder="طارق أنور"
                    value={arabicName}
                    onChange={(e) => setArabicName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-arabic"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admission Number
                  </label>
                  <input
                    required
                    type="text"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Roll Number
                  </label>
                  <input
                    required
                    type="number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class / Batch
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent / Guardian Full Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Anwar Hussain"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent Phone Number
                </label>
                <input
                  required
                  type="text"
                  placeholder="+91 94470 12345"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
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
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
