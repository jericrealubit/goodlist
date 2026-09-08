// Captures the Play Store phone screenshots from the real app.
//
// These are genuine renders of the shipped screens — the web build of the
// same Expo Router code the Android app runs, driven in a headless Chromium
// at a 1080x2160 phone viewport. Nothing here is a mockup or an illustration.
//
// Supabase is stubbed at the network boundary rather than in the app, so no
// source file knows it is being screenshotted and no demo account or live
// database is needed: a session is seeded into storage, and every
// PostgREST/GoTrue call is answered from the fixtures below.
//
// Run with: npm run store:screenshots
// Output:   docs/store/screenshots/*.png  (1080x2160, 24-bit, no alpha)
//
// Play needs at least 2 phone screenshots and allows up to 8.
//
// Prerequisites: `npx expo export --platform web` has been run (the script
// does it for you if dist/ is missing).
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { chromium } from 'playwright-core';

import { findChrome } from './lib/find-chrome.mjs';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(rootDir, 'dist');
const outDir = path.join(rootDir, 'docs', 'store', 'screenshots');

const PORT = 8099;
// Play's phone screenshot rules: 320-3840px per side, and the long side may
// be at most twice the short side. 1080x2160 sits exactly on that 2:1 cap and
// is a real flagship resolution, so nothing is letterboxed or upscaled.
const VIEWPORT = { width: 360, height: 720 };
const SCALE = 3;

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PARTNER_ID = '22222222-2222-4222-8222-222222222222';
const CHILD_ID = '33333333-3333-4333-8333-333333333333';
const FAMILY_ID = '44444444-4444-4444-8444-444444444444';

const iso = (offsetMinutes) => new Date(Date.now() + offsetMinutes * 60_000).toISOString();

const profile = (id, display_name) => ({
  id,
  display_name,
  avatar_url: null,
  last_seen_at: iso(-2),
  created_at: iso(-60 * 24 * 90),
  region_code: 'AU',
  time_zone: 'Australia/Perth',
  locale_updated_at: iso(-30),
  locale_sharing: true,
});

const PROFILES = {
  [USER_ID]: profile(USER_ID, 'Jeric'),
  [PARTNER_ID]: profile(PARTNER_ID, 'Maria'),
  [CHILD_ID]: profile(CHILD_ID, 'Noah'),
};

const task = (over) => ({
  id: over.id,
  family_id: over.family_id ?? null,
  creator_id: over.creator_id ?? USER_ID,
  assignee_id: over.assignee_id ?? USER_ID,
  title: over.title,
  notes: over.notes ?? null,
  due_at: over.due_at ?? null,
  origin: over.origin ?? 'personal',
  status: over.status ?? 'open',
  sort_order: over.sort_order,
  completed_at: over.completed_at ?? null,
  created_at: over.created_at ?? iso(-60 * 24),
  updated_at: over.updated_at ?? iso(-60),
  creator: { display_name: PROFILES[over.creator_id ?? USER_ID].display_name },
  assignee: { display_name: PROFILES[over.assignee_id ?? USER_ID].display_name },
});

const FEATURED_TASK_ID = 'aaaaaaa1-0000-4000-8000-000000000001';

const OPEN_TASKS = [
  task({
    id: FEATURED_TASK_ID,
    title: 'Book the campsite for Easter',
    notes: 'Site 14 or 15 — the ones near the river. Need to pay the deposit to hold it, and the booking window opens on the 1st.',
    due_at: iso(60 * 24 * 3),
    sort_order: 1,
  }),
  task({ id: 'aaaaaaa1-0000-4000-8000-000000000002', title: 'Renew the car registration', due_at: iso(60 * 24), sort_order: 2 }),
  task({
    id: 'aaaaaaa1-0000-4000-8000-000000000003',
    title: 'Pick up the parcel from the post office',
    origin: 'requested',
    creator_id: PARTNER_ID,
    family_id: FAMILY_ID,
    sort_order: 3,
  }),
  task({ id: 'aaaaaaa1-0000-4000-8000-000000000004', title: 'Water the herbs', sort_order: 4 }),
  task({
    id: 'aaaaaaa1-0000-4000-8000-000000000005',
    title: 'Take the bins out',
    origin: 'requested',
    creator_id: PARTNER_ID,
    family_id: FAMILY_ID,
    notes: 'Recycling week',
    sort_order: 5,
  }),
  task({ id: 'aaaaaaa1-0000-4000-8000-000000000006', title: 'Call the dentist about Noah’s check-up', sort_order: 6 }),
  task({ id: 'aaaaaaa1-0000-4000-8000-000000000007', title: 'Finish the tax paperwork', due_at: iso(60 * 24 * 10), sort_order: 7 }),
];

const HISTORY_TASKS = [
  task({ id: 'bbbbbbb1-0000-4000-8000-000000000001', title: 'Pay the electricity bill', status: 'completed', completed_at: iso(-90), sort_order: 1 }),
  task({
    id: 'bbbbbbb1-0000-4000-8000-000000000002',
    title: 'Drop the library books back',
    status: 'completed',
    completed_at: iso(-60 * 5),
    origin: 'requested',
    creator_id: PARTNER_ID,
    family_id: FAMILY_ID,
    sort_order: 2,
  }),
  task({ id: 'bbbbbbb1-0000-4000-8000-000000000003', title: 'Book the dog groomer', status: 'completed', completed_at: iso(-60 * 26), sort_order: 3 }),
  task({ id: 'bbbbbbb1-0000-4000-8000-000000000004', title: 'Order the birthday cake', status: 'completed', completed_at: iso(-60 * 30), sort_order: 4 }),
  task({ id: 'bbbbbbb1-0000-4000-8000-000000000005', title: 'Swap the car tyres', status: 'cancelled', completed_at: iso(-60 * 52), sort_order: 5 }),
  task({ id: 'bbbbbbb1-0000-4000-8000-000000000006', title: 'Send the rental inspection form', status: 'completed', completed_at: iso(-60 * 74), sort_order: 6 }),
];

const ALL_TASKS = [...OPEN_TASKS, ...HISTORY_TASKS];

const FAMILY = {
  id: FAMILY_ID,
  name: 'The Realubits',
  invite_code: 'GOODAU',
  created_by: USER_ID,
  mode: 'family',
  created_at: iso(-60 * 24 * 120),
};

const MEMBER_ROWS = [
  { family_id: FAMILY_ID, user_id: USER_ID, profile_type: 'adult', role: 'owner', member_role: 'father', joined_at: iso(-60 * 24 * 120), profiles: { display_name: 'Jeric' } },
  { family_id: FAMILY_ID, user_id: PARTNER_ID, profile_type: 'adult', role: 'member', member_role: 'mother', joined_at: iso(-60 * 24 * 118), profiles: { display_name: 'Maria' } },
  { family_id: FAMILY_ID, user_id: CHILD_ID, profile_type: 'child', role: 'member', member_role: 'child', joined_at: iso(-60 * 24 * 90), profiles: { display_name: 'Noah' } },
];

const USER = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'jeric@example.com',
  email_confirmed_at: iso(-60 * 24 * 90),
  phone: '',
  confirmed_at: iso(-60 * 24 * 90),
  last_sign_in_at: iso(-5),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { display_name: 'Jeric' },
  identities: [],
  created_at: iso(-60 * 24 * 90),
  updated_at: iso(-5),
  is_anonymous: false,
};

const SESSION = {
  access_token: 'stub-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'stub-refresh-token',
  user: USER,
};

/** Answers a PostgREST/GoTrue request from the fixtures above. */
function respondFor(url, headers) {
  const { pathname, searchParams } = url;

  if (pathname.startsWith('/auth/v1/user')) return { body: USER };
  if (pathname.startsWith('/auth/v1/token')) return { body: SESSION };
  if (pathname.startsWith('/auth/v1/logout')) return { body: {} };

  if (pathname === '/rest/v1/tasks') {
    const id = searchParams.get('id');
    if (id) return { body: ALL_TASKS.filter((t) => t.id === id.replace('eq.', '')) };
    const status = searchParams.get('status');
    if (status === 'eq.open') return { body: OPEN_TASKS };
    return { body: HISTORY_TASKS };
  }

  if (pathname === '/rest/v1/profiles') {
    const id = (searchParams.get('id') ?? '').replace('eq.', '');
    return { body: PROFILES[id] ? [PROFILES[id]] : [] };
  }

  if (pathname === '/rest/v1/family_members') {
    // getMyGroups() issues two shapes against this table: the membership
    // lookup (embeds families) and the member roster (embeds profiles).
    const select = searchParams.get('select') ?? '';
    if (select.includes('families')) {
      return { body: [{ family_id: FAMILY_ID, role: 'owner', families: FAMILY }] };
    }
    return { body: MEMBER_ROWS };
  }

  if (pathname === '/rest/v1/notifications') {
    // getUnreadCount() is a HEAD with count=exact — the number rides in the
    // Content-Range header, not the body.
    return { body: [], headers: { 'content-range': '*/2' } };
  }

  if (pathname.startsWith('/rest/v1/rpc/')) {
    const fn = pathname.slice('/rest/v1/rpc/'.length);
    if (fn === 'is_app_admin') return { body: false };
    if (fn === 'app_user_stats') {
      return {
        body: [{ total_users: 1284, live_users: 37, solo_users: 741, one_group_users: 402, two_group_users: 141, live_window_seconds: 300 }],
      };
    }
    return { body: null };
  }

  return { body: [] };
}

function startServer() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.otf': 'font/otf' };
  const server = http.createServer(async (req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    try {
      const data = await readFile(path.join(distDir, rel));
      res.writeHead(200, { 'content-type': types[path.extname(rel)] ?? 'application/octet-stream' });
      res.end(data);
    } catch {
      // Expo web output is a single-page app: unknown paths are client routes.
      const data = await readFile(path.join(distDir, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(data);
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

// Navigate by driving the UI rather than by URL: a hard load of /group only
// re-runs the auth guard and lands back on Tasks, which silently produced
// five copies of the same screen. `expect` is asserted after each step so a
// wrong screen fails the run instead of shipping.
//
// Two screens are deliberately NOT captured here, because react-native-web
// renders them differently from Android and a screenshot that misrepresents
// the app is worse than one fewer screenshot:
//
//   - Group      the header title truncates and the Share button overflows
//                its row under the web layout engine.
//   - Task edit  the due-date field falls back to an HTML <input type="date">
//                with a browser date picker; Android uses the native
//                @react-native-community/datetimepicker.
//
// Capture those two on a device if you want them in the listing.
const SHOTS = [
  { name: '01-my-tasks', expect: 'Book the campsite for Easter', go: async () => {} },
  {
    // The reason the app exists rather than being another to-do list: tasks
    // someone in your group asked you to do, with their name on them.
    name: '02-requested',
    expect: 'Pick up the parcel',
    go: (page) => tap(page, 'Requested'),
    then: (page) => tap(page, 'Personal'),
  },
  { name: '03-history', expect: 'Pay the electricity bill', go: (page) => tap(page, 'History') },
  { name: '04-settings', expect: 'Privacy Policy', go: (page) => tap(page, 'Settings') },
];

const tap = (page, label) => page.getByText(label, { exact: true }).first().click();

async function main() {
  if (!existsSync(distDir)) {
    console.log('dist/ missing — running `expo export --platform web` first...');
    const r = spawnSync('npx', ['expo', 'export', '--platform', 'web'], { cwd: rootDir, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('expo export failed');
  }

  // Wipe first: renaming a shot would otherwise leave the old file behind and
  // it would be easy to upload a stale screen.
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch({ executablePath: findChrome() });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    colorScheme: 'light',
    locale: 'en-AU',
    timezoneId: 'Australia/Perth',
  });

  // Everything the app would send to Supabase is answered locally, so the
  // capture is hermetic: no network, no demo account, no live data.
  await context.route('**://*.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { body, headers } = respondFor(url, request.headers());

    // `.maybeSingle()` / `.single()` ask PostgREST for a bare object rather
    // than a one-element array via the Accept header.
    const wantsObject = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const payload = wantsObject && Array.isArray(body) ? (body[0] ?? null) : body;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', ...(headers ?? {}) },
      body: JSON.stringify(payload),
    });
  });

  // Seed the session before any app code runs, so the auth guard lets us
  // straight in and onAuthStateChange fires with a signed-in session.
  await context.addInitScript(
    ([key, session]) => {
      window.localStorage.setItem(key, JSON.stringify(session));
    },
    ['sb-cqzogkadiatpcvxgxqkc-auth-token', SESSION],
  );

  const page = await context.newPage();

  // The web build renders its own top tab bar (app-tabs.web.tsx) where
  // Android renders a native bottom bar (app-tabs.tsx via NativeTabs), so
  // that strip is the one thing on screen a phone would never show. Measure
  // it on the signed-in Tasks screen — it does not exist until the auth
  // guard has let us in — then grow the viewport by exactly that much and
  // crop it back off, so each shot is 1080x2160 of UI both platforms share
  // with nothing painted in to fill the gap.
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForTimeout(2500);
  const tabBarCss = await page.evaluate(() => {
    const label = [...document.querySelectorAll('div')].find(
      (el) => el.childElementCount === 0 && el.textContent?.trim() === 'Tasks',
    );
    if (!label) return 0;
    // Walk out to the row that holds every trigger: the first ancestor as
    // wide as the viewport is the tab list itself.
    let node = label;
    while (node.parentElement && node.getBoundingClientRect().width < window.innerWidth * 0.9) {
      node = node.parentElement;
    }
    return node.getBoundingClientRect().bottom;
  });
  if (!tabBarCss) throw new Error('Could not locate the web tab bar to crop it out');
  console.log(`Web-only tab strip: ${tabBarCss.toFixed(1)}px — growing viewport and cropping it off`);
  await page.setViewportSize({ width: VIEWPORT.width, height: VIEWPORT.height + Math.ceil(tabBarCss) });

  const written = [];

  for (const shot of SHOTS) {
    await shot.go(page);
    await page.waitForTimeout(1800);

    if (!(await page.getByText(shot.expect, { exact: false }).first().isVisible().catch(() => false))) {
      const seen = (await page.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\s+/g, ' ');
      throw new Error(`${shot.name}: expected "${shot.expect}" on screen but saw: ${seen}`);
    }

    const raw = await page.screenshot();
    const file = path.join(outDir, `${shot.name}.png`);
    // Play rejects screenshots carrying an alpha channel; these are fully
    // opaque already, so flatten only drops the unused channel.
    await sharp(raw)
      .extract({
        left: 0,
        top: Math.round(tabBarCss * SCALE),
        width: VIEWPORT.width * SCALE,
        height: VIEWPORT.height * SCALE,
      })
      .flatten({ background: '#ffffff' })
      .png()
      .toFile(file);
    written.push(file);
    console.log(`  ${shot.name}.png  (verified: "${shot.expect}")`);

    if (shot.then) await shot.then(page);
  }

  await browser.close();
  server.close();

  console.log(`\nWrote ${written.length} screenshots to docs/store/screenshots/`);
  for (const file of await readdir(outDir)) {
    const meta = await sharp(path.join(outDir, file)).metadata();
    console.log(`  ${file}  ${meta.width}x${meta.height}  ${meta.channels} channels`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
