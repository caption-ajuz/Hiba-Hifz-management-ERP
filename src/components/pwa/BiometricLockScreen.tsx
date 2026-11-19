import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Fingerprint,
  ScanFace,
  KeyRound,
  AlertCircle,
  ShieldCheck,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import type { UserProfile } from '../../types';
import { authenticateWithBiometrics, detectBiometricLabel } from '../../services/webauthn';
import { DEFAULT_STUDENT_AVATAR, getStudentPhotoSrc } from '../../utils/avatarUtils';

interface BiometricLockScreenProps {
  user: UserProfile;
  onUnlocked: (verifiedUser: UserProfile) => void;
  onUsePasswordFallback: () => void;
  onSwitchAccount: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({
  user,
  onUnlocked,
  onUsePasswordFallback,
  onSwitchAccount,
}) => {
  const [status, setStatus] = useState<'prompting' | 'idle' | 'verifying' | 'error'>('prompting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);

  const { label } = detectBiometricLabel();

  const triggerUnlock = useCallback(async () => {
    setErrorMessage(null);
    setStatus('prompting');
    try {
      const result = await authenticateWithBiometrics({ userId: user.id });
      setStatus('verifying');
      onUnlocked(result.user);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(
        err?.message || 'Biometric verification was not completed. Tap below to retry or use password.'
      );
    }
  }, [user.id, onUnlocked]);

  // Automatically trigger Fingerprint / Face Unlock on launch
  useEffect(() => {
    if (autoTriggeredRef.current) return;
    autoTriggeredRef.current = true;
    const timer = window.setTimeout(() => {
      triggerUnlock();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [triggerUnlock]);

  const roleLabel =
    user.role === 'HYBA_SUPER_ADMIN'
      ? 'Super Admin'
      : user.role === 'MUDEER'
      ? 'Mudeer'
      : user.role === 'USTHAD'
      ? 'Usthad'
      : user.role === 'STUDENT'
      ? 'Student'
      : 'Parent';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-emerald-900/20 overflow-hidden">
        {/* Top Branded Header */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 px-6 pt-8 pb-10 text-center relative">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-3 py-1 rounded-full text-[11px] font-semibold text-emerald-200 mb-5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hyba Secure Biometric Lock</span>
          </div>

          <div className="w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-tr from-emerald-400 to-amber-300 shadow-xl">
            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 border-2 border-white">
              <img
                src={user.role === 'STUDENT' ? getStudentPhotoSrc(user.avatar) : user.avatar}
                alt={user.fullName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_STUDENT_AVATAR;
                }}
              />
            </div>
          </div>

          <h1 className="text-lg font-extrabold text-white mt-3.5 tracking-tight">
            {user.fullName}
          </h1>
          <div className="text-xs text-emerald-300/90 font-medium mt-0.5">
            {roleLabel} · @{user.username || user.referenceId}
          </div>
        </div>

        {/* Biometric Action Area */}
        <div className="px-6 py-6 -mt-4 bg-white rounded-t-3xl space-y-4">
          <div className="text-center space-y-1.5">
            <div className="flex items-center justify-center gap-2 text-emerald-800">
              <Fingerprint className={`w-7 h-7 ${status === 'prompting' ? 'animate-pulse' : ''}`} />
              <ScanFace className={`w-6 h-6 ${status === 'prompting' ? 'animate-pulse' : ''}`} />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              {status === 'prompting'
                ? `Waiting for ${label}...`
                : status === 'verifying'
                ? 'Verified! Opening dashboard...'
                : `Unlock with ${label}`}
            </h2>
            <p className="text-[11px] text-slate-500">
              Verify your identity to jump directly into your {roleLabel} portal.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={triggerUnlock}
            disabled={status === 'prompting' || status === 'verifying'}
            className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {status === 'prompting' || status === 'verifying' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{status === 'verifying' ? 'Unlocking...' : 'Scanning Biometrics...'}</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4" />
                <span>Unlock with {label}</span>
              </>
            )}
          </button>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={onUsePasswordFallback}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-600" />
              <span>Use Password Instead</span>
            </button>

            <button
              type="button"
              onClick={onSwitchAccount}
              className="w-full py-2 text-slate-500 hover:text-rose-600 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out / Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
