'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { XMarkIcon } from '@heroicons/react/24/solid';

const FEATURES = [
  {
    icon: '📊',
    title: 'פיד חברתי',
    desc: 'שתף ניתוחים, עקוב אחרי משקיעים, תייג מניות עם $TEVA',
  },
  {
    icon: '📈',
    title: 'שוק בזמן אמת',
    desc: 'ת"א 35/125, S&P500, נאסד"ק — כל המדדים חיים',
  },
  {
    icon: '📰',
    title: 'חדשות כלכליות',
    desc: 'דה מרקר, גלובס, ynet כלכלה — ישירות לפיד שלך',
  },
];

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const { user, loading } = useAuth();
  const locale = useLocale();

  useEffect(() => {
    if (loading) return;
    if (user) return;
    const seen = localStorage.getItem('tsua-onboarded');
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [user, loading]);

  function dismiss() {
    setClosing(true);
    localStorage.setItem('tsua-onboarded', '1');
    setTimeout(() => { setVisible(false); setClosing(false); }, 280);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        animation: closing ? 'fadeOut 0.28s ease-in forwards' : 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(2,5,12,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[360px] rounded-2xl overflow-hidden"
        dir="rtl"
        style={{
          background: '#060b16',
          border: '1px solid rgba(0,229,176,0.35)',
          boxShadow: '0 0 0 1px rgba(0,229,176,0.08), 0 0 80px rgba(0,229,176,0.12), 0 32px 80px rgba(0,0,0,0.85)',
          animation: closing ? 'modalDown 0.28s ease-in forwards' : 'modalUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Terminal header bar */}
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: '#0a0f1e', borderBottom: '1px solid rgba(0,229,176,0.12)' }}
        >
          <div className="flex gap-1.5 items-center">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffbd2e' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
          </div>
          <span
            className="flex-1 text-center text-[10px] font-mono tracking-widest uppercase"
            style={{ color: 'rgba(0,229,176,0.45)' }}
          >
            tsua.co — v1.0
          </span>
          <button
            onClick={dismiss}
            className="transition-opacity hover:opacity-60"
            style={{ color: 'rgba(90,112,144,0.5)' }}
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-6">
          {/* Logo + tagline */}
          <div className="text-center mb-6">
            {/* Glow ring behind logo */}
            <div className="relative inline-block mb-3">
              <div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: 'rgba(0,229,176,0.2)', transform: 'scale(1.4)' }}
              />
              <div
                className="relative text-[44px] font-black tracking-[-0.03em]"
                style={{
                  color: '#00e5b0',
                  fontFamily: "'Heebo', sans-serif",
                  textShadow: '0 0 30px rgba(0,229,176,0.5)',
                }}
              >
                תשואה
              </div>
            </div>
            <p
              className="text-[13px] font-semibold leading-relaxed"
              style={{ color: 'rgba(168,188,212,0.85)' }}
            >
              הפלטפורמה הסוציאלית למשקיעים הישראלים
            </p>
          </div>

          {/* Feature cards */}
          <div className="space-y-2.5 mb-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl"
                style={{
                  background: 'rgba(0,229,176,0.04)',
                  border: '1px solid rgba(0,229,176,0.1)',
                  animationDelay: `${0.1 + i * 0.07}s`,
                  animation: 'featureIn 0.4s ease-out both',
                }}
              >
                <span className="text-[22px] shrink-0 leading-none">{f.icon}</span>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold mb-0.5" style={{ color: '#e8f0ff' }}>
                    {f.title}
                  </div>
                  <div className="text-[11px] leading-relaxed" style={{ color: 'rgba(90,112,144,0.85)' }}>
                    {f.desc}
                  </div>
                </div>
                {/* Accent dot */}
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0 ms-auto"
                  style={{ background: 'rgba(0,229,176,0.5)' }}
                />
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="space-y-2.5">
            <Link
              href={`/${locale}/signup`}
              onClick={dismiss}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-black text-[14px] transition-all hover:brightness-110 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00e5b0 0%, #009e7a 100%)',
                color: '#03110c',
                letterSpacing: '-0.02em',
                boxShadow: '0 4px 24px rgba(0,229,176,0.3), 0 1px 0 rgba(255,255,255,0.1) inset',
              }}
            >
              הצטרף חינם
              <span style={{ fontFamily: 'monospace' }}>→</span>
            </Link>

            <Link
              href={`/${locale}/login`}
              onClick={dismiss}
              className="flex items-center justify-center w-full py-2.5 rounded-xl font-semibold text-[13px] transition-all hover:bg-white/5 active:scale-[0.98]"
              style={{
                color: 'rgba(168,188,212,0.8)',
                border: '1px solid rgba(26,40,64,0.9)',
              }}
            >
              כבר יש לי חשבון
            </Link>

            <button
              onClick={dismiss}
              className="w-full text-center text-[11px] pt-0.5 transition-opacity hover:opacity-60"
              style={{ color: 'rgba(60,80,110,0.65)', fontFamily: 'monospace' }}
            >
              המשך כאורח
            </button>
          </div>
        </div>

        {/* Bottom glow line */}
        <div
          className="h-[2px] w-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,229,176,0.4) 50%, transparent 100%)',
          }}
        />
      </div>
    </div>
  );
}
