import React, { useState } from 'react';
import {
  IdCard,
  User,
  Users,
  Building,
  GraduationCap,
  Settings,
  Info,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  LogOut,
  Camera,
  Loader2,
} from 'lucide-react';
import { STUDENT_PROFILE_DATA } from '../../data/studentPortalData';
import { INSTITUTION_INFO } from '../../data/mockData';

interface StudentProfileViewProps {
  onOpenIdCard: () => void;
  onLogout: () => void;
  onChangePhoto?: () => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  onOpenIdCard,
  onLogout,
  onChangePhoto,
}) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

      {/* Main Student Card (Matches Screenshot 3) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col items-center text-center space-y-3">
        {/* Avatar with Camera badge */}
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-md bg-slate-50">
            <img
              src={STUDENT_PROFILE_DATA.avatarUrl}
              alt={STUDENT_PROFILE_DATA.fullName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          {onChangePhoto && (
            <button
              onClick={onChangePhoto}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              title="Update photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Student Name with Green Verified Checkmark */}
        <div>
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {STUDENT_PROFILE_DATA.fullName}
            </h2>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500 text-white" />
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {STUDENT_PROFILE_DATA.department}
          </div>
        </div>

        {/* Register No & Admission No (Matches Screenshot 3) */}
        <div className="text-xs text-slate-600 font-mono space-y-0.5 pt-1">
          <div>Register No : {STUDENT_PROFILE_DATA.registerNo}</div>
          <div>Admission No : {STUDENT_PROFILE_DATA.admissionNo}</div>
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

        {/* 4. Bank Account Details */}
        <button
          onClick={() => setActiveModal('bank')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                Bank Account Details
              </div>
              <div className="text-[11px] text-slate-400">Bank Name, Account Number</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* 5. Admission Details */}
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
                <span className="font-bold text-slate-900">{STUDENT_PROFILE_DATA.fullName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Arabic Name</span>
                <span className="font-arabic font-bold text-slate-900 text-sm">
                  {STUDENT_PROFILE_DATA.arabicName}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Date of Birth</span>
                <span className="font-semibold text-slate-800">{STUDENT_PROFILE_DATA.dateOfBirth}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Gender</span>
                <span className="font-semibold text-slate-800">{STUDENT_PROFILE_DATA.gender}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Blood Group</span>
                <span className="font-bold text-rose-600 font-mono">{STUDENT_PROFILE_DATA.bloodGroup}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Aadhaar (Masked)</span>
                <span className="font-mono text-slate-700">{STUDENT_PROFILE_DATA.aadhaarMasked}</span>
              </div>
              <div className="pt-1 space-y-1">
                <div className="text-slate-400">Permanent Residential Address</div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed">
                  {STUDENT_PROFILE_DATA.address}
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
                <span className="text-slate-400">Father's Name</span>
                <span className="font-bold text-slate-900">{STUDENT_PROFILE_DATA.parent.fatherName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Contact Number</span>
                <span className="font-mono font-bold text-indigo-600">
                  {STUDENT_PROFILE_DATA.parent.fatherPhone}
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
                <span className="text-slate-400">Batch Duration</span>
                <span className="font-mono font-bold text-slate-800">{STUDENT_PROFILE_DATA.admission.batch}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Admission Date</span>
                <span className="font-semibold text-slate-800">{STUDENT_PROFILE_DATA.admission.admissionDate}</span>
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
                <span className="font-mono font-bold text-slate-900">{STUDENT_PROFILE_DATA.admissionNo}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Email Address</span>
                <span className="font-semibold text-slate-800">{STUDENT_PROFILE_DATA.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Phone Number</span>
                <span className="font-mono font-semibold text-slate-800">{STUDENT_PROFILE_DATA.phone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-400">Security Password</span>
                <span className="font-mono text-slate-500">••••••••••••</span>
              </div>
              <button
                onClick={() => alert('Password reset link sent to ' + STUDENT_PROFILE_DATA.email)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-center"
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
    </div>
  );
};
