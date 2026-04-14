import { RoomChat } from '@/components/rooms/RoomChat';

interface RoomPageProps {
  params: { slug: string; locale: string };
}

export default function RoomPage({ params }: RoomPageProps) {
  return <RoomChat slug={params.slug} />;
}
