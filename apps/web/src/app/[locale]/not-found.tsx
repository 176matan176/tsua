import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #00e5b0, transparent 70%)' }}
        />
      </div>

      {/* 404 number */}
      <div
        className="text-8xl font-black mb-4 select-none"
        style={{
          background: 'linear-gradient(135deg, #00e5b0, #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        404
      </div>

      <h1 className="text-2xl font-black text-tsua-text mb-2">
        הדף לא נמצא
      </h1>
      <p className="text-tsua-muted text-sm mb-8 max-w-xs">
        הדף שחיפשת לא קיים או הוסר. בדוק את הכתובת ונסה שוב.
      </p>

      <div className="flex gap-3">
        <Link
          href="/he"
          className="text-sm font-black px-6 py-2.5 rounded-xl text-tsua-bg transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #00e5b0, #00c49a)', boxShadow: '0 4px 16px rgba(0,229,176,0.3)' }}
        >
          חזרה לדף הבית
        </Link>
        <Link
          href="/he/markets"
          className="text-sm font-semibold px-6 py-2.5 rounded-xl text-tsua-muted hover:text-tsua-text transition-all"
          style={{ background: 'rgba(15,25,41,0.6)', border: '1px solid rgba(26,40,64,0.8)' }}
        >
          שווקים
        </Link>
      </div>
    </div>
  );
}
