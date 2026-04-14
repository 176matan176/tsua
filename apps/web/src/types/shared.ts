// Inlined from @tsua/shared — types for production build

export type Sentiment = 'bullish' | 'bearish' | 'neutral';
export type AlertType = 'price_above' | 'price_below' | 'volume_spike' | 'news';
export type Exchange = 'TASE' | 'NASDAQ' | 'NYSE' | 'AMEX';
export type Currency = 'ILS' | 'USD';

export interface PostAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isVerified: boolean;
  rating?: number;
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

export interface Alert {
  id: string;
  userId: string;
  stockTicker: string;
  stockNameHe: string;
  stockNameEn: string;
  alertType: AlertType;
  threshold?: number;
  isActive: boolean;
  triggeredAt?: string;
  createdAt: string;
}

export interface CreateAlertInput {
  stockTicker: string;
  alertType: AlertType;
  threshold?: number;
}

export interface StockQuote {
  ticker: string;
  nameEn: string;
  nameHe: string;
  exchange: Exchange;
  currency: Currency;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high52w?: number;
  low52w?: number;
  updatedAt: string;
}

export interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockSearchResult {
  ticker: string;
  nameEn: string;
  nameHe: string;
  exchange: Exchange;
  currency: Currency;
}
