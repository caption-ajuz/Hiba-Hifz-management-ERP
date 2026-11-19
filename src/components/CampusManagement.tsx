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
  AlertCircle,
  ShieldCheck,
  KeyRound,
  UserCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface CampusManagementProps {
  currentUser: UserProfile;
  students: Student[];
  teachers: Teacher[];
  classes: ClassBatch[];
  initialAction?: 'add' | { type: 'mudeer'; campusId: string } | null;
  onClearInitialAction?: () => void;
  onCampusesUpdated?: (updatedCampuses: Campus[]) => void;
}

const generateStrongPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#!';
  let pwd = 'Hyba@';
  for (let i = 0; i < 6; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
};

export const CampusManagement: React.FC<CampusManagementProps> = ({
  currentUser,
  students,
  teachers,
  classes,
  initialAction,
  onClearInitialAction,
  onCampusesUpdated,
}) => {
  const isHybaSuperAdmin = currentUser.role === 'HYBA_SUPER_ADMIN';

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // Add / Edit Campus Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    arabicName: '',
    address: '',
    phone: '',
    email: '',
    logo: '/assets/aistudio/__Hidaya_Updates_01__20261021_215417_1e0cd263.jpg',
    status: 'Active' as 'Active' | 'Inactive',
    establishedYear: '2026',
    principalName: '',
  });

  // Mudeer provisioning state inside Add Campus modal
  const [createMudeerMode, setCreateMudeerMode] = useState<'new' | 'existing'>('new');
  const [createMudeerTeacherId, setCreateMudeerTeacherId] = useState<string>('');
  const [createMudeerArabicName, setCreateMudeerArabicName] = useState<string>('');
  const [createMudeerPhone, setCreateMudeerPhone] = useState<string>('+91 ');
  const [createMudeerEmail, setCreateMudeerEmail] = useState<string>('');
  const [createMudeerUsername, setCreateMudeerUsername] = useState<string>('');
  const [createMudeerPassword, setCreateMudeerPassword] = useState<string>('');
  const [showCreateMudeerPassword, setShowCreateMudeerPassword] = useState<boolean>(false);

  // Dedicated Assign / Update Mudeer & Credentials Modal
  const [isMudeerModalOpen, setIsMudeerModalOpen] = useState<boolean>(false);
  const [mudeerTargetCampus, setMudeerTargetCampus] = useState<Campus | null>(null);
  const [mudeerMode, setMudeerMode] = useState<'new' | 'existing'>('new');
  const [mudeerTeacherId, setMudeerTeacherId] = useState<string>('');
  const [mudeerFullName, setMudeerFullName] = useState<string>('');
  const [mudeerArabicName, setMudeerArabicName] = useState<string>('');
  const [mudeerPhone, setMudeerPhone] = useState<string>('');
  const [mudeerEmail, setMudeerEmail] = useState<string>('');
  const [mudeerUsername, setMudeerUsername] = useState<string>('');
  const [mudeerPassword, setMudeerPassword] = useState<string>('');
  const [showMudeerPassword, setShowMudeerPassword] = useState<boolean>(false);
  const [mudeerError, setMudeerError] = useState<string | null>(null);
  const [isSubmittingMudeer, setIsSubmittingMudeer] = useState<boolean>(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadCampuses = async () => {
    try {
      setIsLoading(true);
      const data = await api.getCampuses();
      setCampuses(data);
      if (onCampusesUpdated) {
        onCampusesUpdated(data);
      }
      setSelectedCampus((prev) => {
        if (prev) {
          return data.find((c) => c.id === prev.id) || data[0] || null;
        }
        return data[0] || null;
      });
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
    setCreateMudeerMode('new');
    setCreateMudeerTeacherId(teachers[0]?.id || '');
    setCreateMudeerArabicName('');
    setCreateMudeerPhone('+91 ');
    setCreateMudeerEmail('');
    setCreateMudeerUsername('');
    setCreateMudeerPassword('');
    setShowCreateMudeerPassword(false);
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

  const openMudeerModal = (campus: Campus) => {
    setMudeerTargetCampus(campus);
    setMudeerMode('new');
    setMudeerTeacherId(teachers[0]?.id || '');
    setMudeerFullName(campus.principalName || '');
    setMudeerArabicName('');
    setMudeerPhone(campus.mudeerPhone || campus.phone || '+91 ');
    setMudeerEmail(campus.mudeerEmail || campus.email || '');
    setMudeerUsername(campus.mudeerUsername || '');
    setMudeerPassword('');
    setShowMudeerPassword(false);
    setMudeerError(null);
    setIsMudeerModalOpen(true);
  };

  useEffect(() => {
    if (!initialAction || !isHybaSuperAdmin) return;
    if (initialAction === 'add') {
      openAddModal();
      onClearInitialAction?.();
    } else if (typeof initialAction === 'object' && initialAction.type === 'mudeer') {
      const target = campuses.find((c) => c.id === initialAction.campusId);
      if (target) {
        setSelectedCampus(target);
        openMudeerModal(target);
        onClearInitialAction?.();
      }
    }
  }, [initialAction, campuses, isHybaSuperAdmin]);

  const handleToggleStatus = async (campus: Campus) => {
    if (!isHybaSuperAdmin) return;
    setBannerError(null);
    const nextStatus: 'Active' | 'Inactive' = campus.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.updateCampus(campus.id, { status: nextStatus });
      const nextList: Campus[] = campuses.map((c) =>
        c.id === campus.id ? { ...c, status: nextStatus } : c
      );
      setCampuses(nextList);
      onCampusesUpdated?.(nextList);
      if (selectedCampus?.id === campus.id) {
        setSelectedCampus((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
      setBannerSuccess(`Updated ${campus.name} status to ${nextStatus}.`);
    } catch (err: any) {
      setBannerError(err.message || 'Failed to update campus status.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHybaSuperAdmin) return;
    setFormError(null);
    setBannerError(null);
    setBannerSuccess(null);

    if (!editingCampus) {
      if (createMudeerMode === 'new' && !formData.principalName.trim()) {
        setFormError('Please enter the Mudeer full name for the new campus.');
        return;
      }
      if (createMudeerMode === 'existing' && !createMudeerTeacherId) {
        setFormError('Please select a teacher to appoint as Campus Mudeer.');
        return;
      }
      if (!createMudeerUsername.trim() || createMudeerUsername.trim().length < 3) {
        setFormError('Mudeer username must be at least 3 characters.');
        return;
      }
      if (!createMudeerPassword || createMudeerPassword.length < 8) {
        setFormError('Mudeer password must be at least 8 characters.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingCampus) {
        const updated = await api.updateCampus(editingCampus.id, formData);
        const nextList = campuses.map((c) => (c.id === editingCampus.id ? { ...c, ...updated } : c));
        setCampuses(nextList);
        onCampusesUpdated?.(nextList);
        if (selectedCampus?.id === editingCampus.id) {
          setSelectedCampus({ ...selectedCampus, ...updated });
        }
        setBannerSuccess(`Updated details for ${updated.name || formData.name}.`);
      } else {
        const chosenTeacher =
          createMudeerMode === 'existing'
            ? teachers.find((t) => t.id === createMudeerTeacherId)
            : undefined;

        const payload = {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          arabicName: formData.arabicName.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          logo: formData.logo,
          status: formData.status,
          establishedYear: formData.establishedYear.trim() || '2026',
          mudeerMode: createMudeerMode,
          existingTeacherId: createMudeerMode === 'existing' ? createMudeerTeacherId : undefined,
          mudeerName:
            createMudeerMode === 'existing'
              ? chosenTeacher?.fullName || formData.principalName
              : formData.principalName.trim(),
          mudeerArabicName:
            createMudeerMode === 'existing'
              ? chosenTeacher?.arabicTitle
              : createMudeerArabicName.trim(),
          mudeerPhone: createMudeerPhone.trim() || formData.phone.trim(),
          mudeerEmail: createMudeerEmail.trim() || formData.email.trim(),
          mudeerUsername: createMudeerUsername.trim().toLowerCase(),
          mudeerPassword: createMudeerPassword,
        };

        const created = await api.createCampus(payload);
        const nextList = [...campuses, created];
        setCampuses(nextList);
        onCampusesUpdated?.(nextList);
        setSelectedCampus(created);
        setBannerSuccess(
          `Created ${created.name} and provisioned Campus Mudeer account @${created.mudeerUsername || payload.mudeerUsername}.`
        );
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please verify input data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignMudeer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mudeerTargetCampus || !isHybaSuperAdmin) return;
    setMudeerError(null);
    setBannerSuccess(null);

    if (mudeerMode === 'new' && !mudeerFullName.trim()) {
      setMudeerError('Mudeer full name is required.');
      return;
    }
    if (mudeerMode === 'existing' && !mudeerTeacherId) {
      setMudeerError('Please select a teacher to appoint as Mudeer.');
      return;
    }
    if (!mudeerUsername.trim() || mudeerUsername.trim().length < 3) {
      setMudeerError('Mudeer username must be at least 3 characters.');
      return;
    }
    const isCreatingFreshLogin = !mudeerTargetCampus.mudeerUserId || mudeerMode === 'existing';
    if (isCreatingFreshLogin && (!mudeerPassword || mudeerPassword.length < 8)) {
      setMudeerError('Please set an initial password of at least 8 characters.');
      return;
    }
    if (mudeerPassword && mudeerPassword.length < 8) {
      setMudeerError('New password must be at least 8 characters.');
      return;
    }

    setIsSubmittingMudeer(true);
    try {
      const chosenTeacher =
        mudeerMode === 'existing' ? teachers.find((t) => t.id === mudeerTeacherId) : undefined;

      const updatedCampus = await api.assignCampusMudeer(mudeerTargetCampus.id, {
        mudeerMode,
        existingTeacherId: mudeerMode === 'existing' ? mudeerTeacherId : undefined,
        mudeerName: mudeerMode === 'existing' ? chosenTeacher?.fullName : mudeerFullName.trim(),
        mudeerArabicName: mudeerMode === 'existing' ? chosenTeacher?.arabicTitle : mudeerArabicName.trim(),
        mudeerPhone: mudeerPhone.trim() || mudeerTargetCampus.phone,
        mudeerEmail: mudeerEmail.trim() || mudeerTargetCampus.email,
        mudeerUsername: mudeerUsername.trim().toLowerCase(),
        mudeerPassword: mudeerPassword || undefined,
      });

      const nextList = campuses.map((c) =>
        c.id === mudeerTargetCampus.id ? { ...c, ...updatedCampus } : c
      );
      setCampuses(nextList);
      onCampusesUpdated?.(nextList);
      if (selectedCampus?.id === mudeerTargetCampus.id) {
        setSelectedCampus({ ...selectedCampus, ...updatedCampus });
      }
      setBannerSuccess(
        `Assigned Mudeer ${updatedCampus.principalName} (@${updatedCampus.mudeerUsername}) for ${updatedCampus.name}.`
      );
      setIsMudeerModalOpen(false);
    } catch (err: any) {
      setMudeerError(err.message || 'Failed to update Campus Mudeer.');
    } finally {
      setIsSubmittingMudeer(false);
    }
  };

  const filteredCampuses = campuses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      (c.principalName && c.principalName.toLowerCase().includes(q)) ||
      (c.mudeerUsername && c.mudeerUsername.toLowerCase().includes(q)) ||
      (c.arabicName && c.arabicName.includes(q))
    );
  });

  const activeCampusId = selectedCampus?.id;
  const campusStudents = students.filter((s) => s.campusId === activeCampusId);
  const campusTeachers = teachers.filter((t) => t.assignedCampusId === activeCampusId);
  const campusClasses = classes.filter((c) => c.campusId === activeCampusId);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Campus & Mudeer Registry
          </h1>
        </div>

        {isHybaSuperAdmin && (
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Campus & Mudeer</span>
          </button>
        )}
      </div>

      {bannerSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bannerSuccess}</span>
          </div>
          <button onClick={() => setBannerSuccess(null)} className="text-emerald-700 hover:text-emerald-950 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {bannerError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{bannerError}</span>
          </div>
          <button onClick={() => setBannerError(null)} className="text-rose-700 hover:text-rose-950 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Campus Directory & Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campus List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campuses or Mudeer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {isLoading && campuses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-400">
                Loading campuses...
              </div>
            ) : (
              filteredCampuses.map((campus) => {
                const isSelected = selectedCampus?.id === campus.id;
                return (
                  <div
                    key={campus.id}
                    onClick={() => setSelectedCampus(campus)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-emerald-600 shadow-sm ring-1 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
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
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 leading-tight truncate">
                            {campus.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {campus.code} · Est. {campus.establishedYear}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
                          campus.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {campus.status}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="truncate font-medium flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{campus.principalName || 'Unassigned'}</span>
                      </span>
                      {campus.mudeerUsername && (
                        <span className="font-mono text-[10px] text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded shrink-0">
                          @{campus.mudeerUsername}
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Students</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5 tabular-nums">
                          {campus.studentCount ?? students.filter((s) => s.campusId === campus.id).length}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Teachers</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5 tabular-nums">
                          {campus.teacherCount ?? teachers.filter((t) => t.assignedCampusId === campus.id).length}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Classes</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5 tabular-nums">
                          {campus.classCount ?? classes.filter((c) => c.campusId === campus.id).length}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Campus Details & Roster View */}
        <div className="lg:col-span-2 space-y-4">
          {selectedCampus ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              {/* Campus Hero Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
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

                {isHybaSuperAdmin && (
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => openMudeerModal(selectedCampus)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                      <span>Assign / Update Mudeer</span>
                    </button>
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
                )}
              </div>

              {/* Campus Meta Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="text-slate-400 font-medium">Contact Phone</div>
                  <div className="font-mono font-semibold text-slate-800 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/70 space-y-1">
                  <div className="text-amber-800 font-semibold flex items-center justify-between">
                    <span>Campus Mudeer</span>
                    {selectedCampus.mudeerUsername && (
                      <span className="font-mono text-[10px] bg-white px-1.5 py-0.2 rounded border border-amber-200">
                        @{selectedCampus.mudeerUsername}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-slate-900 flex items-center gap-1 truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span className="truncate">{selectedCampus.principalName || 'Unassigned'}</span>
                  </div>
                  {selectedCampus.mudeerPhone && (
                    <div className="text-[10px] text-slate-500 font-mono">{selectedCampus.mudeerPhone}</div>
                  )}
                </div>
              </div>

              {/* Campus Roster & Resources */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Campus Roster & Resources ({selectedCampus.name})
                  </h3>
                  <div className="text-xs text-slate-400 font-mono tabular-nums">
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
                                Usthad: {usthad?.fullName || 'Assigned Mentor'} · {cls.roomNumber}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 tabular-nums">
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

      {/* Add / Edit Campus Modal (HYBA Super Admin only) */}
      {isModalOpen && isHybaSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-950 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold">
                  {editingCampus ? 'Edit Campus Details' : 'Register New HYBA Campus & Mudeer'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Section 1: Campus Details */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 border-b border-slate-100 pb-1">
                  1. Campus Branch Profile
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Campus Name *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Markazul Hidaya North Branch"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Campus Code *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. HYBA-NORTH"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Arabic Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. فرع الهداية الشمالي"
                      value={formData.arabicName}
                      onChange={(e) => setFormData({ ...formData, arabicName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-arabic"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Established Year
                    </label>
                    <input
                      type="text"
                      value={formData.establishedYear}
                      onChange={(e) => setFormData({ ...formData, establishedYear: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Campus Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Complete physical address..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Contact Phone *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="+91 4924 220000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Official Email *
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="campus@markazulhidaya.edu.in"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                    />
                  </div>
                </div>

                {editingCampus && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Assigned Mudeer Name
                      </label>
                      <input
                        type="text"
                        value={formData.principalName}
                        onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Campus Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-semibold"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Mudeer Selection & Credentials (only on Create Campus) */}
              {!editingCampus && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                      2. Select Campus Mudeer & Login Credentials
                    </div>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg font-semibold"
                    >
                      <option value="Active">Status: Active</option>
                      <option value="Inactive">Status: Inactive</option>
                    </select>
                  </div>

                  {/* Mode Toggle */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCreateMudeerMode('new')}
                      className={`py-2 px-3 rounded-lg font-bold transition-colors cursor-pointer ${
                        createMudeerMode === 'new'
                          ? 'bg-white text-emerald-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Create New Mudeer Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateMudeerMode('existing')}
                      className={`py-2 px-3 rounded-lg font-bold transition-colors cursor-pointer ${
                        createMudeerMode === 'existing'
                          ? 'bg-white text-emerald-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Promote Existing Usthad
                    </button>
                  </div>

                  {createMudeerMode === 'existing' ? (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Select Teacher / Usthad to Appoint as Mudeer *
                      </label>
                      <select
                        value={createMudeerTeacherId}
                        onChange={(e) => {
                          const tId = e.target.value;
                          setCreateMudeerTeacherId(tId);
                          const t = teachers.find((x) => x.id === tId);
                          if (t) {
                            setCreateMudeerPhone(t.phone);
                            setCreateMudeerEmail(t.email);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                      >
                        <option value="">-- Choose Usthad --</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.fullName} ({t.teacherId})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Mudeer Full Name *
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. Usthad Ibrahim Al-Kombami"
                          value={formData.principalName}
                          onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Mudeer Arabic Title
                        </label>
                        <input
                          type="text"
                          placeholder="الشيخ إبراهيم"
                          value={createMudeerArabicName}
                          onChange={(e) => setCreateMudeerArabicName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-arabic"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mudeer Phone (for Password Reset) *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="+91 94471 20002"
                        value={createMudeerPhone}
                        onChange={(e) => setCreateMudeerPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Mudeer Email *
                      </label>
                      <input
                        required
                        type="email"
                        placeholder="mudir.branch@markazulhidaya.edu.in"
                        value={createMudeerEmail}
                        onChange={(e) => setCreateMudeerEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                    <div>
                      <label className="block font-bold text-amber-950 mb-1">
                        Mudeer Login Username *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. mudir.north"
                        value={createMudeerUsername}
                        onChange={(e) => setCreateMudeerUsername(e.target.value.toLowerCase())}
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg focus:outline-hidden font-mono lowercase"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-amber-950">
                          Mudeer Password *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateMudeerPassword(generateStrongPassword());
                            setShowCreateMudeerPassword(true);
                          }}
                          className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Generate</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          required
                          minLength={8}
                          type={showCreateMudeerPassword ? 'text' : 'password'}
                          placeholder="Min 8 characters"
                          value={createMudeerPassword}
                          onChange={(e) => setCreateMudeerPassword(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 bg-white border border-amber-200 rounded-lg focus:outline-hidden font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreateMudeerPassword(!showCreateMudeerPassword)}
                          className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showCreateMudeerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingCampus
                    ? 'Update Campus'
                    : 'Register Campus & Mudeer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Update Mudeer & Login Credentials Modal */}
      {isMudeerModalOpen && mudeerTargetCampus && isHybaSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">Campus Mudeer & Credentials</h3>
                  <div className="text-[11px] text-slate-300">{mudeerTargetCampus.name}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMudeerModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignMudeer} className="p-6 space-y-3.5 text-xs max-h-[82vh] overflow-y-auto">
              {mudeerError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{mudeerError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMudeerMode('new')}
                  className={`py-2 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
                    mudeerMode === 'new'
                      ? 'bg-white text-emerald-900 shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  Update / Create Profile
                </button>
                <button
                  type="button"
                  onClick={() => setMudeerMode('existing')}
                  className={`py-2 px-2 rounded-lg font-bold transition-colors cursor-pointer ${
                    mudeerMode === 'existing'
                      ? 'bg-white text-emerald-900 shadow-2xs'
                      : 'text-slate-600'
                  }`}
                >
                  Promote Existing Usthad
                </button>
              </div>

              {mudeerMode === 'existing' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Usthad to Assign as Campus Mudeer *
                  </label>
                  <select
                    value={mudeerTeacherId}
                    onChange={(e) => {
                      const tId = e.target.value;
                      setMudeerTeacherId(tId);
                      const t = teachers.find((x) => x.id === tId);
                      if (t) {
                        setMudeerPhone(t.phone);
                        setMudeerEmail(t.email);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-medium"
                  >
                    <option value="">-- Choose Usthad --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.teacherId})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mudeer Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={mudeerFullName}
                      onChange={(e) => setMudeerFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Arabic Name
                    </label>
                    <input
                      type="text"
                      value={mudeerArabicName}
                      onChange={(e) => setMudeerArabicName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-arabic"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mudeer Phone *
                  </label>
                  <input
                    required
                    type="text"
                    value={mudeerPhone}
                    onChange={(e) => setMudeerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mudeer Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={mudeerEmail}
                    onChange={(e) => setMudeerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <div>
                  <label className="block font-bold text-amber-950 mb-1">
                    Mudeer Login Username *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. mudir.city"
                    value={mudeerUsername}
                    onChange={(e) => setMudeerUsername(e.target.value.toLowerCase())}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg focus:outline-hidden font-mono lowercase"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-amber-950">
                      {mudeerTargetCampus.mudeerUserId && mudeerMode === 'new'
                        ? 'Reset Mudeer Password (optional)'
                        : 'Set Mudeer Password *'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMudeerPassword(generateStrongPassword());
                        setShowMudeerPassword(true);
                      }}
                      className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Generate</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showMudeerPassword ? 'text' : 'password'}
                      minLength={8}
                      placeholder={
                        mudeerTargetCampus.mudeerUserId && mudeerMode === 'new'
                          ? 'Leave blank to keep existing password'
                          : 'Min 8 characters'
                      }
                      value={mudeerPassword}
                      onChange={(e) => setMudeerPassword(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-amber-200 rounded-lg focus:outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMudeerPassword(!showMudeerPassword)}
                      className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showMudeerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMudeerModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMudeer}
                  className="px-5 py-2 font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingMudeer ? 'Saving...' : 'Save Mudeer & Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
