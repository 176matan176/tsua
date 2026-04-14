const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/config.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tsua/shared'],
  images: {
    domains: ['localhost', 'supabase.co'],
  },
};

module.exports = withNextIntl(nextConfig);
