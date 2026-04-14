'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

export function ForgotPasswordPage() {
  const locale = useLocale();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError('שגיאה בשליחת המייל. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)', boxShadow: '0 0 32px rgba(0,229,176,0.4)' }}
          >
            <span className="text-white font-black text-2xl">ת</span>
          </div>
          <h1 className="text-2xl font-black text-tsua-text">
            {'שחזור סיסמה'}
          </h1>
          <p className="text-sm text-tsua-muted mt-1 text-center">
            {'נשלח לך קישור לאיפוס הסיסמה'}
          </p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(13,20,36,0.9)', border: '1px solid rgba(26,40,64,0.8)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}
        >
          {sent ? (
            /* Success state */
            <div className="text-center space-y-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.3)' }}
              >
                <EnvelopeIcon className="w-7 h-7" style={{ color: '#00e5b0' }} />
              </div>
              <div>
                <h2 className="font-black text-tsua-text text-lg mb-1">
                  {'המייל נשלח! ✓'}
                </h2>
                <p className="text-sm text-tsua-muted">
                  {`שלחנו קישור לאיפוס סיסמה ל-${email}. בדוק את תיבת הדואר שלך.`}
                </p>
              </div>
              <p className="text-xs text-tsua-muted">
                {'לא קיבלת?'}{' '}
                <button
                  onClick={() => setSent(false)}
                  className="font-semibold hover:text-tsua-accent transition-colors"
                  style={{ color: '#00e5b0' }}
                >
                  {'שלח שוב'}
                </button>
              </p>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold tracking-wider uppercase text-tsua-muted block mb-1.5">
                  {'כתובת אימייל'}
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tsua-muted pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full rounded-xl py-2.5 ps-9 pe-4 text-sm placeholder:text-tsua-muted focus:outline-none transition-all"
                    style={{
                      background: 'rgba(15,25,41,0.6)',
                      border: '1px solid rgba(26,40,64,0.8)',
                      color: '#e8f0ff',
                    }}
                    onFocus={e => {
                      e.target.style.border = '1px solid rgba(0,229,176,0.4)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.08)';
                    }}
                    onBlur={e => {
                      e.target.style.border = '1px solid rgba(26,40,64,0.8)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {error && (
                <div
                  className="text-xs px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', color: '#ff4d6a' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-black text-tsua-bg transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', boxShadow: '0 4px 16px rgba(0,229,176,0.3)' }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-tsua-bg/40 border-t-tsua-bg animate-spin" />
                    {'שולח...'}
                  </>
                ) : (
                  'שלח קישור לאיפוס'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Back to login */}
        <Link
          href={`/${locale}/login`}
          className="flex items-center justify-center gap-2 mt-5 text-sm text-tsua-muted hover:text-tsua-text transition-colors group"
        >
          <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          {'חזרה לכניסה'}
        </Link>
      </div>
    </div>
  );
}
