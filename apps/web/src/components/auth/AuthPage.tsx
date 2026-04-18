'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

type Mode = 'login' | 'signup';

interface AuthPageProps {
  mode: Mode;
}

export function AuthPage({ mode }: AuthPageProps) {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // Capture ?ref=<code> for signup — store in sessionStorage so it survives email confirm
  useEffect(() => {
    if (mode !== 'signup') return;
    const ref = searchParams?.get('ref');
    if (ref) {
      try { sessionStorage.setItem('tsua_ref', ref.trim().toLowerCase()); } catch {}
    }
    // Try to show who invited
    const stored = (() => { try { return sessionStorage.getItem('tsua_ref'); } catch { return null; } })();
    if (stored) {
      fetch(`/api/profile/by-code?code=${encodeURIComponent(stored)}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.username) setReferrerName(d.username); })
        .catch(() => {});
    }
  }, [mode, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else {
        // Validate username format
        if (!/^[a-z0-9_]{3,20}$/.test(username)) {
          throw new Error('שם משתמש יכול להכיל רק אותיות לועזיות, מספרים וקו תחתון (3-20 תווים)');
        }
        // Check username availability
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();
        if (existing) throw new Error('שם המשתמש תפוס, בחר שם אחר');

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, display_name: username } },
        });
        if (error) throw error;

        // Redeem referral code (if any) once session is available
        let refCode: string | null = null;
        try { refCode = sessionStorage.getItem('tsua_ref'); } catch {}
        if (refCode && data.session) {
          fetch('/api/referral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: refCode }),
          }).catch(() => {});
          try { sessionStorage.removeItem('tsua_ref'); } catch {}
        }

        // If session is returned immediately (email confirmation disabled), redirect now
        if (data.session) {
          router.push('/');
          router.refresh();
        } else {
          setSuccess('נשלח אימייל אימות! בדוק את תיבת הדואר שלך.');
        }
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Unknown error';
      if (msg.includes('Invalid login credentials'))
        setError('אימייל או סיסמה שגויים');
      else if (msg.includes('already registered'))
        setError('האימייל הזה כבר רשום');
      else if (msg.includes('Password should be at least'))
        setError('הסיסמה חייבת להיות לפחות 6 תווים');
      else
        setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-[85vh] flex items-center justify-center px-4 py-8 relative"
      dir="rtl"
    >
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -start-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #00e5b0, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -end-40 w-96 h-96 rounded-full opacity-8 blur-3xl"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}
        />
      </div>

      <div className="w-full max-w-sm animate-fade-in relative">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`}>
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00e5b0, #3b82f6)',
                boxShadow: '0 0 40px rgba(0,229,176,0.35), 0 8px 32px rgba(0,0,0,0.3)',
              }}
            >
              <span className="text-white font-black text-3xl">ת</span>
            </div>
          </Link>
          <h1 className="text-2xl font-black text-tsua-text tracking-tight">
            {mode === 'login'
              ? 'ברוך הבא חזרה'
              : 'הצטרף לתשואה'}
          </h1>
          <p className="text-tsua-muted text-sm mt-1.5 leading-relaxed">
            {mode === 'login'
              ? 'הזירה הפיננסית-חברתית הישראלית'
              : 'הפלטפורמה החברתית לשוק ההון הישראלי'}
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: 'rgba(13,20,36,0.85)',
            border: '1px solid rgba(26,40,64,0.8)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Referral banner */}
            {mode === 'signup' && referrerName && (
              <div
                className="rounded-xl px-3 py-2.5 text-[12px] flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,229,176,0.08), rgba(59,130,246,0.05))',
                  border: '1px solid rgba(0,229,176,0.25)',
                  color: '#b3c2d6',
                }}
              >
                <span style={{ fontSize: '18px' }}>🎁</span>
                <span>הוזמנת על ידי <strong style={{ color: '#00e5b0' }}>@{referrerName}</strong> — נהנה מברכת פנים חמה!</span>
              </div>
            )}

            {/* Username — signup only */}
            {mode === 'signup' && (
              <InputField
                label='שם משתמש'
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="trader_il"
                required
                minLength={3}
                maxLength={20}
                dir="ltr"
                type="text"
              />
            )}

            <InputField
              label='אימייל'
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              dir="ltr"
            />

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-tsua-muted block">
                סיסמה
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='לפחות 6 תווים'
                  required
                  minLength={6}
                  className="w-full rounded-xl px-4 py-2.5 pe-10 text-sm placeholder:text-tsua-muted focus:outline-none transition-all duration-200"
                  style={{ background: 'rgba(6,11,22,0.8)', border: '1px solid rgba(26,40,64,0.8)', color: '#e8f0ff' }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,229,176,0.4)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.07)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(26,40,64,0.8)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-tsua-muted hover:text-tsua-text transition-colors"
                >
                  {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password — login only */}
            {mode === 'login' && (
              <div className="text-end -mt-2">
                <Link
                  href={`/${locale}/forgot-password`}
                  className="text-xs text-tsua-muted hover:text-tsua-accent transition-colors"
                  style={{ color: '#5a7090' }}
                >
                  שכחת סיסמה?
                </Link>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                className="rounded-xl px-4 py-2.5 text-sm font-medium animate-fade-in flex items-center gap-2"
                style={{ background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.25)', color: '#ff4d6a' }}
              >
                <span>⚠</span> {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div
                className="rounded-xl px-4 py-2.5 text-sm font-medium animate-fade-in flex items-center gap-2"
                style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.25)', color: '#00e5b0' }}
              >
                <span>✓</span> {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-black transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #00e5b0, #00c49a)',
                color: '#060b16',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(0,229,176,0.35)',
              }}
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    טוען...
                  </span>
                : mode === 'login'
                  ? 'כניסה'
                  : 'יצירת חשבון'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(26,40,64,0.7)' }} />
            <span className="text-xs text-tsua-muted font-medium">או</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(26,40,64,0.7)' }} />
          </div>

          {/* Google OAuth */}
          <button
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
              });
            }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 flex items-center justify-center gap-2.5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#c8d8f0',
            }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            כניסה עם Google
          </button>
        </div>

        {/* Switch mode */}
        <p className="text-center text-sm text-tsua-muted mt-5">
          {mode === 'login'
            ? 'אין לך חשבון?'
            : 'יש לך חשבון?'}{' '}
          <Link
            href={`/${locale}/${mode === 'login' ? 'signup' : 'login'}`}
            className="font-black hover:underline transition-colors"
            style={{ color: '#00e5b0' }}
          >
            {mode === 'login'
              ? 'הירשם חינם'
              : 'התחבר'}
          </Link>
        </p>
      </div>
    </div>
  );
}

function InputField({
  label, value, onChange, placeholder, required, type, dir, minLength, maxLength,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  dir?: string;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-tsua-muted block">{label}</label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        dir={dir}
        className="w-full rounded-xl px-4 py-2.5 text-sm placeholder:text-tsua-muted focus:outline-none transition-all duration-200"
        style={{ background: 'rgba(6,11,22,0.8)', border: '1px solid rgba(26,40,64,0.8)', color: '#e8f0ff' }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'rgba(0,229,176,0.4)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.07)';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'rgba(26,40,64,0.8)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}
