import React, { useState } from 'react';
import { INSTITUTION_INFO, MOCK_USERS } from '../data/mockData';
import { api } from '../services/api';
import { UserProfile } from '../types';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  KeyRound,
  X,
  Phone,
  Fingerprint,
} from 'lucide-react';
import { PWAInstallButton } from './pwa/PWAInstallButton';
import { authenticateWithBiometrics, detectBiometricLabel } from '../services/webauthn';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile, viaBiometric?: boolean) => void;
  initialUsername?: string;
  biometricQuickUser?: UserProfile | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  initialUsername,
  biometricQuickUser,
}) => {
  const [usernameInput, setUsernameInput] = useState<string>(initialUsername || 'mudir');
  const [passwordInput, setPasswordInput] = useState<string>(initialUsername ? '' : 'password123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState<boolean>(false);

  // 3-Step Secure Forgot Password Modal state
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify' | 'confirm' | 'done'>('request');
  const [resetIdentifier, setResetIdentifier] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState<string>('');
  const [phoneLast4Input, setPhoneLast4Input] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');
  const [newResetPassword, setNewResetPassword] = useState<string>('');
  const [confirmResetPassword, setConfirmResetPassword] = useState<string>('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetLoading, setIsResetLoading] = useState<boolean>(false);

  // Robust image fallback states
  const [bannerError, setBannerError] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<boolean>(false);

  const handleQuickFill = (
    roleKey: 'hybaSuperAdmin' | 'admin' | 'teacher' | 'student' | 'parent'
  ) => {
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
      const result = await api.login(trimmedUser, trimmedPass);
      if (rememberMe) {
        localStorage.setItem('hyba_auth_user_id', result.user.id);
      }
      onLoginSuccess(result.user);
    } catch (err: any) {
      // Security critical: NEVER fall back to MOCK_USERS if backend returned an HTTP error (e.g. 401/403)
      if (err?.status) {
        setErrorMessage(
          err.message || 'Invalid credentials. Please verify your username and password.'
        );
      } else {
        // Offline / network failure fallback only
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
            err.message || 'Invalid credentials. Please verify your username and password.'
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricQuickLogin = async () => {
    if (!biometricQuickUser) return;
    setErrorMessage('');
    setIsBiometricLoading(true);
    try {
      const result = await authenticateWithBiometrics({ userId: biometricQuickUser.id });
      onLoginSuccess(result.user, true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Biometric verification failed. Please sign in with your password.');
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const openForgotModal = () => {
    setResetStep('request');
    setResetIdentifier(usernameInput.trim() || '');
    setMaskedEmail(null);
    setMaskedPhone(null);
    setPreviewOtp(null);
    setOtpInput('');
    setPhoneLast4Input('');
    setResetToken('');
    setNewResetPassword('');
    setConfirmResetPassword('');
    setResetError(null);
    setShowForgotModal(true);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) return;
    setResetError(null);
    setIsResetLoading(true);
    try {
      const res = await api.requestPasswordReset(resetIdentifier.trim());
      setMaskedEmail(res.maskedEmail || null);
      setMaskedPhone(res.maskedPhone || null);
      setPreviewOtp(res.previewOtp || null);
      setResetStep('verify');
    } catch (err: any) {
      setResetError(err.message || 'Failed to initiate password recovery.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!otpInput.trim() || otpInput.trim().length !== 6) {
      setResetError('Enter the 6-digit verification code.');
      return;
    }
    if (!phoneLast4Input.trim() || phoneLast4Input.trim().length !== 4) {
      setResetError('Enter the last 4 digits of your registered phone number.');
      return;
    }

    setIsResetLoading(true);
    try {
      const res = await api.verifyResetOtp(
        resetIdentifier.trim(),
        otpInput.trim(),
        phoneLast4Input.trim()
      );
      setResetToken(res.resetToken);
      setResetStep('confirm');
    } catch (err: any) {
      setResetError(err.message || 'Verification failed. Check code and phone digits.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (newResetPassword.length < 8) {
      setResetError('New password must be at least 8 characters long.');
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setIsResetLoading(true);
    try {
      await api.confirmPasswordReset(resetToken, newResetPassword);
      setUsernameInput(resetIdentifier.trim());
      setPasswordInput('');
      setResetStep('done');
    } catch (err: any) {
      setResetError(err.message || 'Failed to set new password.');
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start sm:justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0 border-0 sm:border border-slate-200/80">
        {/* Top Campus Architecture Banner */}
        <div className="relative h-56 sm:h-60 w-full overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 shrink-0">
          {!bannerError ? (
            <img
              src={INSTITUTION_INFO.campusBannerUrl}
              alt="Markazul Hidayathil Islamiyya Campus Building"
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
              onError={() => setBannerError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center relative p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center text-emerald-300 mb-2 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="text-white font-bold text-sm tracking-wide">Markazul Hidayathil Islamiyya</div>
              <div className="text-emerald-300/80 text-xs font-arabic mt-1">مركز الهداية الإسلامية · حرم تحفيظ القرآن</div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none"></div>

          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs border border-white/20">
              <span className="font-semibold tracking-wide">Hyba Campus Portal</span>
            </div>
            <PWAInstallButton variant="login" />
          </div>

          <div className="absolute -bottom-1 left-0 right-0 h-6 bg-white rounded-t-3xl"></div>
        </div>

        {/* Login Card Body */}
        <div className="px-6 pb-8 pt-0 flex-1 flex flex-col justify-between -mt-6 relative z-10 bg-white">
          <div className="space-y-4">
            {/* Institution Emblem */}
            <div className="flex flex-col items-center text-center -mt-8">
              <div className="w-20 h-20 rounded-2xl bg-white p-2 border-2 border-slate-100 shadow-lg flex items-center justify-center overflow-hidden">
                {!logoError ? (
                  <img
                    src={INSTITUTION_INFO.logoUrl}
                    alt={INSTITUTION_INFO.name}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-800 to-teal-950 flex flex-col items-center justify-center text-white shadow-inner p-1">
                    <span className="font-arabic text-base font-bold text-amber-300 leading-tight">م</span>
                    <span className="text-[9px] font-black tracking-widest text-emerald-100">HYBA</span>
                  </div>
                )}
              </div>

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

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username / Admission ID / Student Name (Parent)
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
                    placeholder="e.g. mudir, 26001, or Ayaan Rahman"
                    className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 font-medium transition-all"
                  />
                </div>
              </div>

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
                    placeholder="Password, DOB (DD-MM-YYYY), or Parent Mobile"
                    className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/15 font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

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
                  onClick={openForgotModal}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isBiometricLoading}
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

              {biometricQuickUser && (
                <button
                  type="button"
                  onClick={handleBiometricQuickLogin}
                  disabled={isSubmitting || isBiometricLoading}
                  className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-65"
                >
                  <Fingerprint className="w-4 h-4 text-emerald-700" />
                  <span>
                    {isBiometricLoading
                      ? 'Waiting for Biometrics...'
                      : `Unlock as ${biometricQuickUser.fullName} (${detectBiometricLabel().label})`}
                  </span>
                </button>
              )}

              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 space-y-0.5">
                <div>
                  <strong className="text-slate-800">Student Default Login:</strong> Admission No. + Date of Birth (<span className="font-mono">DD-MM-YYYY</span>)
                </div>
                <div>
                  <strong className="text-slate-800">Parent Default Login:</strong> Student Name + Registered Mobile Number
                </div>
              </div>
            </form>

            {/* Role Portals Quick Access */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                Quick Portal Accounts (Click to Fill)
              </div>

              <button
                type="button"
                onClick={() => handleQuickFill('hybaSuperAdmin')}
                className="w-full p-2.5 rounded-xl border border-amber-300/80 bg-amber-50/70 hover:bg-amber-100/70 transition-colors text-left cursor-pointer flex items-center justify-between gap-2"
              >
                <div>
                  <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>HYBA Super Admin (Platform Owner)</span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                    Admin.Hyba_Campus.portal
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber-800 shrink-0" />
              </button>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin')}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-left cursor-pointer"
                >
                  <div className="font-bold text-slate-900">Campus Mudeer</div>
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

          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
            HYBA Campus Management System
          </div>
        </div>
      </div>

      {/* Secure 3-Step Password Recovery Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Secure Password Reset</h3>
                  <div className="text-[10px] text-slate-500">
                    {resetStep === 'request'
                      ? 'Step 1 of 3 · Account Lookup'
                      : resetStep === 'verify'
                      ? 'Step 2 of 3 · Identity & Code Verification'
                      : resetStep === 'confirm'
                      ? 'Step 3 of 3 · Set New Password'
                      : 'Recovery Complete'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {resetStep === 'request' && (
              <form onSubmit={handleRequestOtp} className="space-y-3 text-xs">
                <p className="text-slate-600 leading-normal">
                  Enter your Mudeer username or registered institutional email to initiate secure two-factor password recovery.
                </p>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username or Registered Email *
                  </label>
                  <input
                    type="text"
                    required
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    placeholder="e.g. mudir or mudir.city"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 font-medium"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetLoading}
                    className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg shadow-xs hover:bg-emerald-800 cursor-pointer disabled:opacity-60"
                  >
                    {isResetLoading ? 'Sending...' : 'Request Reset Code'}
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'verify' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
                  <div>
                    Verification dispatched for account <strong className="text-slate-900">{resetIdentifier}</strong>
                    {maskedEmail ? ` (${maskedEmail})` : ''}.
                  </div>
                  {maskedPhone && (
                    <div className="flex items-center gap-1 text-slate-500">
                      <Phone className="w-3 h-3" />
                      <span>Registered phone: <strong className="font-mono text-slate-700">{maskedPhone}</strong></span>
                    </div>
                  )}
                </div>

                {previewOtp && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Verification Code (Demo Dispatch)
                      </div>
                      <div className="font-mono text-base font-extrabold tracking-widest mt-0.5">
                        {previewOtp}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpInput(previewOtp)}
                      className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-[11px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                    >
                      Auto-fill Code
                    </button>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    6-Digit Verification Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit OTP"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 font-mono tracking-widest text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Last 4 Digits of Registered Phone *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={phoneLast4Input}
                    onChange={(e) => setPhoneLast4Input(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 0001"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 font-mono tracking-widest text-sm"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('request');
                      setResetError(null);
                    }}
                    className="px-3 py-2 text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isResetLoading}
                    className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg shadow-xs hover:bg-emerald-800 cursor-pointer disabled:opacity-60"
                  >
                    {isResetLoading ? 'Verifying...' : 'Verify Identity'}
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'confirm' && (
              <form onSubmit={handleConfirmReset} className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Identity verified. Choose a strong new password (minimum 8 characters).
                </p>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-600 font-mono"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetLoading}
                    className="px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg shadow-xs hover:bg-emerald-800 cursor-pointer disabled:opacity-60"
                  >
                    {isResetLoading ? 'Updating...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}

            {resetStep === 'done' && (
              <div className="p-4 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs text-center space-y-2.5 animate-fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-sm">Password Reset Successful</div>
                <p className="text-[11px] text-emerald-800">
                  Your password for <strong>{resetIdentifier}</strong> has been updated securely. You can now log in with your new password.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="mt-2 px-5 py-2 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
