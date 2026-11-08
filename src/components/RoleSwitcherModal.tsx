import React from 'react';
import { INSTITUTION_INFO, MOCK_USERS } from '../data/mockData';
import { UserProfile, UserRole } from '../types';
import {
  X,
  Check,
  ShieldCheck,
  UserCheck,
  BookOpen,
  HeartHandshake,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onLogout?: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onLogout,
}) => {
  if (!isOpen) return null;

  const roleProfiles: {
    key: string;
    role: UserRole;
    roleLabel: string;
    description: string;
    icon: React.ElementType;
    badgeColor: string;
  }[] = [
    {
      key: 'admin',
      role: 'SUPER_ADMIN',
      roleLabel: 'Mudir / Institution Authority',
      description: 'Institutional management, all batches, teacher & student accounts, attendance audits',
      icon: ShieldCheck,
      badgeColor: 'bg-amber-600',
    },
    {
      key: 'teacher',
      role: 'USTHAD',
      roleLabel: 'Usthad (Teacher)',
      description: 'Daily attendance marking, Sabq lessons, Murajath revision, and Manzil evaluations',
      icon: UserCheck,
      badgeColor: 'bg-emerald-600',
    },
    {
      key: 'student',
      role: 'STUDENT',
      roleLabel: 'Student Portal',
      description: 'Personal 30-Juz progress, attendance percentage, recitation remarks, digital ID card',
      icon: BookOpen,
      badgeColor: 'bg-sky-600',
    },
    {
      key: 'parent',
      role: 'PARENT',
      roleLabel: 'Parent / Guardian',
      description: 'Linked children oversight (Mohammed Ajash & Rayan Siddiq), teacher feedback, leave requests',
      icon: HeartHandshake,
      badgeColor: 'bg-purple-600',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90dvh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-2xs">
              <img
                src={INSTITUTION_INFO.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Manage Profiles & Roles</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Seamlessly preview HYBA from any authorized role
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Profiles List */}
        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Available Institution Accounts
          </div>

          {roleProfiles.map((item) => {
            const user = MOCK_USERS[item.key];
            if (!user) return null;
            const isCurrent = currentUser.id === user.id;
            const Icon = item.icon;

            return (
              <div
                key={item.key}
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                }}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50/80'
                }`}
              >
                {/* Left info cluster */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-2xs"
                      referrerPolicy="no-referrer"
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${item.badgeColor}`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {user.fullName}
                      </span>
                      {user.referenceId && (
                        <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                          {user.referenceId}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                      {item.roleLabel}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 leading-snug line-clamp-2 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </div>

                {/* Right action button */}
                <div className="self-end sm:self-center shrink-0">
                  {isCurrent ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <button className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-xl transition-colors cursor-pointer shadow-2xs">
                      Switch Role
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px]">{INSTITUTION_INFO.shortAddress} · Year 2026-27</span>
          </div>

          {onLogout && (
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Completely</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
