import React, { useState, useEffect } from 'react';
import { Campus, Student, Teacher, ClassBatch, UserProfile } from '../types';
import { api } from '../services/api';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Users,
  Layers,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface CampusManagementProps {
  currentUser: UserProfile;
  students: Student[];
  teachers: Teacher[];
  classes: ClassBatch[];
}

export const CampusManagement: React.FC<CampusManagementProps> = ({
  currentUser,
  students,
  teachers,
  classes,
}) => {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    arabicName: '',
    address: '',
    phone: '',
    email: '',
    logo: '/assets/aistudio/__Hidaya_Updates_01__20261021_215417_1e0cd263.jpg',
    status: 'Active' as 'Active' | 'Inactive',
    establishedYear: '1994',
    principalName: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [viewingRosterCampus, setViewingRosterCampus] = useState<Campus | null>(null);

  const loadCampuses = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCampuses();
      setCampuses(data);
      if (data.length > 0 && !selectedCampus) {
        setSelectedCampus(data[0]);
      }
    } catch (err: any) {
      console.error('[CampusManagement] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampuses();
  }, []);

  const openAddModal = () => {
    setEditingCampus(null);
    setFormData({
      name: '',
      code: '',
      arabicName: '',
      address: '',
      phone: '+91 ',
      email: '',
      logo: '/assets/aistudio/__Hidaya_Updates_01__20261021_215417_1e0cd263.jpg',
      status: 'Active',
      establishedYear: '2026',
      principalName: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (campus: Campus) => {
    setEditingCampus(campus);
    setFormData({
      name: campus.name,
      code: campus.code,
      arabicName: campus.arabicName || '',
      address: campus.address,
      phone: campus.phone,
      email: campus.email,
      logo: campus.logo || '/assets/aistudio/__Hidaya_Updates_01__20261021_215417_1e0cd263.jpg',
      status: campus.status,
      establishedYear: campus.establishedYear || '1994',
      principalName: campus.principalName || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (campus: Campus) => {
    const nextStatus = campus.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.updateCampus(campus.id, { status: nextStatus });
      setCampuses((prev) =>
        prev.map((c) => (c.id === campus.id ? { ...c, status: nextStatus } : c))
      );
      if (selectedCampus?.id === campus.id) {
        setSelectedCampus((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingCampus) {
        const updated = await api.updateCampus(editingCampus.id, formData);
        setCampuses((prev) => prev.map((c) => (c.id === editingCampus.id ? { ...c, ...updated } : c)));
        if (selectedCampus?.id === editingCampus.id) {
          setSelectedCampus({ ...selectedCampus, ...updated });
        }
      } else {
        const created = await api.createCampus(formData);
        setCampuses((prev) => [...prev, created]);
        setSelectedCampus(created);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please verify input data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCampuses = campuses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      (c.arabicName && c.arabicName.includes(q))
    );
  });

  // Calculate statistics for currently selected or viewing campus
  const activeCampusId = viewingRosterCampus?.id || selectedCampus?.id;
  const campusStudents = students.filter((s) => s.campusId === activeCampusId);
  const campusTeachers = teachers.filter((t) => t.assignedCampusId === activeCampusId);
  const campusClasses = classes.filter((c) => c.campusId === activeCampusId);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            <Building2 className="w-3.5 h-3.5" />
            <span>Institution Administration</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Campus & Branch Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Govern institutional branches, allocate classroom capacity, and audit multi-campus faculty and students.
          </p>
        </div>

        {currentUser.role === 'SUPER_ADMIN' && (
          <button
            onClick={openAddModal}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Campus</span>
          </button>
        )}
      </div>

      {/* Main Grid: Campus Directory & Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campus List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campuses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredCampuses.map((campus) => {
              const isSelected = selectedCampus?.id === campus.id;
              return (
                <div
                  key={campus.id}
                  onClick={() => {
                    setSelectedCampus(campus);
                    setViewingRosterCampus(null);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-emerald-600 shadow-sm ring-1 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-xs shrink-0 overflow-hidden">
                        {campus.logo ? (
                          <img
                            src={campus.logo}
                            alt=""
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          campus.code.slice(0, 3)
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">
                          {campus.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {campus.code} · Est. {campus.establishedYear}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        campus.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {campus.status}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Students</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        {campus.studentCount ?? students.filter((s) => s.campusId === campus.id).length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Teachers</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        {campus.teacherCount ?? teachers.filter((t) => t.assignedCampusId === campus.id).length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Classes</div>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        {campus.classCount ?? classes.filter((c) => c.campusId === campus.id).length}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Campus Details & Roster View */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCampus ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              {/* Campus Hero Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {selectedCampus.name}
                    </h2>
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      {selectedCampus.code}
                    </span>
                  </div>
                  {selectedCampus.arabicName && (
                    <div className="text-xs text-slate-500 font-arabic mt-0.5">
                      {selectedCampus.arabicName}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedCampus.address}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => openEditModal(selectedCampus)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Edit Campus</span>
                  </button>
                  <button
                    onClick={() => handleToggleStatus(selectedCampus)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                      selectedCampus.status === 'Active'
                        ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <span>{selectedCampus.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
                  </button>
                </div>
              </div>

              {/* Campus Meta Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-medium">Contact Phone</div>
                  <div className="font-mono font-semibold text-slate-800 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedCampus.phone}</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-medium">Official Email</div>
                  <div className="font-medium text-slate-800 flex items-center gap-1 truncate">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{selectedCampus.email}</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-medium">Campus Principal</div>
                  <div className="font-semibold text-slate-800 flex items-center gap-1 truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{selectedCampus.principalName || 'Sheikh Dr. Abdul Wahab'}</span>
                  </div>
                </div>
              </div>

              {/* Tabbed view or Segmented view of Campus Roster */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Campus Roster & Resources ({selectedCampus.name})
                  </h3>
                  <div className="text-xs text-slate-400 font-mono">
                    {campusStudents.length} Students · {campusTeachers.length} Mentors · {campusClasses.length} Batches
                  </div>
                </div>

                {/* Classes within campus */}
                <div>
                  <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Classes & Batches</span>
                  </div>
                  {campusClasses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {campusClasses.map((cls) => {
                        const usthad = teachers.find((t) => t.id === cls.usthadId);
                        const enrolledCount = students.filter((s) => s.classId === cls.id).length;
                        return (
                          <div
                            key={cls.id}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{cls.name}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Usthad: {usthad?.fullName.split(' ')[1] || 'Mentor'} · Room {cls.roomNumber}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                {enrolledCount} {enrolledCount === 1 ? 'Student' : 'Students'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                      No classroom batches allocated to this campus yet.
                    </div>
                  )}
                </div>

                {/* Faculty assigned to campus */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Usthad Mentors Assigned</span>
                  </div>
                  {campusTeachers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {campusTeachers.map((tch) => (
                        <div
                          key={tch.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white flex items-center gap-2.5 text-xs shadow-2xs"
                        >
                          <img
                            src={tch.photo}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="overflow-hidden">
                            <div className="font-bold text-slate-900 truncate">{tch.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {tch.teacherId} · {tch.specialization.split(',')[0]}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                      No teachers assigned to this campus.
                    </div>
                  )}
                </div>

                {/* Enrolled Students Quick View */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Enrolled Tahfeez Students ({campusStudents.length})</span>
                  </div>
                  {campusStudents.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                      {campusStudents.slice(0, 15).map((std) => (
                        <div
                          key={std.id}
                          className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold w-6 text-center">
                              #{std.rollNumber}
                            </span>
                            <span className="font-medium text-slate-800">{std.fullName}</span>
                          </div>
                          <span className="font-mono text-[11px] text-emerald-800">
                            Juz {std.currentJuz}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                      No students enrolled under this campus branch yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Select a campus from the list on the left to inspect configuration and rosters.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Campus Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold">
                  {editingCampus ? 'Edit Campus Details' : 'Register New Campus Branch'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Al-Furqan North Branch"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus Code *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. HYBA-NORTH"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arabic Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. فرع الفرقان"
                  value={formData.arabicName}
                  onChange={(e) => setFormData({ ...formData, arabicName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-arabic"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus Address *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Complete physical address..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="+91 4924 220000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="campus@markazulhidaya.edu.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Principal / In-Charge
                  </label>
                  <input
                    type="text"
                    placeholder="Sheikh / Usthad name..."
                    value={formData.principalName}
                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-semibold"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingCampus ? 'Update Campus' : 'Register Campus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
