export type Sentiment = 'bullish' | 'bearish' | 'neutral';

export interface PostAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isVerified: boolean;
}

export interface PostStockMention {
  ticker: string;
  nameEn: string;
  nameHe: string;
  exchange: string;
  price?: number;
  changePercent?: number;
}

export interface Post {
  id: string;
  author: PostAuthor;
  body: string;
  lang: 'he' | 'en';
  sentiment?: Sentiment;
  imageUrls: string[];
  likeCount: number;
  replyCount: number;
  repostCount: number;
  stockMentions: PostStockMention[];
  isLiked?: boolean;
  isReposted?: boolean;
  parentId?: string;
  createdAt: string;
}

export interface CreatePostInput {
  body: string;
  lang: 'he' | 'en';
  sentiment?: Sentiment;
  imageUrls?: string[];
}
