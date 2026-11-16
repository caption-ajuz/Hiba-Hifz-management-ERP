import React, { useState, useEffect } from 'react';
import {
  IdCard,
  User,
  Users,
  Building,
  GraduationCap,
  Settings,
  Info,
  ChevronRight,
  CheckCircle2,
  X,
  Lock,
  LogOut,
  Camera,
  Loader2,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import { STUDENT_PROFILE_DATA } from '../../data/studentPortalData';
import { Student, UserProfile, ClassBatch } from '../../types';
import { DEFAULT_STUDENT_AVATAR, getStudentPhotoSrc } from '../../utils/avatarUtils';

interface StudentProfileViewProps {
  student?: Student;
  currentUser?: UserProfile;
  classes?: ClassBatch[];
  allowStudentProfileEdit?: boolean;
  onUpdateProfile?: (updates: Partial<Student>) => Promise<Student | void>;
  onOpenIdCard: () => void;
  onLogout: () => void;
  onChangePhoto?: () => void;
  onRemovePhoto?: () => void;
  onOpenChangePassword?: () => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  currentUser,
  classes = [],
  allowStudentProfileEdit = false,
  onUpdateProfile,
  onOpenIdCard,
  onLogout,
  onChangePhoto,
  onRemovePhoto,
  onOpenChangePassword,
}) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Self-edit modal state
  const [editAbout, setEditAbout] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);

  const displayName = student?.fullName || currentUser?.fullName || STUDENT_PROFILE_DATA.fullName;
  const displayArabicName = student?.arabicName || currentUser?.arabicName || STUDENT_PROFILE_DATA.arabicName;
  const displayAdmNo = student?.admissionNumber || currentUser?.referenceId || STUDENT_PROFILE_DATA.admissionNo;
  const rawAvatar = student?.photo || currentUser?.avatar || STUDENT_PROFILE_DATA.avatarUrl;
  const displayAvatar = getStudentPhotoSrc(rawAvatar);
  const hasCustomPhoto = Boolean(rawAvatar && rawAvatar.trim().length > 0 && rawAvatar !== DEFAULT_STUDENT_AVATAR);
  const displayDob = student?.dateOfBirth || STUDENT_PROFILE_DATA.dateOfBirth;
  const displayGender = student?.gender || STUDENT_PROFILE_DATA.gender;
  const displayUsername = currentUser?.username || displayAdmNo;
  const displayEmail = student?.email || currentUser?.email || student?.parentEmail || STUDENT_PROFILE_DATA.email;
  const displayPhone = student?.phone || currentUser?.phone || student?.parentPhone || STUDENT_PROFILE_DATA.phone;
  const displayAbout = student?.about || '';
  const displayAddress = student?.address || STUDENT_PROFILE_DATA.address;
  const displayBloodGroup = student?.bloodGroup || STUDENT_PROFILE_DATA.bloodGroup;
  const displayParentName = student?.parentName || STUDENT_PROFILE_DATA.parent.fatherName;
  const displayParentPhone = student?.parentPhone || STUDENT_PROFILE_DATA.parent.fatherPhone;
  const displayBatchName =
    classes.find((c) => c.id === student?.classId)?.name ||
    (student?.classId ? student.classId.toUpperCase() : STUDENT_PROFILE_DATA.admission.batch);
  const displayAdmissionDate = student?.admissionDate || STUDENT_PROFILE_DATA.admission.admissionDate;

  // Close edit modal automatically if Mudeer revokes editing permission while open
  useEffect(() => {
    if (!allowStudentProfileEdit && activeModal === 'editProfile') {
      setActiveModal(null);
    }
  }, [allowStudentProfileEdit, activeModal]);

  const openEditProfileModal = () => {
    if (!allowStudentProfileEdit) return;
    setEditAbout(student?.about || '');
    setEditEmail(student?.email || currentUser?.email || '');
    setEditPhone(student?.phone || currentUser?.phone || '');
    setEditAddress(student?.address || '');
    setEditBloodGroup(student?.bloodGroup || '');
    setProfileSaveError(null);
    setActiveModal('editProfile');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowStudentProfileEdit || !onUpdateProfile || isSavingProfile) return;

    const trimmedEmail = editEmail.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setProfileSaveError('Please enter a valid email address.');
      return;
    }

    setIsSavingProfile(true);
    setProfileSaveError(null);
    try {
      await onUpdateProfile({
        about: editAbout.trim(),
        email: trimmedEmail,
        phone: editPhone.trim(),
        address: editAddress.trim(),
        bloodGroup: editBloodGroup.trim(),
      });
      setActiveModal(null);
      setProfileSaveSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSaveSuccess(null), 4000);
    } catch (err: any) {
      setProfileSaveError(err?.message || 'Could not update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-28">
      {/* Top Header matching Screenshot 3 */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Profile</h1>
        <button
          onClick={() => setActiveModal('settings')}
          className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          title="Account Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {profileSaveSuccess && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{profileSaveSuccess}</span>
          </span>
          <button
            type="button"
            onClick={() => setProfileSaveSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Student Card (Matches Screenshot 3) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col items-center text-center space-y-3">
        {/* Avatar with Camera badge (only when editing permitted) */}
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-md bg-slate-100">
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_STUDENT_AVATAR;
              }}
            />
          </div>
          {allowStudentProfileEdit && onChangePhoto && (
            <button
              type="button"
              onClick={onChangePhoto}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white border-2 border-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              title="Upload / update photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {allowStudentProfileEdit && (onChangePhoto || (hasCustomPhoto && onRemovePhoto)) && (
          <div className="flex items-center justify-center gap-3 text-[11px] font-semibold">
            {onChangePhoto && (
              <button
                type="button"
                onClick={onChangePhoto}
                className="text-emerald-700 hover:underline cursor-pointer"
              >
                {hasCustomPhoto ? 'Change Photo' : 'Upload Photo'}
              </button>
            )}
            {hasCustomPhoto && onRemovePhoto && (
              <button
                type="button"
                onClick={onRemovePhoto}
                className="text-rose-600 hover:underline cursor-pointer"
              >
                Remove Photo
              </button>
            )}
          </div>
        )}

        {/* Student Name with Green Verified Checkmark */}
        <div>
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {displayName}
            </h2>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500 text-white" />
          </div>
          {displayArabicName && (
            <div dir="rtl" className="text-sm font-arabic text-emerald-800 mt-0.5">
              {displayArabicName}
            </div>
          )}
          <div className="text-xs text-slate-500 mt-0.5">
            {displayBatchName}
          </div>
        </div>

        {/* About Bio */}
        {displayAbout && (
          <p className="text-xs text-slate-600 max-w-sm leading-relaxed bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-2">
            {displayAbout}
          </p>
        )}

        {/* Register No & Admission No */}
        <div className="text-xs text-slate-600 font-mono space-y-0.5 pt-1">
          <div>Roll No : #{student?.rollNumber || '01'}</div>
          <div>Admission No : {displayAdmNo}</div>
        </div>

        {/* Edit Profile Button OR Locked Indicator */}
        <div className="pt-1">
          {allowStudentProfileEdit && onUpdateProfile ? (
            <button
              type="button"
              onClick={openEditProfileModal}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-500">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Profile Editing Locked by Mudeer</span>
            </div>
          )}
        </div>
      </div>

      {/* Profile Options List (Matches Screenshot 3) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {/* 1. My Virtual ID Card */}
        <button
          onClick={onOpenIdCard}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                My Virtual ID Card
              </div>
              <div className="text-[11px] text-slate-400">Barcode & institutional pass</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 2. Personal Details */}
        <button
          onClick={() => setActiveModal('personal')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Personal Details
              </div>
              <div className="text-[11px] text-slate-400">DOB, Gender, Address</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 3. Parents & Guardian Details */}
        <button
          onClick={() => setActiveModal('parents')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                Parents & Guardian Details
              </div>
              <div className="text-[11px] text-slate-400">Contact, Relation, Occupation</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 4. Admission Details */}
        <button
          onClick={() => setActiveModal('admission')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Admission Details
              </div>
              <div className="text-[11px] text-slate-400">Department, Programme, Batch</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 6. Account Details */}
        <button
          onClick={() => setActiveModal('account')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                Account Details
              </div>
              <div className="text-[11px] text-slate-400">Email, Username, Password</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 7. About */}
        <button
          onClick={() => setActiveModal('about')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                About
              </div>
              <div className="text-[11px] text-slate-400">College & Academy Information</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Copy Notification Toast */}
      {copiedField && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in z-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{copiedField} copied to clipboard</span>
        </div>
      )}

      {/* DETAIL MODALS */}

      {/* 1. Personal Details Modal */}
      {activeModal === 'personal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Personal Details</div>
                  <div className="text-[11px] text-slate-500">Official student records</div>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Full Name</span>
                <span className="font-bold text-slate-900">{displayName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Arabic Name</span>
                <span className="font-arabic font-bold text-slate-900 text-sm">
                  {displayArabicName}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Date of Birth</span>
                <span className="font-semibold text-slate-800">{displayDob}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Gender</span>
                <span className="font-semibold text-slate-800">{displayGender}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Blood Group</span>
                <span className="font-bold text-rose-600 font-mono">{displayBloodGroup}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Email Address</span>
                <span className="font-semibold text-slate-800">{displayEmail}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Phone Number</span>
                <span className="font-mono font-semibold text-slate-800">{displayPhone}</span>
              </div>
              {displayAbout && (
                <div className="pt-1 space-y-1">
                  <div className="text-slate-400">About</div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                    {displayAbout}
                  </div>
                </div>
              )}
              <div className="pt-1 space-y-1">
                <div className="text-slate-400">Permanent Residential Address</div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {displayAddress}
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              {allowStudentProfileEdit && onUpdateProfile && (
                <button
                  type="button"
                  onClick={openEditProfileModal}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer"
                >
                  Edit Details
                </button>
              )}
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Parents & Guardian Details Modal */}
      {activeModal === 'parents' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Parents & Guardian Details</div>
                  <div className="text-[11px] text-slate-500">Family & emergency contacts</div>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Guardian / Father's Name</span>
                <span className="font-bold text-slate-900">{displayParentName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Contact Number</span>
                <span className="font-mono font-bold text-indigo-600">
                  {displayParentPhone}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Relationship</span>
                <span className="font-semibold text-slate-800">{STUDENT_PROFILE_DATA.parent.relation}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Occupation</span>
                <span className="font-semibold text-slate-800">{STUDENT_PROFILE_DATA.parent.occupation}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Mother's Name</span>
                <span className="font-bold text-slate-900">{STUDENT_PROFILE_DATA.parent.motherName}</span>
              </div>
              <div className="pt-1 space-y-1">
                <div className="text-slate-400">Guardian Postal Address</div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {STUDENT_PROFILE_DATA.parent.guardianAddress}
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bank Account Details Modal */}
      {activeModal === 'bank' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Bank Account Details</div>
                  <div className="text-[11px] text-slate-500">Scholarship & fee disbursements</div>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Bank Name</span>
                <span className="font-bold text-slate-900">{STUDENT_PROFILE_DATA.bank.bankName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Account Number</span>
                <button
                  onClick={() => copyToClipboard(STUDENT_PROFILE_DATA.bank.accountNumber, 'Account Number')}
                  className="font-mono font-bold text-indigo-700 hover:underline cursor-pointer"
                >
                  {STUDENT_PROFILE_DATA.bank.accountNumber}
                </button>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">IFSC Code</span>
                <button
                  onClick={() => copyToClipboard(STUDENT_PROFILE_DATA.bank.ifscCode, 'IFSC Code')}
                  className="font-mono font-bold text-indigo-700 hover:underline cursor-pointer"
                >
                  {STUDENT_PROFILE_DATA.bank.ifscCode}
                </button>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Branch Name</span>
                <span className="font-semibold text-slate-800">{STUDENT_PROFILE_DATA.bank.branch}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Account Type</span>
                <span className="font-semibold text-slate-800">{STUDENT_PROFILE_DATA.bank.accountType}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>e-Grantz & National Scholarship Portal (NSP) Verified</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Admission Details Modal */}
      {activeModal === 'admission' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Admission Details</div>
                  <div className="text-[11px] text-slate-500">Academic enrolment records</div>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Department</span>
                <span className="font-bold text-slate-900">{STUDENT_PROFILE_DATA.admission.department}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Programme</span>
                <span className="font-semibold text-slate-800 text-right max-w-[200px]">
                  {STUDENT_PROFILE_DATA.admission.programme}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Assigned Batch</span>
                <span className="font-mono font-bold text-slate-800">{displayBatchName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Admission Date</span>
                <span className="font-semibold text-slate-800">{displayAdmissionDate}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Quota</span>
                <span className="font-semibold text-slate-800">{STUDENT_PROFILE_DATA.admission.quota}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Class Advisor</span>
                <span className="font-bold text-indigo-700">{STUDENT_PROFILE_DATA.admission.classAdvisor}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Account Details Modal */}
      {activeModal === 'account' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Account Details</div>
                  <div className="text-[11px] text-slate-500">Credentials & portal access</div>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Portal Username</span>
                <span className="font-mono font-bold text-slate-900">{displayUsername}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Email Address</span>
                <span className="font-semibold text-slate-800">{displayEmail}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Phone Number</span>
                <span className="font-mono font-semibold text-slate-800">{displayPhone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Security Password</span>
                <span className="font-mono text-slate-500">••••••••••••</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  onOpenChangePassword?.();
                }}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer text-center"
              >
                Change Security Password
              </button>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. About Modal */}
      {activeModal === 'about' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">About Campus Portal</div>
                  <div className="text-[11px] text-slate-500">Version 2.4.0 (Build 2026.11)</div>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-center">
                <div className="font-extrabold text-sm text-slate-900">{STUDENT_PROFILE_DATA.collegeName}</div>
                <div className="text-[11px] text-slate-500">Established 1994 · Affiliated to Markaz Board</div>
                <div className="text-[10px] text-emerald-700 font-semibold pt-1">
                  Kombam, Kodakkad (P.O), Mannarkkad, Palakkad
                </div>
              </div>
              <p>
                This student ERP portal provides seamless access to semester attendance, continuous evaluation, Quran memorization tracking, timetable bell schedules, and digital identity passes.
              </p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
                <span>Technical Support: IT Cell</span>
                <span>helpdesk@markazulhidaya.edu.in</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings / Logout Modal */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Preferences</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => {
                  setActiveModal(null);
                  onOpenIdCard();
                }}
                className="w-full p-2.5 rounded-xl text-left bg-slate-50 hover:bg-slate-100 font-semibold text-slate-800 flex items-center gap-2"
              >
                <IdCard className="w-4 h-4 text-indigo-600" />
                <span>Show Virtual ID Card</span>
              </button>
              <button
                onClick={() => {
                  setActiveModal(null);
                  onLogout();
                }}
                className="w-full p-2.5 rounded-xl text-left bg-rose-50 hover:bg-rose-100 font-bold text-rose-700 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit My Profile Modal (Only available when Mudeer enables Student Profile Editing) */}
      {activeModal === 'editProfile' && allowStudentProfileEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in max-h-[90dvh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-800 text-emerald-200 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">Edit My Profile</div>
                  <div className="text-[11px] text-emerald-200">
                    Update your photo, bio, and personal contact details
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-200 hover:text-white hover:bg-emerald-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-5 space-y-3.5 text-xs overflow-y-auto">
              {/* Profile Photo Quick Action */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs bg-slate-100"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_STUDENT_AVATAR;
                    }}
                  />
                  <div>
                    <div className="font-bold text-slate-900">Profile Photo</div>
                    <div className="text-[11px] text-slate-500">JPG or PNG up to 5MB</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onChangePhoto && (
                    <button
                      type="button"
                      onClick={onChangePhoto}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl cursor-pointer"
                    >
                      {hasCustomPhoto ? 'Change' : 'Upload'}
                    </button>
                  )}
                  {hasCustomPhoto && onRemovePhoto && (
                    <button
                      type="button"
                      onClick={onRemovePhoto}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">About Information</label>
                <textarea
                  rows={2}
                  value={editAbout}
                  onChange={(e) => setEditAbout(e.target.value)}
                  placeholder="Write a short bio, Hifz goals, or personal introduction..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="student@markazulhidaya.edu.in"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98460 00000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={editBloodGroup}
                  onChange={(e) => setEditBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600"
                >
                  <option value="">Select Blood Group</option>
                  {['A +ve', 'A -ve', 'B +ve', 'B -ve', 'O +ve', 'O -ve', 'AB +ve', 'AB -ve'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="House name, street, post office, district, PIN..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              {profileSaveError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{profileSaveError}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSavingProfile}
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
