'use client';

import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { PostComposer } from './PostComposer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPost?: () => void;
}

export function MobileComposeSheet({ isOpen, onClose, onPost }: Props) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55]"
        style={{
          background: 'rgba(2,5,12,0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[56] rounded-t-2xl"
        style={{
          background: 'var(--card)',
          borderTop: '1px solid var(--border)',
          borderLeft: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          boxShadow: '0 -16px 48px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1)',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: 'var(--border)' }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2 mb-1"
          style={{ borderBottom: '1px solid var(--border2)' }}
          dir="rtl"
        >
          <span
            className="text-[11px] font-mono font-bold uppercase tracking-widest"
            style={{ color: 'var(--muted)' }}
          >
            פרסם ניתוח
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all hover:opacity-70 active:scale-90"
            style={{
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              background: 'var(--surface2)',
            }}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Composer */}
        <div className="px-3 pt-2">
          <PostComposer
            onPost={() => {
              onPost?.();
              onClose();
            }}
          />
        </div>
      </div>
    </>
  );
}
