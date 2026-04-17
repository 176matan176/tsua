'use client';

import { useEffect, useRef, useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import type { DictEntry } from '@/lib/financialDictionary';

interface InfoTooltipProps {
  /** A dictionary entry (preferred) — rich Hebrew explanation + example */
  term?: DictEntry;
  /** Or just a plain text tooltip */
  text?: string;
  /** Size in pixels. Default 14 (w-3.5 equivalent). */
  size?: number;
  /** Tooltip placement. Default 'top'. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Accessible info tooltip with Hebrew-first layout.
 * Opens on hover (desktop) and tap (mobile). Closes on second tap or outside click.
 * When given a DictEntry, renders a rich card with term/short/text/example.
 */
export function InfoTooltip({ term, text, size = 14, placement = 'top' }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  // Close on outside click when open (mobile tap)
  useEffect(() => {
    if (!show) return;
    const onDocClick = (e: Event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, [show]);

  // Close on ESC
  useEffect(() => {
    if (!show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShow(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show]);

  const placementClass =
    placement === 'bottom' ? 'top-6 start-0' :
    placement === 'left'   ? 'end-6 top-1/2 -translate-y-1/2' :
    placement === 'right'  ? 'start-6 top-1/2 -translate-y-1/2' :
                             'bottom-6 start-0';

  const hasEntry = !!term;

  return (
    <span ref={wrapperRef} className="relative inline-flex items-center ms-1.5">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={e => { e.preventDefault(); e.stopPropagation(); setShow(v => !v); }}
        onTouchStart={e => { e.stopPropagation(); setShow(v => !v); }}
        className="leading-none"
        aria-label={term?.term ?? 'הסבר'}
        aria-expanded={show}
      >
        <InformationCircleIcon
          style={{
            width: size,
            height: size,
            color: show ? '#00e5b0' : 'rgba(90,112,144,0.7)',
            transition: 'color 0.15s',
          }}
        />
      </button>
      {show && (
        <span
          role="tooltip"
          className={`absolute ${placementClass} z-50 w-64 rounded-xl p-3 leading-relaxed`}
          style={{
            background: 'rgba(10,16,30,0.98)',
            border: '1px solid rgba(0,229,176,0.25)',
            color: '#c8d8f0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
          }}
          dir="rtl"
        >
          {hasEntry ? (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-black" style={{ color: '#00e5b0' }}>
                  {term!.term}
                </span>
              </div>
              <div className="text-[11px] font-semibold mb-2" style={{ color: '#c8d8f0' }}>
                {term!.short}
              </div>
              <div className="text-[11px] opacity-80 leading-snug">
                {term!.text}
              </div>
              {term!.example && (
                <div
                  className="mt-2 pt-2 text-[10px] leading-snug"
                  style={{ borderTop: '1px solid rgba(0,229,176,0.15)', color: '#8aa0c0' }}
                >
                  <span className="font-bold" style={{ color: '#00e5b0' }}>דוגמה: </span>
                  {term!.example}
                </div>
              )}
            </>
          ) : (
            <span className="text-xs">{text}</span>
          )}
        </span>
      )}
    </span>
  );
}
