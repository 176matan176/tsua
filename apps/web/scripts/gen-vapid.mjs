#!/usr/bin/env node
/**
 * Generate a VAPID key pair for Web Push.
 * Run once, then save the keys to Vercel env vars:
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 * Also set NEXT_PUBLIC_VAPID_KEY = VAPID_PUBLIC_KEY if you want the
 * key exposed client-side (optional — the /api/push/vapid-public-key
 * endpoint serves it as well).
 *
 * Usage:
 *   node scripts/gen-vapid.mjs
 */
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('\n  VAPID_PUBLIC_KEY =', keys.publicKey);
console.log('  VAPID_PRIVATE_KEY =', keys.privateKey);
console.log('\n  Add these to Vercel env + VAPID_SUBJECT=mailto:support@tsua.co\n');
