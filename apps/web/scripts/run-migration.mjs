#!/usr/bin/env node
/**
 * Wave 4 Migration Runner
 *
 * Runs the Wave 4 SQL migration against Supabase using the service role key.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/run-migration.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/run-migration.mjs path/to/file.sql
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL from env or .env.local.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ── Load .env.local if SUPABASE_URL is missing ──────────────
function loadDotenv() {
  const envPath = path.join(projectRoot, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadDotenv();

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set');
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  console.error('   Run: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/run-migration.mjs');
  process.exit(1);
}

const sqlFile = process.argv[2] || path.join(projectRoot, 'supabase', 'wave4_migration.sql');
if (!fs.existsSync(sqlFile)) {
  console.error(`❌ SQL file not found: ${sqlFile}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlFile, 'utf8');
console.log(`📄 Running migration: ${path.basename(sqlFile)} (${sql.length} chars)`);

// Supabase doesn't expose a generic /sql endpoint via PostgREST.
// We use the pg-meta endpoint that the dashboard uses internally,
// or fall back to splitting and running via the rpc/exec_sql function.
//
// Cleanest path: use the supabase-js client which exposes .rpc('exec_sql', ...)
// if we install it. Since we don't want to add deps, we use the
// pg-meta endpoint (works with service role).

async function runViaPgMeta() {
  const url = `${SUPABASE_URL}/pg/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`pg-meta ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

// Fallback: use psql-compatible direct query via supabase-js
async function runViaSupabaseJs() {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
  // supabase-js doesn't have raw SQL — but we can install an exec_sql helper
  // by using the postgres connection string directly. Skipping for now.
  throw new Error('supabase-js fallback requires DATABASE_URL — use pg-meta endpoint or paste in dashboard');
}

(async () => {
  try {
    console.log('🚀 Executing via pg-meta endpoint...');
    const result = await runViaPgMeta();
    console.log('✅ Migration succeeded');
    if (Array.isArray(result)) {
      console.log(`   ${result.length} result rows`);
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('');
    console.error('Fallback: paste the SQL into Supabase dashboard:');
    console.error(`   https://supabase.com/dashboard/project/${SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]}/sql/new`);
    process.exit(1);
  }
})();
