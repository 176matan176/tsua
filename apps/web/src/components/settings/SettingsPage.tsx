'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  KeyIcon,
  BellIcon,
  ShieldCheckIcon,
  TrashIcon,
  ChevronRightIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function PasswordStrength({ password }: { password: string }) {
  const len = password.length;
  const level = len === 0 ? 0 : len < 6 ? 1 : len < 10 ? 2 : 3;
  const labels = ['', 'חלשה', 'בינונית', 'חזקה'];
  const colors = ['', '#ff4d6a', '#f5b942', '#00e5b0'];
  if (!password) return null;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ background: i <= level ? colors[level] : 'rgba(26,40,64,0.6)' }} />
        ))}
      </div>
      <span className="text-[11px] font-semibold" style={{ color: colors[level] }}>
        {labels[level]}
      </span>
    </div>
  );
}

type Section = 'main' | 'password' | 'notifications' | 'privacy';

export function SettingsPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();

  const [section, setSection] = useState<Section>('main');

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  // Notification prefs
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifReplies, setNotifReplies] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [notifAlerts, setNotifAlerts] = useState(true);

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center" dir="rtl">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl"
          style={{ background: 'rgba(26,40,64,0.4)', border: '1px solid rgba(26,40,64,0.8)' }}>
          🔒
        </div>
        <p className="text-tsua-muted text-sm mb-4">יש להתחבר כדי לגשת להגדרות</p>
        <Link href={`/${locale}/login`} className="font-bold px-5 py-2 rounded-xl text-tsua-bg text-sm"
          style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)' }}>
          כניסה
        </Link>
      </div>
    );
  }

  async function handlePasswordChange() {
    if (newPw !== confirmPw) {
      setPwError('הסיסמאות אינן תואמות');
      return;
    }
    if (newPw.length < 6) {
      setPwError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    setPwLoading(true);
    setPwError('');
    try {
      const supabase = createSupabase();
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e: any) {
      setPwError(e.message ?? 'שגיאה בשמירת הסיסמה');
    } finally {
      setPwLoading(false);
    }
  }

  async function handleSignOut() {
    const supabase = createSupabase();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
  }

  const displayName = user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split('@')[0] || '';
  const email = user.email ?? '';

  const menuItems = [
    { id: 'password', icon: KeyIcon, label: 'שינוי סיסמה', color: '#3b82f6' },
    { id: 'notifications', icon: BellIcon, label: 'הגדרות התראות', color: '#f5b942' },
    { id: 'privacy', icon: ShieldCheckIcon, label: 'פרטיות', color: '#00e5b0' },
  ];

  return (
    <div className="space-y-4 max-w-lg mx-auto" dir="rtl">

      {/* Page header */}
      <div className="flex items-center gap-3">
        {section !== 'main' && (
          <button
            onClick={() => { setSection('main'); setPwError(''); setPwSuccess(false); }}
            className="p-2 rounded-xl transition-all hover:bg-white/5 text-tsua-muted hover:text-tsua-text"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-black text-tsua-text">
            {section === 'main' && '⚙️ הגדרות'}
            {section === 'password' && '🔑 שינוי סיסמה'}
            {section === 'notifications' && '🔔 התראות'}
            {section === 'privacy' && '🛡️ פרטיות'}
          </h1>
        </div>
      </div>

      {/* ── MAIN MENU ── */}
      {section === 'main' && (
        <>
          {/* Profile card */}
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-black text-tsua-bg shrink-0"
              style={{ background: 'linear-gradient(135deg, #00e5b0, #3b82f6)' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-tsua-text">{displayName}</div>
              <div className="text-xs text-tsua-muted">{email}</div>
            </div>
            <div className="flex-1" />
            <Link
              href={`/${locale}/profile/${user.user_metadata?.username}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:opacity-90"
              style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}
            >
              פרופיל
            </Link>
          </div>

          {/* Settings menu items */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
          >
            {menuItems.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id as Section)}
                className="w-full flex items-center gap-3 p-4 text-start transition-all hover:bg-white/5 active:bg-white/10"
                style={{ borderBottom: i < menuItems.length - 1 ? '1px solid rgba(26,40,64,0.5)' : 'none' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}
                >
                  <item.icon className="w-4.5 h-4.5" style={{ color: item.color, width: '18px', height: '18px' }} />
                </div>
                <span className="flex-1 text-sm font-semibold text-tsua-text">
                  {item.label}
                </span>
                <ChevronRightIcon
                  className="w-4 h-4 text-tsua-muted"
                  style={{ transform: 'rotate(180deg)' }}
                />
              </button>
            ))}
          </div>

          {/* Bookmarks link */}
          <Link
            href={`/${locale}/bookmarks`}
            className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all hover:bg-white/5"
            style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,185,66,0.1)', border: '1px solid rgba(245,185,66,0.2)' }}>
              <span className="text-base">🔖</span>
            </div>
            <span className="flex-1 text-sm font-semibold text-tsua-text">
              הסימניות שלי
            </span>
            <ChevronRightIcon className="w-4 h-4 text-tsua-muted" style={{ transform: 'rotate(180deg)' }} />
          </Link>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'rgba(255,77,106,0.1)', color: '#ff4d6a', border: '1px solid rgba(255,77,106,0.2)' }}
          >
            יציאה מהחשבון
          </button>
        </>
      )}

      {/* ── PASSWORD CHANGE ── */}
      {section === 'password' && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
        >
          {pwSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(0,229,176,0.1)', color: '#00e5b0', border: '1px solid rgba(0,229,176,0.2)' }}>
              <CheckIcon className="w-4 h-4 shrink-0" />
              הסיסמה עודכנה בהצלחה!
            </div>
          )}

          {/* New password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tsua-muted">
              סיסמה חדשה
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="לפחות 6 תווים"
                className="w-full text-sm rounded-xl px-3 py-2.5 pr-10 focus:outline-none transition-all"
                style={{
                  background: 'rgba(8,13,26,0.6)',
                  border: '1px solid rgba(26,40,64,0.8)',
                  color: '#d4e4ff',
                }}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-tsua-muted hover:text-tsua-text"
              >
                {showNew ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={newPw} />
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-tsua-muted">
              אימות סיסמה
            </label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="הזן שוב את הסיסמה"
              className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none transition-all"
              style={{
                background: 'rgba(8,13,26,0.6)',
                border: confirmPw && confirmPw !== newPw ? '1px solid rgba(255,77,106,0.5)' : '1px solid rgba(26,40,64,0.8)',
                color: '#d4e4ff',
              }}
              dir="ltr"
            />
            {confirmPw && confirmPw !== newPw && (
              <p className="text-[11px] font-semibold" style={{ color: '#ff4d6a' }}>
                הסיסמאות אינן תואמות
              </p>
            )}
          </div>

          {pwError && (
            <p className="text-xs font-semibold" style={{ color: '#ff4d6a' }}>{pwError}</p>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={pwLoading || !newPw || !confirmPw}
            className="w-full py-2.5 rounded-xl text-sm font-black text-tsua-bg transition-all disabled:opacity-40 hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', boxShadow: '0 4px 12px rgba(0,229,176,0.25)' }}
          >
            {pwLoading ? '...' : 'עדכן סיסמה'}
          </button>

          <p className="text-[11px] text-center text-tsua-muted">
            לא זוכר את הסיסמה?{' '}
            <Link href={`/${locale}/forgot-password`} className="font-semibold" style={{ color: '#00e5b0' }}>
              אפס אותה
            </Link>
          </p>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {section === 'notifications' && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
        >
          {[
            { key: 'likes', val: notifLikes, set: setNotifLikes, label: 'לייקים על הפוסטים שלי', emoji: '❤️' },
            { key: 'replies', val: notifReplies, set: setNotifReplies, label: 'תגובות לפוסטים שלי', emoji: '💬' },
            { key: 'follows', val: notifFollows, set: setNotifFollows, label: 'עוקבים חדשים', emoji: '👥' },
            { key: 'alerts', val: notifAlerts, set: setNotifAlerts, label: 'התראות מחיר (Watchlist)', emoji: '🔔' },
          ].map((item, i, arr) => (
            <div
              key={item.key}
              className="flex items-center gap-3 p-4"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(26,40,64,0.5)' : 'none' }}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="flex-1 text-sm font-semibold text-tsua-text">
                {item.label}
              </span>
              <button
                onClick={() => item.set(v => !v)}
                className="relative w-11 h-6 rounded-full transition-all duration-200 shrink-0"
                style={{ background: item.val ? 'linear-gradient(135deg, #00e5b0, #00c49a)' : 'rgba(26,40,64,0.8)' }}
              >
                <span
                  className="absolute top-1 w-4 h-4 rounded-full transition-all duration-200"
                  style={{
                    background: '#fff',
                    left: item.val ? '4px' : 'calc(100% - 20px)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── PRIVACY ── */}
      {section === 'privacy' && (
        <div className="space-y-4">
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: 'rgba(13,20,36,0.8)', border: '1px solid rgba(26,40,64,0.7)' }}
          >
            <h3 className="text-sm font-bold text-tsua-text">
              מידע אישי
            </h3>
            <div className="space-y-2 text-xs text-tsua-muted">
              <div className="flex justify-between">
                <span>כתובת אימייל</span>
                <span className="font-mono text-tsua-text">{email}</span>
              </div>
              <div className="flex justify-between">
                <span>הצטרפת ב-</span>
                <span className="text-tsua-text">
                  {new Date(user.created_at).toLocaleDateString('he-IL')}
                </span>
              </div>
            </div>
          </div>

          {/* Data export info */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(0,229,176,0.04)', border: '1px solid rgba(0,229,176,0.1)' }}
          >
            <h3 className="text-sm font-bold text-tsua-text mb-2">
              📦 הנתונים שלך
            </h3>
            <p className="text-xs text-tsua-muted mb-3">
              כל הנתונים שלך נשמרים בצורה מאובטחת. אנחנו לא מוכרים מידע אישי לצדדים שלישיים.
            </p>
            <div className="flex gap-3">
              <a
                href="/terms"
                target="_blank"
                className="text-xs font-semibold transition-colors hover:underline"
                style={{ color: '#00e5b0' }}
              >
                תנאי שימוש ↗
              </a>
              <a
                href="/privacy"
                target="_blank"
                className="text-xs font-semibold transition-colors hover:underline"
                style={{ color: '#00e5b0' }}
              >
                מדיניות פרטיות ↗
              </a>
            </div>
          </div>

          {/* Danger zone */}
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,77,106,0.04)', border: '1px solid rgba(255,77,106,0.15)' }}
          >
            <h3 className="text-sm font-bold mb-3" style={{ color: '#ff4d6a' }}>
              ⚠️ אזור סכנה
            </h3>
            <p className="text-xs text-tsua-muted mb-3">
              מחיקת חשבון היא פעולה בלתי הפיכה. כל הפוסטים, העוקבים והנתונים שלך יימחקו לצמיתות.
            </p>
            <p className="text-xs text-tsua-muted mb-2">
              {`הקלד "${user.email}" לאישור:`}
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={email}
              dir="ltr"
              className="w-full text-sm rounded-xl px-3 py-2 mb-3 focus:outline-none"
              style={{ background: 'rgba(8,13,26,0.6)', border: '1px solid rgba(255,77,106,0.2)', color: '#d4e4ff' }}
            />
            <button
              disabled={deleteConfirm !== email || deleteLoading}
              className="w-full py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,77,106,0.15)', color: '#ff4d6a', border: '1px solid rgba(255,77,106,0.3)' }}
              onClick={() => {
                // Instructs user to contact support — we don't auto-delete
                alert('לבקשת מחיקת חשבון, אנא צור קשר עם support@tsua.co');
              }}
            >
              <TrashIcon className="w-4 h-4 inline mr-1" />
              מחק את החשבון שלי
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
