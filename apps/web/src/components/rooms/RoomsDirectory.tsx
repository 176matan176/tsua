'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { COMMUNITIES } from '@/lib/communities';

export function RoomsDirectory() {
  const locale = useLocale();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {COMMUNITIES.map((room) => (
        <Link key={room.slug} href={`/${locale}/rooms/${room.slug}`}>
          <div className="bg-tsua-card border border-tsua-border rounded-2xl p-4 hover:border-tsua-green/50 hover:bg-tsua-card/80 transition-all cursor-pointer group">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{room.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-tsua-text group-hover:text-tsua-green transition-colors">
                    {locale === 'he' ? room.nameHe : room.nameEn}
                  </h3>
                  {room.isOfficial && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-tsua-green/10 text-tsua-green border border-tsua-green/30 rounded-full">
                      ✓ {locale === 'he' ? 'רשמית' : 'Official'}
                    </span>
                  )}
                </div>
                <p className="text-tsua-muted text-sm mt-1">
                  {locale === 'he' ? room.descHe : room.descEn}
                </p>
                <div className="flex items-center gap-1 mt-2 text-tsua-muted text-xs">
                  <span>👥</span>
                  <span>{room.members.toLocaleString()} {locale === 'he' ? 'חברים' : 'members'}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
