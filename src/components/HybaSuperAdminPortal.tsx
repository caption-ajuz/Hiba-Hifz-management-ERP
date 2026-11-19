import React from 'react';
import { Campus, Student, Teacher, ClassBatch, UserProfile } from '../types';
import { INSTITUTION_INFO } from '../data/mockData';
import {
  Landmark,
  ShieldCheck,
  Plus,
  Users,
  GraduationCap,
  UserCheck,
  KeyRound,
  ArrowRight,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface HybaSuperAdminPortalProps {
  currentUser: UserProfile;
  campuses: Campus[];
  students: Student[];
  teachers: Teacher[];
  classes: ClassBatch[];
  onNavigate: (tab: string) => void;
  onOpenAddCampus: () => void;
  onManageCampusMudeer: (campus: Campus) => void;
}

export const HybaSuperAdminPortal: React.FC<HybaSuperAdminPortalProps> = ({
  currentUser,
  campuses,
  students,
  teachers,
  classes,
  onNavigate,
  onOpenAddCampus,
  onManageCampusMudeer,
}) => {
  const activeCampuses = campuses.filter((c) => c.status === 'Active').length;
  const assignedMudeersCount = campuses.filter((c) => Boolean(c.mudeerUsername || c.principalName)).length;
  const totalStudentsCount = students.length;
  const totalTeachersCount = teachers.length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6 pb-20">
      {/* Platform Command Hero Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-md relative overflow-hidden border border-emerald-900/50">
        <div className="relative z-10 space-y-3.5">
          <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-200 px-3 py-1 rounded-full text-[11px] font-bold border border-amber-400/30">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>HYBA Platform Super Admin · Central Governance</span>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
              HYBA Multi-Campus Command Center
            </h1>
            <div className="text-xs sm:text-sm text-emerald-200 font-arabic mt-1">
              {INSTITUTION_INFO.arabicName} · إدارة الفروع ومديري المراكز
            </div>
          </div>

          <p className="text-xs text-slate-300">
            Signed in as <span className="font-mono font-bold text-white">{currentUser.username}</span>
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenAddCampus}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Campus & Mudeer</span>
            </button>
            <button
              onClick={() => onNavigate('campuses')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-white/20"
            >
              <Landmark className="w-4 h-4 text-emerald-300" />
              <span>Open Campus Registry</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="absolute right-4 top-0 bottom-0 w-1/4 opacity-10 pointer-events-none hidden md:flex items-center justify-center">
          <img
            src={INSTITUTION_INFO.logoUrl}
            alt="HYBA Emblem"
            className="w-56 h-56 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Cross-Campus KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onNavigate('campuses')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              HYBA Campuses
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2 tabular-nums">
            {campuses.length}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5 tabular-nums">
            {activeCampuses} active branches
          </div>
        </div>

        <div
          onClick={() => onNavigate('campuses')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Campus Mudeers
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2 tabular-nums">
            {assignedMudeersCount}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-0.5">
            Dedicated campus admins
          </div>
        </div>

        <div
          onClick={() => onNavigate('reports')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-sky-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Students
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2 tabular-nums">
            {totalStudentsCount}
          </div>
          <div className="text-[11px] text-sky-700 font-medium mt-0.5 tabular-nums">
            Across {classes.length} Hifz batches
          </div>
        </div>

        <div
          onClick={() => onNavigate('reports')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-teal-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Usthad Faculty
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2 tabular-nums">
            {totalTeachersCount}
          </div>
          <div className="text-[11px] text-teal-700 font-medium mt-0.5">
            Platform-wide mentors
          </div>
        </div>
      </div>

      {/* Central Campuses & Assigned Mudeers Roster */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              Campuses & Assigned Mudeers
            </h2>
          </div>
          <button
            onClick={onOpenAddCampus}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Campus</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {campuses.map((campus) => {
            const cStudents = campus.studentCount ?? students.filter((s) => s.campusId === campus.id).length;
            const cTeachers = campus.teacherCount ?? teachers.filter((t) => t.assignedCampusId === campus.id).length;
            const cClasses = campus.classCount ?? classes.filter((c) => c.campusId === campus.id).length;

            return (
              <div
                key={campus.id}
                className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center shrink-0 overflow-hidden p-1">
                    {campus.logo ? (
                      <img
                        src={campus.logo}
                        alt={campus.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Landmark className="w-5 h-5 text-emerald-700" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">{campus.name}</h3>
                      <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {campus.code}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                          campus.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {campus.status === 'Active' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-400" />
                        )}
                        {campus.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{campus.address}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{campus.phone}</span>
                      </span>
                    </div>

                    {/* Assigned Mudeer Info */}
                    <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-950">
                        <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span className="font-semibold">Mudeer:</span>
                        <span className="font-bold">{campus.principalName || 'Unassigned'}</span>
                        {campus.mudeerUsername && (
                          <span className="font-mono text-[11px] text-amber-800 bg-white/80 px-1.5 py-0.2 rounded border border-amber-200/60">
                            @{campus.mudeerUsername}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats + Actions */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0">
                  <div className="flex items-center gap-4 text-center px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Students</div>
                      <div className="text-xs font-mono font-bold text-slate-900 tabular-nums">{cStudents}</div>
                    </div>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Teachers</div>
                      <div className="text-xs font-mono font-bold text-slate-900 tabular-nums">{cTeachers}</div>
                    </div>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Batches</div>
                      <div className="text-xs font-mono font-bold text-slate-900 tabular-nums">{cClasses}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onManageCampusMudeer(campus)}
                      className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                      <span>Mudeer & Login</span>
                    </button>
                    <button
                      onClick={() => onNavigate('campuses')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
