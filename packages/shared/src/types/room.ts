export type RoomType = 'stock' | 'topic';

export interface Room {
  id: string;
  slug: string;
  nameEn: string;
  nameHe: string;
  descriptionEn?: string;
  descriptionHe?: string;
  stockTicker?: string;
  roomType: RoomType;
  memberCount: number;
  isOfficial: boolean;
  createdAt: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
  body: string;
  lang: 'he' | 'en';
  createdAt: string;
}
