#!/usr/bin/env node
/**
 * Generates the shareable "User distribution by country, state and city"
 * report as a self-contained HTML file plus a JSON sidecar.
 *
 * Reads `public.user_distribution_stats` — the SAME view the in-app screen
 * reads through `user_distribution_report()` — so the two can never drift.
 * That view is service-role only, which is why this needs the service key:
 *
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   npm run report:distribution
 *
 * The service key is a full-access credential. It is read from the
 * environment, never written to disk, and never committed — and `reports/` is
 * gitignored because its output is real usage data.
 *
 * PRECISION: country is exact (device Region setting); state and city are
 * inferred from the device time zone and are approximate. See the long note at
 * the top of the distribution section in `supabase/schema.sql`.
 */
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDistribution, renderHtml } from './lib/distribution-report.mjs';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'reports');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Missing credentials.\n\n' +
      '  SUPABASE_URL=https://xxxx.supabase.co \\\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=eyJ... \\\n' +
      '  npm run report:distribution\n\n' +
      'Find both under Project Settings > API in the Supabase dashboard.\n' +
      'The service role key bypasses RLS — never commit it or paste it into the app.',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from('user_distribution_stats')
  .select('region_code, region, city, time_zone, user_count');

if (error) {
  console.error('Query failed:', error.message);
  if (error.message.includes('permission denied') || error.code === '42501') {
    console.error('\nThat key does not look like a service role key — the stats view is service-role only.');
  }
  process.exit(1);
}

const distribution = buildDistribution(data ?? []);

await mkdir(OUT_DIR, { recursive: true });
const jsonPath = join(OUT_DIR, 'user-distribution.json');
const htmlPath = join(OUT_DIR, 'user-distribution.html');
await writeFile(jsonPath, `${JSON.stringify(distribution, null, 2)}\n`);
await writeFile(htmlPath, renderHtml(distribution));

console.log(
  `${distribution.totalUsers} users across ${distribution.countries.length} countries ` +
    `(${Math.round(distribution.coverage * 100)}% located)\n  ${jsonPath}\n  ${htmlPath}`,
);
