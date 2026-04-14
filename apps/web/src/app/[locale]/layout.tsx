export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales, type Locale } from '@/i18n/config';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { LiveMarketBar } from '@/components/layout/LiveMarketBar';
import { AuthProvider } from '@/contexts/AuthContext';
import { PriceProvider } from '@/contexts/PriceContext';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { TermsConsent } from '@/components/layout/TermsConsent';
import { ThemeProvider } from '@/contexts/ThemeContext';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'תשואה | הרשת החברתית לשוק ההון',
    template: '%s | תשואה',
  },
  description: 'הרשת החברתית הראשונה לשוק ההון הישראלי — שתף ניתוחים, עקוב אחר מניות, קבל התראות מחיר בזמן אמת',
  keywords: ['שוק ההון', 'מניות', 'השקעות', 'בורסה', 'תל אביב', 'TASE', 'טבע', 'TEVA', 'NVDA'],
  metadataBase: new URL('https://tsua-rho.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'he_IL',
    url: 'https://tsua-rho.vercel.app',
    siteName: 'תשואה',
    title: 'תשואה | הרשת החברתית לשוק ההון',
    description: 'הרשת החברתית הראשונה לשוק ההון הישראלי — שתף ניתוחים, עקוב אחר מניות, קבל התראות מחיר',
    images: [{ url: '/api/og', width: 1200, height: 630, alt: 'תשואה — הרשת החברתית לשוק ההון' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'תשואה | הרשת החברתית לשוק ההון',
    description: 'הרשת החברתית הראשונה לשוק ההון הישראלי',
    images: ['/api/og'],
  },
  manifest: '/manifest.json',
  themeColor: '#00e5b0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'תשואה',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function RootLayout({ children, params: { locale } }: RootLayoutProps) {
  if (!locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();
  const dir = locale === 'he' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="תשואה" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body className="bg-tsua-bg text-tsua-text font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
          <AuthProvider>
          <PriceProvider>
            <ServiceWorkerRegister />
            <TermsConsent />
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <LiveMarketBar />
              <div className="flex flex-1 max-w-7xl mx-auto w-full px-3 md:px-4 py-3 md:py-6 gap-4 md:gap-6 pb-20 md:pb-6">
                <Sidebar />
                <main className="flex-1 min-w-0">{children}</main>
              </div>
              <BottomNav />
            </div>
          </PriceProvider>
          </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
