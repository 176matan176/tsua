export type Exchange = 'TASE' | 'NASDAQ' | 'NYSE' | 'AMEX';
export type Currency = 'ILS' | 'USD';

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
  time: number; // Unix timestamp
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
