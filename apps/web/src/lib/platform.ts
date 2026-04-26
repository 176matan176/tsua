/**
 * Platform detection — distinguishes between:
 *
 *   - browser:    plain web (Safari, Chrome, etc.)
 *   - pwa:        installed as PWA on home screen (display-mode: standalone)
 *   - native:     running inside our Capacitor shell (apps/mobile)
 *
 * Capacitor injects `window.Capacitor` when the WebView loads, so we can
 * sniff that to gate native-only behavior (push token registration via
 * @capacitor/push-notifications, haptic feedback, status bar styling, etc.)
 *
 * We do NOT import Capacitor packages here — the web bundle stays clean
 * and never pulls native dependencies. Native plugin calls happen lazily
 * inside the Capacitor shell, which has the runtime available.
 */

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => 'ios' | 'android' | 'web';
    };
  }
}

export type Platform = 'browser' | 'pwa' | 'ios' | 'android';

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'browser';

  // Capacitor exposes a global. isNativePlatform() returns true on iOS/Android.
  const cap = window.Capacitor;
  if (cap?.isNativePlatform?.()) {
    const p = cap.getPlatform?.();
    if (p === 'ios' || p === 'android') return p;
  }

  // PWA installed on home screen
  if (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  ) {
    return 'pwa';
  }

  return 'browser';
}

export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  return window.Capacitor?.isNativePlatform?.() === true;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true ||
    isNative()
  );
}
