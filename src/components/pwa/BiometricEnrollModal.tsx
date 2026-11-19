import React, { useState } from 'react';
import { Fingerprint, ScanFace, ShieldCheck, X, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { enrollBiometricLock, detectBiometricLabel } from '../../services/webauthn';
import type { UserProfile } from '../../types';

interface BiometricEnrollModalProps {
  isOpen: boolean;
  user: UserProfile;
  onEnrolled: (credentialID: string) => void;
  onDismiss: () => void;
}

export const BiometricEnrollModal: React.FC<BiometricEnrollModalProps> = ({
  isOpen,
  user,
  onEnrolled,
  onDismiss,
}) => {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const { label, deviceName } = detectBiometricLabel();

  const handleEnable = async () => {
    setError(null);
    setIsEnrolling(true);
    try {
      const result = await enrollBiometricLock(deviceName);
      setSuccess(true);
      window.setTimeout(() => {
        onEnrolled(result.credentialID);
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Could not enable biometric unlock on this device.');
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 relative overflow-hidden">
        <button
          type="button"
          onClick={onDismiss}
          disabled={isEnrolling}
          aria-label="Close biometric prompt"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {success ? (
          <div className="py-4 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Biometric Lock Activated</h3>
            <p className="text-xs text-slate-600">
              Next time you launch Hyba, {label} will unlock your {user.role.replace('_', ' ')} portal instantly.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center space-y-2.5 pt-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-950 text-white flex items-center justify-center shadow-lg relative">
                <Fingerprint className="w-8 h-8 text-emerald-200" />
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border-2 border-white">
                  <ScanFace className="w-4 h-4" />
                </div>
              </div>

              <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                <span>Instant Native Unlock</span>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Enable {label}?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Skip typing your password on future launches. Unlock <strong>Hyba</strong> securely with your device&apos;s built-in Fingerprint or Face Unlock and jump straight to your dashboard.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                Uses hardware-backed <strong>WebAuthn</strong> passkeys. Your biometric data never leaves your device.
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleEnable}
                disabled={isEnrolling}
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-65"
              >
                <Fingerprint className="w-4 h-4" />
                <span>{isEnrolling ? 'Waiting for Biometric Sensor...' : `Enable ${label}`}</span>
              </button>

              <button
                type="button"
                onClick={onDismiss}
                disabled={isEnrolling}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
