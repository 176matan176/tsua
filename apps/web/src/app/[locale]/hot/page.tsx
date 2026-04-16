import type { Metadata } from 'next';
import { HotPageClient } from './HotPageClient';

export const metadata: Metadata = {
  title: 'מניות חמות',
  description: 'המניות הכי פעילות היום — לפי באזז קהילתי, תנודתיות ונפח מסחר',
};

export default function HotPage() {
  return <HotPageClient />;
}
