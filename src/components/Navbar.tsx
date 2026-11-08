import React, { useState } from 'react';
import { INSTITUTION_INFO } from '../data/mockData';
import { UserProfile, UserRole } from '../types';
import {
  Building2,
  CalendarCheck,
  BookOpen,
  GraduationCap,
  Users,
  Layers,
  FileText,
  Clock,
  IdCard,
  MessageSquare,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Sparkles,
  Shield,
  HeartHandshake,
} from 'lucide-react';
import { DatabaseStatusIndicator } from './DatabaseStatusIndicator';

interface NavbarProps {
  currentUser: UserProfile;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenRoleSwitcher: () => void;
  onOpenAttendance: () => void;
  onOpenAddHifz: () => void;
  onOpenIdCard: () => void;
  onOpenTimetable: () => void;
  onOpenFeedback: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentTab,
  onTabChange,
  onOpenRoleSwitcher,
  onOpenAttendance,
  onOpenAddHifz,
  onOpenIdCard,
  onOpenTimetable,
  onOpenFeedback,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const getNavLinks = () => {
    switch (currentUser.role) {
      case 'SUPER_ADMIN':
        return [
          { id: 'dashboard', label: 'Overview', icon: Building2 },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'hifz', label: 'Hifz Records', icon: BookOpen },
          { id: 'students', label: 'Students', icon: GraduationCap },
          { id: 'teachers', label: 'Teachers', icon: Users },
          { id: 'classes', label: 'Classes', icon: Layers },
          { id: 'reports', label: 'Reports', icon: FileText },
        ];
      case 'USTHAD':
        return [
          { id: 'dashboard', label: 'My Dashboard', icon: Building2 },
          { id: 'attendance', label: 'Daily Attendance', icon: CalendarCheck },
          { id: 'hifz', label: 'Hifz Tracker', icon: BookOpen },
          { id: 'students', label: 'My Students', icon: GraduationCap },
          { id: 'reports', label: 'Progress Reports', icon: FileText },
        ];
      case 'STUDENT':
        return [
          { id: 'dashboard', label: 'My Learning', icon: BookOpen },
          { id: 'hifz', label: 'Hifz History', icon: Sparkles },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'reports', label: 'My Progress', icon: FileText },
        ];
      case 'PARENT':
        return [
          { id: 'dashboard', label: 'Child Portal', icon: HeartHandshake },
          { id: 'hifz', label: 'Hifz Updates', icon: BookOpen },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'reports', label: 'Term Reports', icon: FileText },
        ];
    }
  };

  const navLinks = getNavLinks();

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Mudir (Admin)';
      case 'USTHAD':
        return 'Usthad';
      case 'STUDENT':
        return 'Student';
      case 'PARENT':
        return 'Parent';
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'USTHAD':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'STUDENT':
        return 'bg-sky-100 text-sky-900 border-sky-200';
      case 'PARENT':
        return 'bg-purple-100 text-purple-900 border-purple-200';
    }
  };

  // Mobile Bottom Navigation items (Top 4 tabs + More)
  const mobileBottomTabs = navLinks.slice(0, 4);

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        {/* Desktop Top Strip (hidden on mobile to prevent clutter!) */}
        <div className="hidden md:flex bg-emerald-950 text-emerald-100 text-[11px] px-6 py-1.5 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white tracking-wide">{INSTITUTION_INFO.name}</span>
            <span className="text-emerald-400 font-arabic text-xs">({INSTITUTION_INFO.arabicName})</span>
            <span className="text-emerald-300/80">· {INSTITUTION_INFO.shortAddress}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenTimetable}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-emerald-200"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-300" />
              <span>Daily Timetable</span>
            </button>
            {currentUser.role === 'STUDENT' && (
              <button
                onClick={onOpenIdCard}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-emerald-200"
              >
                <IdCard className="w-3.5 h-3.5 text-emerald-300" />
                <span>Student ID Card</span>
              </button>
            )}
            <button
              onClick={onOpenFeedback}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-emerald-200"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
              <span>Feedback Survey</span>
            </button>
          </div>
        </div>

        {/* Main Bar (Clean single-row on mobile, full width on desktop) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            {/* Zone 1: Logo and HYBA branding */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onTabChange('dashboard')}
                className="flex items-center gap-2 text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs overflow-hidden">
                  <img
                    src={INSTITUTION_INFO.logoUrl}
                    alt={INSTITUTION_INFO.name}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 font-sans">
                      HYBA
                    </span>
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${getRoleBadgeColor(
                        currentUser.role
                      )}`}
                    >
                      {getRoleDisplayName(currentUser.role)}
                    </span>
                  </div>
                  <div className="hidden sm:block text-[11px] text-slate-500 font-medium truncate max-w-[200px]">
                    Markazul Hidayathil Islamiyya
                  </div>
                </div>
              </button>
            </div>

            {/* Zone 2: Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = currentTab === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => onTabChange(link.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span>{link.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Actions & Profile Switcher */}
            <div className="flex items-center gap-2">
              {/* Desktop Quick Actions for Teachers/Admin */}
              {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'USTHAD') && (
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={onOpenAttendance}
                    className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Attendance</span>
                  </button>
                  <button
                    onClick={onOpenAddHifz}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-100" />
                    <span>+ Hifz</span>
                  </button>
                </div>
              )}

              {/* Minimal Database & Real-Time Status Indicator (Phase 5) */}
              <DatabaseStatusIndicator userRole={currentUser.role} />

              {/* Profile & Role Switcher Trigger Button */}
              <button
                onClick={onOpenRoleSwitcher}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer bg-white"
                title="Switch Profile / Role"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.fullName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {currentUser.referenceId || currentUser.username}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Logout button (Desktop) */}
              <button
                onClick={onLogout}
                className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Sign out of HYBA"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu Drawer Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Open mobile menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer for Secondary Actions */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Drawer content */}
          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                    HYBA
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{currentUser.fullName}</div>
                    <div className="text-[10px] text-slate-500">{currentUser.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="p-3 space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1">
                  Campus Navigation
                </div>
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = currentTab === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => {
                        onTabChange(link.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/80'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                      <span>{link.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Utility Tools */}
              <div className="p-3 border-t border-slate-100 space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1">
                  Utilities & Tools
                </div>
                <button
                  onClick={() => {
                    onOpenTimetable();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Daily Timetable (Hours 1–5)</span>
                </button>

                {currentUser.role === 'STUDENT' && (
                  <button
                    onClick={() => {
                      onOpenIdCard();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
                  >
                    <IdCard className="w-4 h-4 text-emerald-600" />
                    <span>Digital Student ID Card</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onOpenFeedback();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Faculty Feedback Surveys</span>
                </button>

                <button
                  onClick={() => {
                    onOpenRoleSwitcher();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl hover:bg-emerald-100"
                >
                  <Users className="w-4 h-4 text-emerald-700" />
                  <span>Manage Profiles & Roles</span>
                </button>
              </div>
            </div>

            {/* Logout Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-2.5 px-3 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Account</span>
              </button>
              <div className="text-center text-[10px] text-slate-400 mt-2">
                Markazul Hidayathil Islamiyya
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (High Priority Thumb-Navigation) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1 flex items-center justify-around h-14">
        {mobileBottomTabs.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg cursor-pointer transition-colors flex-1 ${
                isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More tab button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-lg cursor-pointer text-slate-500 hover:text-slate-900 flex-1"
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>
    </>
  );
};
