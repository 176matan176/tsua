import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for the Tsua native shell.
 *
 * STRATEGY: hosted-app shell.
 *   We don't ship the Next.js bundle inside the app binary. The shell loads
 *   the production web site (https://tsua-rho.vercel.app) directly. This means:
 *
 *     - Every web deploy is instantly live in the native app
 *     - No App Store re-review needed for content/UI changes
 *     - Push, deep links, and haptics still go through native APIs
 *     - Same auth cookies, same Supabase realtime, same everything
 *
 *   Tradeoff: the app needs network on first launch. There's no offline
 *   shell at the native layer — the web service worker (sw.js) handles that
 *   inside the WKWebView/Chrome WebView.
 *
 * For a fully bundled offline-capable app, set `server.url` to undefined and
 * point `webDir` at a Next.js static export. That requires `output: 'export'`
 * in next.config.js, which today we don't run because we use SSR routes.
 */
const config: CapacitorConfig = {
  appId: 'il.tsua.app',
  appName: 'תשואה',
  webDir: 'web',                       // stub — Capacitor requires it even when using server.url

  server: {
    url: 'https://tsua-rho.vercel.app',
    androidScheme: 'https',
    cleartext: false,
    // Allow only the production host + fonts. Any other URL the page tries
    // to navigate to opens in the system browser instead of inside the app.
    allowNavigation: [
      'tsua-rho.vercel.app',
      '*.vercel.app',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
    ],
  },

  ios: {
    contentInset: 'always',           // respects safe areas (notch, home indicator)
    backgroundColor: '#060b16',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },

  android: {
    backgroundColor: '#060b16',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#060b16',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#00e5b0',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#060b16',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
