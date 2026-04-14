export type AlertType = 'price_above' | 'price_below' | 'volume_spike' | 'news';

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
