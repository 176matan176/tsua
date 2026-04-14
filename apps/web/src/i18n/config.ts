import { getRequestConfig } from 'next-intl/server';

export const locales = ['he'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'he';

export default getRequestConfig(async () => {
  return {
    messages: (await import('./messages/he.json')).default,
  };
});
