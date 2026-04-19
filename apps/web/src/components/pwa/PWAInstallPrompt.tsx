'use client';

import { useEffect, useState } from 'react';

/**
 * App install prompt.
 *
 * - Android/Chrome/Edge: catches `beforeinstallprompt`, shows a styled
 *   banner with "התקן אפליקציה" CTA that triggers the native prompt.
 * - iOS Safari: no API — shows an instructional sheet on how to use
 *   Share → Add to Home Screen.
 *
 * Dismissal is stored in localStorage so it only nags once per device
 * per 30 days (rather than every page load).
 */

const DISMISS_KEY = 'tsua:pwa-install-dismissed';
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function wasRecentlyDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < COOLDOWN_MS;
  } catch { return false; }
}

export function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (wasRecentlyDismissed()) return;

    // Chrome/Edge/Android path
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS Safari path — no event, show help after a short delay
    if (isIOS()) {
      const t = setTimeout(() => {
        setShowIosHelp(true);
        setVisible(true);
      }, 8000);
      return () => {
        window.removeEventListener('beforeinstallprompt', onPrompt);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-20 md:bottom-6 inset-x-3 md:inset-x-auto md:right-6 md:max-w-sm z-[90] rounded-2xl overflow-hidden animate-slideUp"
      style={{
        background: 'linear-gradient(135deg, rgba(13,20,36,0.98), rgba(20,30,50,0.98))',
        border: '1px solid rgba(0,229,176,0.3)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,229,176,0.12)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(0,229,176,0.15)', border: '1px solid rgba(0,229,176,0.3)' }}
          >
            📱
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-tsua-text mb-0.5">
              {showIosHelp ? 'הוסף לבית' : 'התקן את תשואה'}
            </h3>
            <p className="text-xs text-tsua-muted leading-relaxed">
              {showIosHelp
                ? 'לחץ על כפתור השיתוף בסאפארי ⬆ ובחר "הוסף למסך הבית"'
                : 'קבל גישה מהירה מהמסך הראשי, התראות Push, ומצב מלא מסך.'}
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="סגור"
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-tsua-muted hover:text-tsua-text transition-colors"
            style={{ background: 'rgba(26,40,64,0.5)' }}
          >
            ✕
          </button>
        </div>

        {!showIosHelp && (
          <button
            onClick={install}
            className="mt-3 w-full h-10 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #00e5b0, #00c896)',
              color: '#060b16',
              boxShadow: '0 4px 16px rgba(0,229,176,0.3)',
            }}
          >
            התקן עכשיו
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>
    </div>
  );
}
