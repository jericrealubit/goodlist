/**
 * Renders the illustrated phone screens used by docs/user-guide/README.md.
 *
 * Each screen is plain HTML styled with the app's real design tokens (the
 * default "Minimal Sage" theme in src/constants/themes.ts) and the real copy
 * from the matching screen in src/app, then shot with headless Chromium at a
 * 390x844 viewport and 2x scale.
 *
 * Usage:  node ./scripts/generate-guide-screens.mjs  (npm run guide:screens)
 *
 * Why illustrations and not captures of the running app: the guide documents
 * the phone app, and `expo start --web` renders src/components/app-tabs.web.tsx
 * — a floating pill nav pinned to the top, text labels, a dot for the unread
 * badge — instead of the bottom tab bar with icons and a numbered badge that
 * the guide walks readers through. Web captures would contradict the text they
 * sit next to, so don't swap these out for them. Real device captures are
 * welcome; keep the numbered red callouts, which are what make the steps
 * followable.
 *
 * Prefers Playwright's `headless_shell`, which honours --window-size exactly.
 * Full Chrome/Chromium clamps its headless viewport to a 500px minimum width
 * and subtracts window chrome from the height, which crops the frame. Override
 * the binary with $GOODLIST_CHROME; $PLAYWRIGHT_BROWSERS_PATH and PATH are
 * searched otherwise.
 *
 * The 390x844 viewport at 2x scale rasters to 780x1688 — a 2.164:1 aspect
 * ratio (too tall for Google Play's 2:1 phone-screenshot maximum) and below
 * its 1080px-per-side threshold for promotion eligibility. finishShot() below
 * upscales each capture ~1.5x (high-quality resampling — these are flat-color
 * CSS mockups, not photos, so upscale softness is minimal) then widens the
 * canvas to a 2:1 ratio with side bars in the mockup's own background color,
 * which already fills 100% of every screen — so the padding is invisible as
 * "padding" and no UI is ever clipped. Applies to all three output sets
 * (docs/user-guide/images, assets/images/guide, docs/screenshots).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'docs', 'user-guide', 'images');
// The same screens, palette-quantized, for the in-app guide at
// src/app/(app)/guide.tsx. Same width, so they stay crisp at the ~260pt the
// screen renders them at even on a 3x display; the quantization is what keeps
// the bundle cost down (flat UI colors, so it's visually lossless here).
const APP_DIR = join(ROOT, 'assets', 'images', 'guide');
const APP_PALETTE_COLORS = 256;
// Product shots for README.md: the same screens re-rendered with the teaching
// callouts suppressed, so they read as the app rather than as a tutorial.
const SHOWCASE_DIR = join(ROOT, 'docs', 'screenshots');
const SHOWCASE = ['05-my-list', '16-their-inbox', '11-invite-code', '17-settings'];

// ---------------------------------------------------------------------------
// Design tokens — mirrored from src/constants/themes.ts (minimalSage) and
// src/constants/style-variants.ts (AIRY_SPACING).
// ---------------------------------------------------------------------------
const C = {
  text: '#2B2E28',
  background: '#F5F1E6',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#E8E2D0',
  textSecondary: '#6B7A63',
  primary: '#7C9473',
  accent: '#5F7855',
  danger: '#C0392B',
  border: '#E3DCC8',
};
const S = { half: 3, one: 6, two: 12, three: 20, four: 28, five: 40, six: 72 };
const R = { sm: 12, md: 18, lg: 24, pill: 999 };

const CSS = `
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  /* Headless Chrome clamps its layout viewport to 500px wide, so the frame
     below — not the viewport — is what everything is measured against. */
  width: 390px; height: 844px; overflow: hidden;
  background: ${C.background}; color: ${C.text};
  font-family: 'Liberation Sans', 'DejaVu Sans', 'Noto Color Emoji', sans-serif;
  font-size: 16px; line-height: 24px; font-weight: 500;
  -webkit-font-smoothing: antialiased;
}
.screen { position: relative; display: flex; flex-direction: column;
  width: 390px; height: 844px; overflow: hidden; }

/* ---- status bar ---- */
.status { display: flex; align-items: center; justify-content: space-between;
  padding: 14px ${S.four}px 0; font-size: 13px; font-weight: 700; letter-spacing: .2px; }
.status .icons { display: flex; align-items: center; gap: 5px; }
.bar { width: 3px; background: ${C.text}; border-radius: 1px; }

/* ---- typography ---- */
.title { font-size: 40px; line-height: 46px; font-weight: 700; letter-spacing: -.5px; }
.subtitle { font-size: 28px; line-height: 36px; font-weight: 700; letter-spacing: -.3px; }
.header { font-size: 24px; line-height: 30px; font-weight: 700; }
.small { font-size: 14px; line-height: 20px; }
.bold { font-weight: 700; }
.muted { color: ${C.textSecondary}; }
.danger { color: ${C.danger}; }
.accent { color: ${C.accent}; }
.center { text-align: center; }

/* ---- modal nav header (task/[id], group/create, group/join) ---- */
.navhead { display: flex; align-items: center; padding: ${S.two}px ${S.four}px ${S.three}px;
  position: relative; }
.navhead .chev { font-size: 26px; line-height: 26px; color: ${C.primary}; }
.navhead .navtitle { position: absolute; left: 0; right: 0; text-align: center;
  font-size: 17px; font-weight: 700; }

/* ---- layout ---- */
.pagehead { padding: ${S.two}px ${S.four}px ${S.two}px; }
.body { flex: 1; min-height: 0; overflow: hidden; padding: 0 ${S.four}px;
  display: flex; flex-direction: column; gap: ${S.two}px; }
.body.pad { padding-top: ${S.three}px; }
.stack { display: flex; flex-direction: column; gap: ${S.three}px; }
.stack.tight { gap: ${S.two}px; }
.grow { flex: 1; }
.middle { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: ${S.two}px; text-align: center;
  padding: 0 ${S.three}px; }

/* ---- surfaces ---- */
.card { background: ${C.backgroundElement}; border-radius: ${R.lg}px;
  box-shadow: 0 4px 10px rgba(0,0,0,.10); }
.row { display: flex; align-items: center; gap: ${S.three}px; padding: ${S.three}px; }

/* ---- task row ---- */
.check { width: 26px; height: 26px; flex: none; border: 2px solid ${C.textSecondary};
  border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.check.done { background: ${C.accent}; border-color: ${C.accent}; color: #fff;
  font-size: 14px; font-weight: 700; }
.tasktext { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.tasktext .line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.strike { text-decoration: line-through; opacity: .6; }
.swipe { position: relative; overflow: hidden; border-radius: ${R.lg}px; background: ${C.accent}; }
.swipe .front { transform: translateX(96px); background: ${C.backgroundElement}; border-radius: ${R.lg}px; }
.swipe .done { position: absolute; left: 0; top: 0; bottom: 0; width: 96px; color: #fff;
  font-weight: 700; display: flex; align-items: center; justify-content: center; }

/* ---- controls ---- */
.btn { border-radius: ${R.sm}px; padding: ${S.three}px; text-align: center;
  font-size: 14px; line-height: 20px; font-weight: 700; }
.btn.primary { background: ${C.primary}; color: #fff; }
.btn.secondary { background: ${C.backgroundElement}; color: ${C.text}; box-shadow: 0 4px 10px rgba(0,0,0,.10); }
.btn.dangerbtn { background: ${C.danger}; color: #fff; }
.btnrow { display: flex; gap: ${S.two}px; }
.btnrow > * { flex: 1; }

.field { display: flex; flex-direction: column; gap: ${S.one}px; }
.input { background: ${C.backgroundElement}; border-radius: ${R.sm}px;
  padding: ${S.two}px ${S.three}px; font-size: 16px; line-height: 24px; min-height: 48px;
  display: flex; align-items: center; }
.input.ph { color: ${C.textSecondary}; }
.input.tall { min-height: 80px; align-items: flex-start; padding-top: ${S.two}px; }

.opt { background: ${C.backgroundElement}; border-radius: ${R.lg}px; padding: ${S.three}px;
  font-size: 16px; }
/* The create-group form is genuinely taller than one phone screen; this is the
   same layout with the scroll squeezed out so the whole flow fits one image. */
.dense .opt { padding: ${S.two}px ${S.three}px; }
.dense .stack { gap: ${S.two}px; }
.opt.sel { background: ${C.backgroundSelected}; font-size: 14px; font-weight: 700; }
.opt.swatched { display: flex; align-items: center; justify-content: space-between; }
.dots { display: flex; gap: ${S.half}px; }
.dot { width: 16px; height: 16px; border-radius: 999px; }
.optrow { display: flex; gap: ${S.two}px; }
.optrow > * { flex: 1; text-align: center; }

.invite { display: flex; align-items: center; justify-content: space-between; gap: ${S.two}px; }
.invite .code { font-size: 26px; line-height: 34px; font-weight: 700; letter-spacing: 3px; }
.pill { display: inline-flex; align-items: center; background: ${C.backgroundSelected};
  border-radius: 999px; padding: ${S.half}px ${S.two}px; font-size: 14px; color: ${C.textSecondary}; }

.switch { width: 51px; height: 31px; border-radius: 999px; background: ${C.primary};
  flex: none; position: relative; }
.switch::after { content: ''; position: absolute; top: 2px; right: 2px; width: 27px; height: 27px;
  border-radius: 999px; background: #fff; }

/* ---- compose bar ---- */
.compose { position: absolute; left: 0; right: 0; bottom: 96px; padding: 0 ${S.four}px;
  display: flex; align-items: center; gap: ${S.two}px; }
.compose .input { flex: 1; border-radius: 999px; box-shadow: 0 4px 10px rgba(0,0,0,.10); }
.send { width: 48px; height: 48px; flex: none; border-radius: 999px; background: ${C.primary};
  display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,.10); }

/* ---- tab bar ---- */
.tabs { flex: none; display: flex; align-items: flex-start; justify-content: space-around;
  padding: 10px 0 22px; background: ${C.background}; border-top: 1px solid ${C.border}; }
.tab { display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-size: 11px; font-weight: 700; color: ${C.textSecondary}; position: relative; width: 72px; }
.tab.on { color: ${C.text}; }
.badge { position: absolute; top: -4px; right: 16px; min-width: 18px; height: 18px;
  border-radius: 999px; background: ${C.danger}; color: #fff; font-size: 11px; line-height: 18px;
  text-align: center; padding: 0 5px; }

/* ---- annotations ---- */
.hi { position: relative; outline: 3px dashed ${C.danger}; outline-offset: 5px; }
.hi.inset { outline-offset: -7px; }
.hi.left::after { right: auto; left: -13px; }
.hi.inset::after { top: 4px; right: 8px; }
.hi::after { content: attr(data-step); position: absolute; top: -13px; right: -13px;
  width: 26px; height: 26px; border-radius: 999px; background: ${C.danger}; color: #fff;
  font-size: 14px; font-weight: 700; line-height: 26px; text-align: center; z-index: 5;
  /* halo so a badge that lands on a label still reads as an overlay */
  box-shadow: 0 0 0 3px ${C.background}; }
.note { position: absolute; left: ${S.four}px; right: ${S.four}px; background: ${C.text};
  color: ${C.background}; border-radius: ${R.sm}px; padding: 10px 14px; font-size: 13px;
  line-height: 18px; font-weight: 700; }
`;

// Suppresses the teaching callouts for the README product shots. Appended
// after the rules it overrides, so it wins without !important.
const CLEAN_CSS = `
.hi { outline: none; }
.hi::after { content: none; }
.note { display: none; }
`;

// --- tiny inline icons (stroke-only, matched to the tab bar's SF/Material set)
const ICONS = {
  tasks: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l2 2 3-3"/><path d="M3 14l2 2 3-3"/><path d="M11 6h10"/><path d="M11 14h10"/><path d="M11 20h10"/><path d="M3 20l2 2 3-3"/></svg>`,
  group: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>`,
  history: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`,
  settings: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>`,
  arrowUp: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`,
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------
// Emits `class` + `data-step` together: a second class attribute would be
// dropped by the parser, taking the highlight ring with it.
const mark = (base, step) => `class="${base}${step ? ' hi' : ''}"${step ? ` data-step="${step}"` : ''}`;

const statusBar = () => `
<div class="status"><span>9:41</span><span class="icons">
  <span class="bar" style="height:5px"></span><span class="bar" style="height:8px"></span>
  <span class="bar" style="height:11px"></span><span class="bar" style="height:14px"></span>
  <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="${C.text}" stroke-width="1.6" stroke-linecap="round"><path d="M1 4.2A10 10 0 0 1 15 4.2"/><path d="M3.6 6.9a6.4 6.4 0 0 1 8.8 0"/><circle cx="8" cy="10" r="1.1" fill="${C.text}" stroke="none"/></svg>
  <svg width="24" height="12" viewBox="0 0 24 12" fill="none"><rect x="1" y="1" width="19" height="10" rx="3" stroke="${C.text}" stroke-width="1.3"/><rect x="3" y="3" width="14" height="6" rx="1.5" fill="${C.text}"/><path d="M21.5 4.5v3" stroke="${C.text}" stroke-width="2" stroke-linecap="round"/></svg>
</span></div>`;

const tabBar = (active = 'tasks', badge = 0) => {
  const tab = (id, label) => `<div class="tab ${active === id ? 'on' : ''}">
    ${badge && id === 'tasks' ? `<span class="badge">${badge}</span>` : ''}
    ${ICONS[id]}<span>${label}</span></div>`;
  return `<div class="tabs">${tab('tasks', 'Tasks')}${tab('group', 'Group')}${tab('history', 'History')}${tab('settings', 'Settings')}</div>`;
};

const navHead = (title) =>
  `<div class="navhead"><span class="chev">&lsaquo;</span><span class="navtitle">${title}</span></div>`;

const pageHead = (text, sub, step) =>
  `<div class="pagehead"><div ${mark('header', step)}>${text}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>`;

const taskRow = ({ title, meta = [], done = false, checkbox = true, step, trailing = '' }) => `
<div ${mark('card row', step)}>
  ${checkbox ? `<div class="check ${done ? 'done' : ''}">${done ? '✓' : ''}</div>` : ''}
  <div class="tasktext">
    <div class="line ${done ? 'strike' : ''}">${title}</div>
    ${meta.map((m) => `<div class="small muted">${m}</div>`).join('')}
  </div>${trailing}
</div>`;

const btn = (label, variant = 'primary', step) =>
  `<div ${mark(`btn ${variant}`, step)}>${label}</div>`;

const field = (label, value, { placeholder = false, tall = false, step } = {}) => `
<div ${mark('field', step)}>
  <div class="small bold muted">${label}</div>
  <div class="input ${placeholder ? 'ph' : ''} ${tall ? 'tall' : ''}">${value}</div>
</div>`;

const opts = (list, { row = false, step } = {}) => `
<div ${mark(row ? 'optrow' : 'stack tight', step)}>
  ${list.map(([label, sel]) => `<div class="opt ${sel ? 'sel' : ''}">${label}</div>`).join('')}
</div>`;

const compose = (text, { placeholder = true, step } = {}) => `
<div class="compose">
  <div ${mark(`input ${placeholder ? 'ph' : ''}`, step)}>${text}</div>
  <div class="send">${ICONS.arrowUp}</div>
</div>`;

const note = (text, bottom = 150) => `<div class="note" style="bottom:${bottom}px">${text}</div>`;

// ---------------------------------------------------------------------------
// Screens — each mirrors a real file under src/app
// ---------------------------------------------------------------------------
const SCREENS = [
  {
    // src/app/(auth)/sign-up.tsx
    name: '01-create-account',
    html: `<div class="screen">${statusBar()}
      <div class="body pad" style="justify-content:center;gap:${S.five}px;padding-bottom:${S.six}px">
        <div class="center stack tight">
          <div class="subtitle">Create your account</div>
          <div class="muted">Start with your own Personal tasks. No group required.</div>
        </div>
        <div class="stack tight">
          ${field('Display name (optional)', 'Jamie', { placeholder: true })}
          ${field('Email', 'you@example.com', { placeholder: true })}
          ${field('Password', '••••••••', { placeholder: true })}
          ${field('Confirm password', '••••••••', { placeholder: true })}
          ${btn('Create account', 'primary', '1')}
        </div>
        <div class="center small bold" style="color:${C.primary}">Already have an account? Log in</div>
      </div></div>`,
  },
  {
    // src/app/(auth)/sign-in.tsx
    name: '02-log-in',
    html: `<div class="screen">${statusBar()}
      <div class="body pad" style="justify-content:center;gap:${S.five}px;padding-bottom:${S.six}px">
        <div class="center stack tight">
          <div style="width:72px;height:72px;margin:0 auto;border-radius:20px;background:${C.primary};display:flex;align-items:center;justify-content:center;color:#fff;font-size:34px;font-weight:700">G</div>
          <div class="title">Goodlist</div>
          <div class="muted">A better place for your everyday tasks.</div>
        </div>
        <div class="stack tight">
          ${field('Email', 'you@example.com', { placeholder: true })}
          ${field('Password', '••••••••', { placeholder: true })}
          ${btn('Log in', 'primary', '1')}
          <div class="center small muted">Forgot password?</div>
        </div>
        <div class="center small bold" style="color:${C.primary}">Create an account</div>
      </div></div>`,
  },
  {
    // src/app/(app)/(tabs)/index.tsx — no groups yet
    name: '03-solo-empty',
    html: `<div class="screen">${statusBar()}${pageHead('Solo mode')}
      <div class="middle">
        <div class="subtitle">Nothing on your list yet</div>
        <div class="muted">Type below to add your first Personal task.</div>
      </div>
      ${compose('I want to...', { step: '1' })}
      ${tabBar('tasks')}</div>`,
  },
  {
    name: '04-first-task',
    html: `<div class="screen">${statusBar()}${pageHead('Solo mode')}
      <div class="middle">
        <div class="subtitle">Nothing on your list yet</div>
        <div class="muted">Type below to add your first Personal task.</div>
      </div>
      <div class="compose">
        <div class="input">Buy milk</div>
        <div class="send hi" data-step="2">${ICONS.arrowUp}</div>
      </div>
      ${note('Type what you want to do, then tap the arrow.', 156)}
      ${tabBar('tasks')}</div>`,
  },
  {
    name: '05-my-list',
    html: `<div class="screen">${statusBar()}${pageHead('Solo mode')}
      <div class="body pad">
        ${taskRow({ title: 'Buy milk' })}
        ${taskRow({ title: 'Call the dentist', meta: ['Due Sep 9'] })}
        ${taskRow({ title: 'Water the plants' })}
        ${taskRow({ title: 'Take out the bins', done: true, meta: ['Completed Sep 7 at 9:12 AM'] })}
      </div>
      ${compose('I want to...')}
      ${tabBar('tasks')}</div>`,
  },
  {
    name: '06-swipe-done',
    html: `<div class="screen">${statusBar()}${pageHead('Solo mode')}
      <div class="body pad">
        <div class="hi" data-step="1" style="border-radius:${R.lg}px">
          <div class="swipe">
            <div class="done">✓ Done</div>
            <div class="front row"><div class="check"></div><div class="tasktext"><div class="line">Buy milk</div></div></div>
          </div>
        </div>
        ${taskRow({ title: 'Call the dentist', meta: ['Due Sep 9'] })}
        ${taskRow({ title: 'Water the plants' })}
      </div>
      ${note('Swipe a task to the right — or tap its circle — to finish it.', 156)}
      ${compose('I want to...')}
      ${tabBar('tasks')}</div>`,
  },
  {
    // src/app/(app)/task/[id].tsx — own personal task
    name: '07-task-details',
    html: `<div class="screen">${statusBar()}${navHead('Edit task')}
      <div class="body pad stack tight" style="gap:${S.three}px">
        ${field('Title', 'Buy milk')}
        ${field('Note (optional)', 'Whole milk, 2 litres', { tall: true, step: '1' })}
        ${field('Due date (optional)', 'Sep 9, 2026', { step: '2' })}
        ${btn('Save changes', 'primary', '3')}
        ${btn('Mark complete', 'secondary')}
        ${btn('Delete task', 'dangerbtn')}
      </div></div>`,
  },
  {
    // src/app/(app)/(tabs)/history.tsx
    name: '08-history',
    html: `<div class="screen">${statusBar()}${pageHead('Completed tasks')}
      <div class="body">
        <div style="padding-bottom:${S.two}px">${btn('Delete all', 'secondary')}</div>
        ${taskRow({
          title: 'Take out the bins',
          done: true,
          meta: ['Completed Sep 7 at 9:12 AM'],
          step: '1',
          trailing: `<div style="display:flex;gap:8px"><div style="width:34px;height:34px;border-radius:10px;border:1px solid ${C.border};display:flex;align-items:center;justify-content:center;font-size:16px">↺</div><div style="width:34px;height:34px;border-radius:10px;border:1px solid ${C.border};display:flex;align-items:center;justify-content:center;font-size:15px;color:${C.danger}">🗑</div></div>`,
        })}
        ${taskRow({
          title: 'Buy milk',
          done: true,
          meta: ['Completed Sep 6 at 5:40 PM'],
          trailing: `<div style="display:flex;gap:8px"><div style="width:34px;height:34px;border-radius:10px;border:1px solid ${C.border};display:flex;align-items:center;justify-content:center;font-size:16px">↺</div><div style="width:34px;height:34px;border-radius:10px;border:1px solid ${C.border};display:flex;align-items:center;justify-content:center;font-size:15px;color:${C.danger}">🗑</div></div>`,
        })}
      </div>
      ${note('↺ puts a task back on your list. 🗑 removes it for good.', 130)}
      ${tabBar('history')}</div>`,
  },
  {
    // src/app/(app)/(tabs)/group.tsx — no groups yet
    name: '09-group-solo',
    html: `<div class="screen">${statusBar()}
      <div class="middle">
        <div style="font-size:40px">🌱</div>
        <div class="subtitle">You&rsquo;re using Goodlist solo</div>
        <div class="muted">Add a partner or child later to start sharing Requested tasks. Your Personal tasks stay exactly as they are when you do.</div>
        <div class="stack tight" style="align-self:stretch;margin-top:${S.two}px">
          ${btn('Create a group', 'primary', '1')}
          ${btn('Join a group', 'secondary')}
        </div>
      </div>
      ${tabBar('group')}</div>`,
  },
  {
    // src/app/(app)/group/create.tsx
    name: '10-create-group',
    html: `<div class="screen">${statusBar()}${navHead('Create group')}
      <div class="body pad stack dense" style="gap:${S.two}px">
        <div class="muted">Give your group a name. You can invite others once it&rsquo;s created.</div>
        ${field('Group name', 'The Smiths', { step: '1' })}
        <div class="small bold muted">Is this a family or a team?</div>
        ${opts([['Family', true], ['Team', false]], { row: true, step: '2' })}
        <div class="small bold muted">Your role</div>
        ${opts([['Father', false], ['Mother', true], ['Guardian', false], ['Child', false], ['Other', false]], { step: '3' })}
        ${btn('Create group', 'primary', '4')}
      </div></div>`,
  },
  {
    // src/app/(app)/(tabs)/group.tsx — one group, you are owner
    name: '11-invite-code',
    html: `<div class="screen">${statusBar()}${pageHead('Groups')}
      <div class="body">
        <div class="card" style="padding:${S.four}px;display:flex;flex-direction:column;gap:${S.three}px">
          <div>
            <div style="display:flex;align-items:center;gap:${S.two}px">
              <div class="subtitle">The Smiths</div><div class="pill">Family</div>
            </div>
            <div class="muted">1 member</div>
          </div>
          <div class="invite">
            <div class="hi" data-step="1">
              <div class="small bold muted">Invite code</div>
              <div class="code">ABCD2345</div>
            </div>
            <div class="btn secondary" style="padding:${S.two}px ${S.three}px">Share</div>
          </div>
          ${btn('Rename Group', 'secondary')}
          <div class="small bold muted">Members</div>
          <div class="card row" style="border-radius:${R.lg}px">
            <div class="tasktext"><div class="line">Jamie (You)</div></div>
            <div class="small muted">Mother · Owner</div>
          </div>
          ${btn('Leave household', 'dangerbtn')}
        </div>
      </div>
      ${tabBar('group')}</div>`,
  },
  {
    // src/app/(app)/group/join.tsx — step 1
    name: '12-join-code',
    html: `<div class="screen">${statusBar()}${navHead('Join group')}
      <div class="body pad stack" style="gap:${S.three}px">
        <div class="muted">Enter the invite code a group member shared with you.</div>
        ${field('Invite code', 'ABCD2345', { step: '1' })}
        ${btn('Continue', 'primary', '2')}
      </div>
      ${note('This is what the <b>other person</b> does on their own phone.', 420)}
      </div>`,
  },
  {
    // src/app/(app)/group/join.tsx — step 2
    name: '13-join-role',
    html: `<div class="screen">${statusBar()}${navHead('Join group')}
      <div class="body pad stack" style="gap:${S.three}px">
        <div class="subtitle">The Smiths</div>
        <div class="muted">This is a Family. Choose your role.</div>
        ${opts([['Father', true], ['Mother', false], ['Guardian', false], ['Child', false], ['Other', false]], { step: '1' })}
        ${btn('Join group', 'primary', '2')}
        ${btn('Back', 'secondary')}
      </div></div>`,
  },
  {
    // src/app/(app)/(tabs)/index.tsx — with a group: Personal / Requested
    name: '14-requested-tab',
    html: `<div class="screen">${statusBar()}${pageHead('The Smiths')}
      <div style="padding:0 ${S.four}px ${S.three}px">${opts([['Personal', false], ['Requested', true]], { row: true, step: '1' })}</div>
      <div class="middle">
        <div class="subtitle">No requests yet</div>
        <div class="muted">Type below to request a task from a group member.</div>
      </div>
      <div class="compose">
        <div class="input">Please pick up the kids</div>
        <div class="send hi" data-step="2">${ICONS.arrowUp}</div>
      </div>
      ${note('Same box as before — it just says &ldquo;Ask for...&rdquo; now.', 156)}
      ${tabBar('tasks')}</div>`,
  },
  {
    name: '15-request-sent',
    html: `<div class="screen">${statusBar()}${pageHead('The Smiths')}
      <div style="padding:0 ${S.four}px ${S.three}px">${opts([['Personal', false], ['Requested', true]], { row: true })}</div>
      <div class="body">
        ${taskRow({ title: 'Please pick up the kids', meta: ['To Alex'], checkbox: false, step: '1' })}
        ${taskRow({ title: 'Book the car service', meta: ['To Alex'], checkbox: false })}
      </div>
      ${note('&ldquo;To Alex&rdquo; means you asked Alex. Tap it to add a note or cancel.', 156)}
      ${compose('Ask for...')}
      ${tabBar('tasks')}</div>`,
  },
  {
    name: '16-their-inbox',
    html: `<div class="screen">${statusBar()}${pageHead('The Smiths')}
      <div style="padding:0 ${S.four}px ${S.three}px">${opts([['Personal', false], ['Requested', true]], { row: true })}</div>
      <div class="body">
        ${taskRow({ title: 'Please pick up the kids', meta: ['From Jamie'], step: '2' })}
        ${taskRow({ title: 'Book the car service', meta: ['From Jamie'] })}
      </div>
      ${note('On Alex&rsquo;s phone: a red number on Tasks, and &ldquo;From Jamie&rdquo;.', 156)}
      ${compose('Ask for...')}
      <div class="hi inset" data-step="1">${tabBar('tasks', 2)}</div></div>`,
  },
  {
    // src/app/(app)/(tabs)/settings.tsx
    name: '17-settings',
    html: `<div class="screen">${statusBar()}
      <div class="body pad stack" style="gap:${S.four}px">
        ${field('Display name', 'Jamie', { step: '1' })}
        ${field('Email', 'jamie@example.com')}
        ${btn('Save', 'primary')}
        <div class="stack tight">
          <div class="small bold muted">Theme</div>
          <div class="stack tight hi" data-step="2">
            <div class="opt sel swatched"><span>Minimal Sage</span><span class="dots">
              ${['#7C9473', '#5F7855', '#F5F1E6'].map((c) => `<span class="dot" style="background:${c}"></span>`).join('')}
            </span></div>
            <div class="opt swatched"><span>Dark Neon</span><span class="dots">
              ${['#7C3AED', '#22D3EE', '#000000'].map((c) => `<span class="dot" style="background:${c}"></span>`).join('')}
            </span></div>
          </div>
        </div>
        <div class="stack tight">
          <div class="small bold muted">Privacy</div>
          <div style="display:flex;align-items:center;gap:${S.three}px">
            <div style="flex:1"><div class="small">Share my country and time zone</div>
            <div class="small muted">Helps us see which countries Goodlist is used in.</div></div>
            <div class="switch"></div>
          </div>
        </div>
        ${btn('Sign out', 'dangerbtn')}
      </div>
      ${tabBar('settings')}</div>`,
  },
];

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function findChrome() {
  const explicit = process.env.GOODLIST_CHROME || process.env.CHROME_PATH;
  if (explicit && existsSync(explicit)) return explicit;

  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (base && existsSync(base)) {
    const dirs = readdirSync(base);
    // headless_shell first — see the note at the top of this file.
    for (const [prefix, binary] of [
      ['chromium_headless_shell', 'headless_shell'],
      ['chromium', 'chrome'],
    ]) {
      for (const entry of dirs) {
        const candidate = join(base, entry, 'chrome-linux', binary);
        if (entry.startsWith(prefix) && existsSync(candidate)) return candidate;
      }
    }
  }

  for (const name of ['headless_shell', 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    try {
      const found = execFileSync('which', [name], { encoding: 'utf8' }).trim();
      if (found) return found;
    } catch {
      /* keep looking */
    }
  }
  throw new Error('No Chromium found. Set $GOODLIST_CHROME to a Chrome/Chromium binary.');
}

const chrome = findChrome();
const work = mkdtempSync(join(tmpdir(), 'goodlist-guide-'));
mkdirSync(OUT_DIR, { recursive: true });

// Google Play's phone-screenshot rules: max 2:1 longer:shorter side ratio,
// and >=1080px on the shorter side to qualify for promotion eligibility.
// UPSCALE clears the 1080px floor after MAX_ASPECT padding narrows the
// margin; see the header comment above for why upscale + pad, not a reshoot.
const MAX_ASPECT = 2;
const UPSCALE = 1.5;

async function finishShot(path) {
  const buf = readFileSync(path);
  const meta = await sharp(buf).metadata();
  const upscaled = await sharp(buf)
    .resize(Math.round(meta.width * UPSCALE), Math.round(meta.height * UPSCALE), { kernel: 'lanczos3' })
    .toBuffer();
  const { width, height } = await sharp(upscaled).metadata();
  const targetWidth = Math.ceil(height / MAX_ASPECT);
  const extra = Math.max(0, targetWidth - width);
  const left = Math.floor(extra / 2);
  const right = extra - left;
  const out = await sharp(upscaled)
    .extend({ left, right, top: 0, bottom: 0, background: C.background })
    .png()
    .toBuffer();
  writeFileSync(path, out);
}

function shoot(screen, outPath, extraCss = '') {
  const page = join(work, `${screen.name}${extraCss ? '-clean' : ''}.html`);
  writeFileSync(page, `<meta charset="utf-8"><style>${CSS}${extraCss}</style>${screen.html}`);
  execFileSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      '--window-size=390,844',
      `--screenshot=${outPath}`,
      page,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  );
}

for (const screen of SCREENS) {
  const outPath = join(OUT_DIR, `${screen.name}.png`);
  shoot(screen, outPath);
  await finishShot(outPath);
  console.log(`✓ ${screen.name}.png`);
}

console.log(`\n${SCREENS.length} screens written to docs/user-guide/images/`);

// --- bundled copies for the in-app guide -----------------------------------
mkdirSync(APP_DIR, { recursive: true });
let bundled = 0;
for (const screen of SCREENS) {
  const out = join(APP_DIR, `${screen.name}.png`);
  const buf = await sharp(readFileSync(join(OUT_DIR, `${screen.name}.png`)))
    .png({ palette: true, colours: APP_PALETTE_COLORS, compressionLevel: 9, effort: 10 })
    .toBuffer();
  writeFileSync(out, buf);
  bundled += buf.length;
}
console.log(
  `${SCREENS.length} screens written to assets/images/guide/ (${(bundled / 1024).toFixed(0)} KB bundled)`,
);

// --- callout-free product shots for README.md ------------------------------
mkdirSync(SHOWCASE_DIR, { recursive: true });
for (const name of SHOWCASE) {
  const screen = SCREENS.find((s) => s.name === name);
  if (!screen) throw new Error(`SHOWCASE names a screen that doesn't exist: ${name}`);
  const raw = join(work, `${name}-showcase.png`);
  shoot(screen, raw, CLEAN_CSS);
  await finishShot(raw);
  const buf = await sharp(readFileSync(raw))
    .png({ palette: true, colours: APP_PALETTE_COLORS, compressionLevel: 9, effort: 10 })
    .toBuffer();
  writeFileSync(join(SHOWCASE_DIR, `${name}.png`), buf);
}
console.log(`${SHOWCASE.length} product shots written to docs/screenshots/`);

rmSync(work, { recursive: true, force: true });
