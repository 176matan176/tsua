'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { EyeIcon, EyeSlashIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export function ResetPasswordPage() {
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  // Supabase sets session from URL hash automatically
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // Small delay to let hash parse
    const t = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    if (password !== confirm) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.push(`/${locale}`), 2500);
    } catch (err: any) {
      setError(err?.message ?? 'שגיאה בעדכון הסיסמה');
    } finally {
      setLoading(false);
    }
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColor = ['', '#ff4d6a', '#f5b942', '#00e5b0'][strength];
  const strengthLabel = ['', 'חלשה', 'בינונית', 'חזקה'][strength];

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
            {'סיסמה חדשה'}
          </h1>
          <p className="text-sm text-tsua-muted mt-1">
            {'הזן סיסמה חדשה לחשבונך'}
          </p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ background: 'rgba(13,20,36,0.9)', border: '1px solid rgba(26,40,64,0.8)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}
        >
          {done ? (
            <div className="text-center space-y-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(0,229,176,0.1)', border: '1px solid rgba(0,229,176,0.3)' }}
              >
                <span className="text-3xl">🔐</span>
              </div>
              <div>
                <h2 className="font-black text-tsua-text text-lg mb-1">
                  {'הסיסמה עודכנה! ✓'}
                </h2>
                <p className="text-sm text-tsua-muted">
                  {'מעביר אותך לאפליקציה...'}
                </p>
              </div>
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(26,40,64,0.5)' }}>
                <div
                  className="h-full rounded-full transition-all duration-[2400ms] ease-linear"
                  style={{ width: '100%', background: 'linear-gradient(90deg, #00e5b0, #3b82f6)' }}
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Password */}
              <div>
                <label className="text-[11px] font-bold tracking-wider uppercase text-tsua-muted block mb-1.5">
                  {'סיסמה חדשה'}
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tsua-muted pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl py-2.5 ps-9 pe-10 text-sm placeholder:text-tsua-muted focus:outline-none transition-all"
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
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-tsua-muted hover:text-tsua-text transition-colors"
                  >
                    {showPass ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ background: i <= strength ? strengthColor : 'rgba(26,40,64,0.5)' }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="text-[11px] font-bold tracking-wider uppercase text-tsua-muted block mb-1.5">
                  {'אישור סיסמה'}
                </label>
                <div className="relative">
                  <LockClosedIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tsua-muted pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl py-2.5 ps-9 pe-4 text-sm placeholder:text-tsua-muted focus:outline-none transition-all"
                    style={{
                      background: 'rgba(15,25,41,0.6)',
                      border: confirm && confirm !== password
                        ? '1px solid rgba(255,77,106,0.4)'
                        : '1px solid rgba(26,40,64,0.8)',
                      color: '#e8f0ff',
                    }}
                    onFocus={e => {
                      e.target.style.border = '1px solid rgba(0,229,176,0.4)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(0,229,176,0.08)';
                    }}
                    onBlur={e => {
                      e.target.style.border = confirm && confirm !== password
                        ? '1px solid rgba(255,77,106,0.4)'
                        : '1px solid rgba(26,40,64,0.8)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                {confirm && confirm !== password && (
                  <p className="text-[10px] mt-1" style={{ color: '#ff4d6a' }}>
                    {'הסיסמאות אינן תואמות'}
                  </p>
                )}
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
                disabled={loading || !password || !confirm}
                className="w-full py-2.5 rounded-xl text-sm font-black text-tsua-bg transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', boxShadow: '0 4px 16px rgba(0,229,176,0.3)' }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-tsua-bg/40 border-t-tsua-bg animate-spin" />
                    {'מעדכן...'}
                  </>
                ) : (
                  'עדכן סיסמה'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
