'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

const CONSENT_KEY = 'tsua_terms_v1';

export function TermsConsent() {
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) setShow(true);
  }, []);

  function accept() {
    if (!checked) return;
    localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgb(var(--rgb-card) / 0.99)', border: '1px solid rgb(var(--rgb-border) / 0.8)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgb(var(--rgb-border) / 0.6)', background: 'rgb(var(--rgb-accent) / 0.04)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgb(var(--rgb-accent) / 0.12)', border: '1px solid rgb(var(--rgb-accent) / 0.25)' }}>
            <ShieldCheckIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-base font-black text-tsua-text">ברוכים הבאים לתשואה 👋</h2>
            <p className="text-xs text-tsua-muted mt-0.5">הרשת החברתית לשוק ההון הישראלי</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          {[
            { icon: '📊', text: 'התוכן באתר הוא לצרכי מידע בלבד ואינו מהווה ייעוץ השקעות מורשה.' },
            { icon: '⚠️', text: 'השקעה בשוק ההון כרוכה בסיכון. ייתכן הפסד של כל ההשקעה.' },
            { icon: '🤝', text: 'הפוסטים הם דעות אישיות של המשתמשים בלבד.' },
            { icon: '🔒', text: 'אנו שומרים על פרטיותך ולא מוכרים מידע לצדדים שלישיים.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
              <p className="text-xs text-tsua-muted leading-relaxed">{item.text}</p>
            </div>
          ))}

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <div className="relative shrink-0 mt-0.5" onClick={() => setChecked(v => !v)}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
                style={{
                  background: checked ? 'var(--accent)' : 'rgb(var(--rgb-card) / 0.8)',
                  border: checked ? '1px solid var(--accent)' : '1px solid rgb(var(--rgb-border) / 0.8)',
                  boxShadow: checked ? '0 0 10px rgb(var(--rgb-accent) / 0.3)' : 'none',
                }}>
                {checked && (
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="var(--accent-contrast)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-tsua-muted leading-relaxed select-none">
              קראתי והסכמתי ל
              <Link href="/terms" target="_blank" className="font-semibold mx-1 hover:underline" style={{ color: 'var(--accent)' }}>תנאי השימוש</Link>
              ול
              <Link href="/privacy" target="_blank" className="font-semibold mx-1 hover:underline" style={{ color: 'var(--accent)' }}>מדיניות הפרטיות</Link>
              , ומבין שהתוכן אינו ייעוץ השקעות.
            </span>
          </label>
        </div>

        {/* Button */}
        <div className="px-6 pb-6">
          <button
            onClick={accept}
            disabled={!checked}
            className="w-full py-3 rounded-xl text-sm font-black transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{
              background: checked ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'rgb(var(--rgb-border) / 0.6)',
              // accent-contrast מיועד לרקע הגרדיאנט בלבד; במצב מנוטרל הרקע אפור
              // והטקסט חייב צבע קריא בשני התמות
              color: checked ? 'var(--accent-contrast)' : 'var(--muted)',
              boxShadow: checked ? '0 4px 20px rgb(var(--rgb-accent) / 0.3)' : 'none',
            }}
          >
            כניסה לאתר →
          </button>
        </div>
      </div>
    </div>
  );
}
