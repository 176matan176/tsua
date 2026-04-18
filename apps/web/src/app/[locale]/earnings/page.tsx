import { EarningsCalendar } from '@/components/earnings/EarningsCalendar';

export const metadata = {
  title: 'לוח דוחות כספיים | תשואה',
  description: 'הדוחות הרבעוניים הקרובים של מניות ישראליות ואמריקאיות — EPS, הכנסות, והאם עמדו בציפיות',
};

export default function EarningsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(139,140,247,0.08) 0%, var(--card) 60%)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-tsua-text mb-2">📅 לוח דוחות כספיים</h1>
            <p className="text-sm text-tsua-muted leading-relaxed max-w-2xl">
              מתי יוצאים הדוחות הרבעוניים של המניות שאתה עוקב אחריהן.
              רואים את EPS וההכנסות הצפויים, ואם הדוח כבר פורסם — האם החברה הפתיעה לטובה ✓ או אכזבה ✗.
            </p>
          </div>
          <span
            className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 self-start"
            style={{
              background: 'rgba(139,140,247,0.12)',
              color: '#8b8cf7',
              border: '1px solid rgba(139,140,247,0.3)',
            }}
          >
            עודכן כל שעה
          </span>
        </div>
      </header>

      <EarningsCalendar />
    </div>
  );
}
