import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'topstrip' | 'drawer' | 'login';
  onActionComplete?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  onActionComplete,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Strictly hide when already installed / running in standalone mode, or not installable
  if (isInstalled || (!isInstallable && !isIOS)) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      onActionComplete?.();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const renderTrigger = () => {
    if (variant === 'topstrip') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-1.5 text-emerald-100 hover:text-white bg-emerald-800/80 hover:bg-emerald-700 px-2.5 py-0.5 rounded-md border border-emerald-600/60 transition-colors cursor-pointer font-semibold"
          title="Install Hyba App"
        >
          <Download className="w-3 h-3 text-emerald-300" />
          <span>Install App</span>
        </button>
      );
    }

    if (variant === 'drawer') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Install Hyba App</span>
        </button>
      );
    }

    if (variant === 'login') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-1.5 bg-white/95 hover:bg-white text-emerald-900 px-3 py-1 rounded-full text-[11px] font-bold shadow-md border border-emerald-200/70 transition-all cursor-pointer"
          title="Install Hyba on your device"
        >
          <Download className="w-3.5 h-3.5 text-emerald-700" />
          <span>Install App</span>
        </button>
      );
    }

    // Default compact header button
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        title="Install Hyba App"
      >
        <Download className="w-3.5 h-3.5 text-emerald-700" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {showIOSGuide && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-900 text-white flex items-center justify-center shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Install Hyba on iPhone / iPad</h3>
                  <p className="text-[11px] text-slate-500">Instant launch & full-screen app mode</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  Tap the <strong className="inline-flex items-center gap-1 text-slate-900"><Share className="w-3.5 h-3.5 text-sky-600 inline" /> Share</strong> icon in the Safari browser toolbar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  Scroll down and tap <strong className="inline-flex items-center gap-1 text-slate-900"><PlusSquare className="w-3.5 h-3.5 text-emerald-700 inline" /> Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Tap <strong className="text-slate-900">Add</strong> to launch Hyba like a native app.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Optional subtle dismissible mobile bottom banner (only shown when native install prompt is available & not dismissed)
export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, bannerDismissed, dismissBanner, install } = usePWAInstall();

  if (isInstalled || !isInstallable || bannerDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-16 lg:bottom-5 right-4 left-4 sm:left-auto sm:w-80 z-40 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-emerald-500/30 flex items-center gap-3">
      <img
        src="/pwa-192x192.png"
        alt="Hyba App Icon"
        className="w-10 h-10 rounded-xl border border-white/15 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-white leading-tight">Install Hyba App</div>
        <div className="text-[11px] text-slate-300 truncate">Instant offline access & Face/Touch ID</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={install}
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismissBanner}
          aria-label="Dismiss install banner"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
