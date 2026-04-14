import { useTranslations } from 'next-intl';
import { RoomsDirectory } from '@/components/rooms/RoomsDirectory';

export default function RoomsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-tsua-text">חדרי מסחר / Trading Rooms</h1>
      <RoomsDirectory />
    </div>
  );
}
