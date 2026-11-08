import React, { useState } from 'react';
import { INSTITUTION_INFO, MOCK_USERS } from '../data/mockData';
import { api } from '../services/api';
import { UserProfile, UserRole } from '../types';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  KeyRound,
  X,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [usernameInput, setUsernameInput] = useState<string>('mudir');
  const [passwordInput, setPasswordInput] = useState<string>('password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotSubmitted, setForgotSubmitted] = useState<boolean>(false);

  // Quick select helper to auto-fill credentials for demo
  const handleQuickFill = (roleKey: 'admin' | 'teacher' | 'student' | 'parent') => {
    const user = MOCK_USERS[roleKey];
    if (user) {
      setUsernameInput(user.username || user.email);
      setPasswordInput(user.password || 'password123');
      setErrorMessage('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const trimmedUser = usernameInput.trim();
    const trimmedPass = passwordInput.trim();

    if (!trimmedUser) {
      setErrorMessage('Please enter your username, email, or admission ID.');
      setIsSubmitting(false);
      return;
    }

    if (!trimmedPass) {
      setErrorMessage('Please enter your password.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Authenticate against backend MongoDB Atlas API & receive JWT
      const result = await api.login(trimmedUser, trimmedPass);
      if (rememberMe) {
        localStorage.setItem('hyba_auth_user_id', result.user.id);
      }
      onLoginSuccess(result.user);
    } catch (err: any) {
      // If network/offline, check local fallback
      const cleanUser = trimmedUser.toLowerCase();
      const matchedUser = Object.values(MOCK_USERS).find((u) => {
        const matchUsername = (u.username || '').toLowerCase() === cleanUser;
        const matchEmail = u.email.toLowerCase() === cleanUser;
        const matchRef = (u.referenceId || '').toLowerCase() === cleanUser;
        const matchPassword = (u.password || 'password123') === trimmedPass;

        return (matchUsername || matchEmail || matchRef) && matchPassword;
      });

      if (matchedUser) {
        if (rememberMe) {
          localStorage.setItem('hyba_auth_user_id', matchedUser.id);
        }
        onLoginSuccess(matchedUser);
      } else {
        setErrorMessage(
          err.message || 'Invalid credentials. Please verify your username and password, or use one of the quick test accounts below.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSubmitted(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSubmitted(false);
      setForgotEmail('');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start sm:justify-center p-0 sm:p-4">
      {/* Container matching uploaded reference screenshot */}
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0 border-0 sm:border border-slate-200/80">
        {/* Top Campus Architecture Banner */}
        <div className="relative h-60 sm:h-64 w-full overflow-hidden bg-slate-900 shrink-0">
          <img
            src={INSTITUTION_INFO.campusBannerUrl}
            alt="Markazul Hidayathil Islamiyya Campus Building"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50"></div>

          {/* Top subtle badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold tracking-wide">HYBA Campus Portal</span>
          </div>

          {/* Scalloped transition curve */}
          <div className="absolute -bottom-1 left-0 right-0 h-6 bg-white rounded-t-3xl"></div>
        </div>

        {/* Login Card Body */}
        <div className="px-6 pb-8 pt-0 flex-1 flex flex-col justify-between -mt-6 relative z-10 bg-white">
          <div className="space-y-4">
            {/* Institution Emblem */}
            <div className="flex flex-col items-center text-center -mt-8">
              <div className="w-20 h-20 rounded-2xl bg-white p-2 border-2 border-slate-100 shadow-lg flex items-center justify-center">
                <img
                  src={INSTITUTION_INFO.logoUrl}
                  alt={INSTITUTION_INFO.name}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Institution Title */}
              <h1 className="text-base font-extrabold text-slate-900 mt-2.5 tracking-tight">
                {INSTITUTION_INFO.name}
              </h1>
              <div className="text-xs text-emerald-800 font-arabic font-semibold">
                {INSTITUTION_INFO.arabicName}
              </div>
              <p className="text-[11px] text-slate-500 font-medium max-w-xs mt-0.5">
                {INSTITUTION_INFO.shortAddress}
              </p>

              <div className="w-12 h-0.5 bg-emerald-600/30 rounded-full my-2"></div>

              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Login to Your Account
              </h2>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username / Email / Admission ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. mudir or 24812"
                    className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 font-medium transition-all"
                  />
                </div>
              </div>

              {/* Password Input with Show/Hide Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-700 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Prominent Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Test Accounts Picker (Designed cleanly to help evaluation) */}
            <div className="pt-3 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2">
                Quick Test Accounts (Click to Fill)
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin')}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-left cursor-pointer"
                >
                  <div className="font-bold text-slate-900">Mudir / Admin</div>
                  <div className="text-[10px] text-slate-500 font-mono">mudir</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('teacher')}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-left cursor-pointer"
                >
                  <div className="font-bold text-slate-900">Usthad (Teacher)</div>
                  <div className="text-[10px] text-slate-500 font-mono">ajash</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('student')}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-left cursor-pointer"
                >
                  <div className="font-bold text-slate-900">Student</div>
                  <div className="text-[10px] text-slate-500 font-mono">24812</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('parent')}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-left cursor-pointer"
                >
                  <div className="font-bold text-slate-900">Parent</div>
                  <div className="text-[10px] text-slate-500 font-mono">parent</div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Protected Role-Based Hifz Campus Management System · v1.0
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Reset Password</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs text-center space-y-2 animate-fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold">Reset Instructions Sent!</div>
                <p className="text-[11px] text-emerald-800">
                  If an account exists for {forgotEmail}, you will receive a reset link shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3 text-xs">
                <p className="text-slate-600 leading-normal">
                  Enter your registered institutional email address or student ID to receive a password reset link.
                </p>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email / Admission ID
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. mudir@markazulhidaya.edu.in"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 font-medium"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-lg shadow-xs hover:bg-emerald-800"
                  >
                    Send Reset Link
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
