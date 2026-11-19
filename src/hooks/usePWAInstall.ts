import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level capture so beforeinstallprompt is never missed across Login <-> App transitions
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();
let globalListenersAttached = false;

function notifyPromptListeners() {
  for (const listener of promptListeners) {
    listener();
  }
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOSUA = /iphone|ipad|ipod/.test(ua);
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIOSUA || isIPadOS;
}

export function attachGlobalPWAInstallListeners() {
  if (globalListenersAttached || typeof window === 'undefined') return;
  globalListenersAttached = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyPromptListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    notifyPromptListeners();
  });
}

const BANNER_DISMISSED_KEY = 'hyba_pwa_install_banner_dismissed';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectStandalone());
  const [isIOS] = useState<boolean>(() => detectIOS());
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(BANNER_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    attachGlobalPWAInstallListeners();

    const syncState = () => {
      setDeferredPrompt(globalDeferredPrompt);
      setIsInstalled(detectStandalone());
    };

    promptListeners.add(syncState);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = () => setIsInstalled(detectStandalone());
    mediaQuery.addEventListener?.('change', handleDisplayChange);

    const handleInstalled = () => {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', handleInstalled);

    syncState();

    return () => {
      promptListeners.delete(syncState);
      mediaQuery.removeEventListener?.('change', handleDisplayChange);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    const promptEvent = globalDeferredPrompt || deferredPrompt;
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem(BANNER_DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  const canPromptInstall = !isInstalled && (Boolean(deferredPrompt) || isIOS);

  return {
    isInstallable: !isInstalled && Boolean(deferredPrompt),
    canPromptInstall,
    isInstalled,
    isIOS,
    bannerDismissed,
    dismissBanner,
    install,
  };
}
