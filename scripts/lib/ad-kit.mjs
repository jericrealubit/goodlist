/**
 * Shared kit for the Facebook ads in scripts/ads/: brand palette, the flat
 * SVG cast, the comic-page CSS and the headless-Chromium renderer.
 *
 * Colours are the brand navy/green plus the default "Minimal Sage" app tokens
 * (src/constants/themes.ts), so phone mockups match the real Meds and
 * Calendar screens. Same pipeline as generate-guide-screens.mjs: plain HTML
 * shot with headless Chromium at 2x, then compressed with sharp.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = join(ROOT, 'docs', 'marketing');
// Laid out at half size and shot at 2x, so strokes and text stay crisp.
export const W = 540;
export const H = 675;

export const C = {
  navy: '#072655',
  green: '#2E9E4F',
  cream: '#F5F1E6',
  paper: '#FBF8F0',
  sage: '#7C9473',
  sageDark: '#5F7855',
  sageText: '#6B7A63',
  text: '#2B2E28',
  border: '#E3DCC8',
  danger: '#C0392B',
  skin: '#EDBE98',
  skinShade: '#D9A47E',
  skin2: '#E3A984',
  skin2Shade: '#C98E6A',
  grey: '#CDD1D6',
  greyDark: '#9CA3AB',
  cardigan: '#8A6A46',
  shirt: '#BFD6EA',
  blouse: '#C8646E',
  blouseDark: '#A94F59',
  ink: '#2B2E28',
};

export const logo = `data:image/png;base64,${readFileSync(join(ROOT, 'assets', 'images', 'goodlist-logo-horizontal.png')).toString('base64')}`;
// ---------------------------------------------------------------------------
// Characters — head centre at (0,0), bust down to y=120.
// ---------------------------------------------------------------------------
export function man(mood) {
  const brows =
    mood === 'confused'
      ? `<path d="M-19 -14 Q-12 -20 -4 -15" /><path d="M4 -11 Q12 -12 19 -9" />`
      : mood === 'tired'
        ? `<path d="M-19 -11 Q-12 -13 -5 -17" /><path d="M5 -17 Q12 -13 19 -11" />`
        : `<path d="M-19 -13 Q-12 -18 -4 -14" /><path d="M4 -14 Q12 -18 19 -13" />`;
  const eyes =
    mood === 'happy'
      ? `<path d="M-14 1 Q-11 -3 -8 1" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>
         <path d="M8 1 Q11 -3 14 1" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`
      : mood === 'tired'
        ? `<circle cx="-11" cy="1.5" r="2.1" fill="${C.ink}"/><circle cx="11" cy="1.5" r="2.1" fill="${C.ink}"/>
           <path d="M-15 0 Q-11 -2 -7 0 M7 0 Q11 -2 15 0" fill="none" stroke="${C.skinShade}" stroke-width="2.2" stroke-linecap="round"/>
           <path d="M-15 6 Q-11 8.5 -7 6 M7 6 Q11 8.5 15 6" fill="none" stroke="#B98A74" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>`
        : `<circle cx="-11" cy="0" r="2.3" fill="${C.ink}"/><circle cx="11" cy="0" r="2.3" fill="${C.ink}"/>`;
  const mouth =
    mood === 'happy'
      ? `<path d="M-8 22 Q0 30 8 22 Z" fill="#8C3B3B"/>`
      : mood === 'confused'
        ? `<path d="M-6 25 Q-1 22 3 25 Q6 27 8 24" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>`
        : mood === 'tired'
          ? `<path d="M-6 26 Q0 22.5 6 26" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>`
        : `<path d="M-6 24 Q0 27 6 24" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>`;
  return `
  <g>
    <path d="M-52 122 L-52 76 Q-52 42 -20 37 L20 37 Q52 42 52 76 L52 122 Z" fill="${C.cardigan}"/>
    <path d="M-15 37 L0 66 L15 37 Z" fill="${C.shirt}"/>
    <path d="M-15 37 L-6 48 L0 40 L6 48 L15 37" fill="#fff" opacity=".85"/>
    <path d="M-15 37 L0 66 L0 122" fill="none" stroke="#6E5337" stroke-width="2"/>
    <circle cx="4" cy="80" r="2.2" fill="#E9D8BD"/><circle cx="4" cy="96" r="2.2" fill="#E9D8BD"/><circle cx="4" cy="112" r="2.2" fill="#E9D8BD"/>
    <rect x="-9" y="24" width="18" height="15" rx="4" fill="${C.skinShade}"/>
    <circle cx="-29" cy="4" r="7" fill="${C.skinShade}"/><circle cx="29" cy="4" r="7" fill="${C.skinShade}"/>
    <ellipse cx="0" cy="0" rx="28" ry="32" fill="${C.skin}"/>
    <path d="M-29 8 Q-35 -22 -16 -29 Q-25 -14 -23 6 Z" fill="${C.grey}"/>
    <path d="M29 8 Q35 -22 16 -29 Q25 -14 23 6 Z" fill="${C.grey}"/>
    <path d="M-10 -31 Q-4 -37 2 -32 Q7 -37 12 -30" fill="none" stroke="${C.grey}" stroke-width="3" stroke-linecap="round"/>
    <g fill="none" stroke="${C.greyDark}" stroke-width="3.2" stroke-linecap="round">${brows}</g>
    ${eyes}
    <g fill="#fff" fill-opacity=".25" stroke="#3A3A3A" stroke-width="2">
      <circle cx="-11" cy="0" r="8.5"/><circle cx="11" cy="0" r="8.5"/>
    </g>
    <path d="M-2.5 0 Q0 -3 2.5 0 M-19.5 -1 L-27 -3 M19.5 -1 L27 -3" fill="none" stroke="#3A3A3A" stroke-width="2"/>
    <path d="M1 5 Q-4 14 2 15" fill="none" stroke="${C.skinShade}" stroke-width="2" stroke-linecap="round"/>
    <path d="M-13 19 Q0 12 13 19 Q7 22.5 0 19.5 Q-7 22.5 -13 19 Z" fill="${C.grey}"/>
    ${mouth}
    ${mood === 'happy' ? `<circle cx="-18" cy="13" r="4.5" fill="#E88A8A" opacity=".45"/><circle cx="18" cy="13" r="4.5" fill="#E88A8A" opacity=".45"/>` : ''}
  </g>`;
}

export function woman(mood) {
  const eyes =
    mood === 'happy'
      ? `<path d="M-13 2 Q-10 -2 -7 2" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>
         <path d="M7 2 Q10 -2 13 2" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`
      : `<circle cx="-10" cy="1" r="2.4" fill="${C.ink}"/><circle cx="10" cy="1" r="2.4" fill="${C.ink}"/>
         <path d="M-14 -2 L-12 -4 M14 -2 L12 -4" stroke="${C.ink}" stroke-width="1.4" stroke-linecap="round"/>`;
  return `
  <g>
    <path d="M-48 122 L-48 78 Q-48 44 -18 38 L18 38 Q48 44 48 78 L48 122 Z" fill="${C.blouse}"/>
    <path d="M-16 38 Q0 54 16 38" fill="${C.skin2}"/>
    <path d="M-17 38 Q0 58 17 38" fill="none" stroke="${C.blouseDark}" stroke-width="3"/>
    <path d="M-15 42 Q0 58 15 42" fill="none" stroke="#F3EBDD" stroke-width="2" stroke-dasharray="0.1 5" stroke-linecap="round"/>
    <rect x="-8" y="24" width="16" height="16" rx="4" fill="${C.skin2Shade}"/>
    <circle cx="0" cy="-37" r="14" fill="${C.grey}"/>
    <circle cx="0" cy="-37" r="14" fill="none" stroke="${C.greyDark}" stroke-width="1.2" opacity=".6"/>
    <circle cx="-26" cy="5" r="6" fill="${C.skin2Shade}"/><circle cx="26" cy="5" r="6" fill="${C.skin2Shade}"/>
    <circle cx="-26" cy="13" r="3" fill="#FFFDF7" stroke="#D8CDB8" stroke-width=".8"/><circle cx="26" cy="13" r="3" fill="#FFFDF7" stroke="#D8CDB8" stroke-width=".8"/>
    <ellipse cx="0" cy="1" rx="25" ry="29" fill="${C.skin2}"/>
    <path d="M-28 10 Q-33 -30 0 -30 Q33 -30 28 10 Q26 -12 14 -17 Q4 -8 -12 -14 Q-24 -12 -28 10 Z" fill="${C.grey}"/>
    <path d="M-12 -14 Q-2 -20 14 -17" fill="none" stroke="${C.greyDark}" stroke-width="1.2" opacity=".6"/>
    <g fill="none" stroke="${C.greyDark}" stroke-width="2.4" stroke-linecap="round">
      <path d="M-16 -8 Q-10 -11 -5 -8"/><path d="M5 -8 Q10 -11 16 -8"/>
    </g>
    ${eyes}
    <path d="M0 5 Q-3 12 2 13" fill="none" stroke="${C.skin2Shade}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="-15" cy="12" r="5" fill="#E86F7C" opacity=".35"/><circle cx="15" cy="12" r="5" fill="#E86F7C" opacity=".35"/>
    <path d="M-8 19 Q0 27 8 19 Q0 22 -8 19 Z" fill="#B5434F"/>
  </g>`;
}

// Face parts shared by the younger cast. Moods: neutral | worried | happy.
function youngFace(mood, hairColor) {
  const brows =
    mood === 'worried'
      ? `<path d="M-17 -10 Q-11 -12 -5 -16" /><path d="M5 -16 Q11 -12 17 -10" />`
      : `<path d="M-17 -11 Q-11 -15 -5 -12" /><path d="M5 -12 Q11 -15 17 -11" />`;
  const eyes =
    mood === 'happy'
      ? `<path d="M-13 1 Q-10 -3 -7 1" fill="none" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/>
         <path d="M7 1 Q10 -3 13 1" fill="none" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/>`
      : `<circle cx="-10" cy="0" r="2.6" fill="${C.ink}"/><circle cx="10" cy="0" r="2.6" fill="${C.ink}"/>`;
  const mouth =
    mood === 'happy'
      ? `<path d="M-8 15 Q0 24 8 15 Z" fill="#8C3B3B"/>`
      : mood === 'worried'
        ? `<path d="M-6 19 Q0 15.5 6 19" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>`
        : `<path d="M-6 17 Q0 21 6 17" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>`;
  return `
    <g fill="none" stroke="${hairColor}" stroke-width="3" stroke-linecap="round">${brows}</g>
    ${eyes}
    <path d="M0 3 Q-3 10 2 11" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2" stroke-linecap="round"/>
    ${mouth}`;
}

/** The son: about thirty, short dark hair, light stubble, navy polo. */
export function son(mood) {
  const hair = '#2F2622';
  return `
  <g>
    <path d="M-50 122 L-50 74 Q-50 42 -20 36 L20 36 Q50 42 50 74 L50 122 Z" fill="#1F3F7A"/>
    <path d="M-16 36 L0 50 L16 36 L10 33 L0 42 L-10 33 Z" fill="#2E5597"/>
    <path d="M0 50 V70" stroke="#16305E" stroke-width="2"/>
    <circle cx="0" cy="58" r="1.8" fill="#D6E0F0"/><circle cx="0" cy="66" r="1.8" fill="#D6E0F0"/>
    <rect x="-9" y="22" width="18" height="16" rx="4" fill="${C.skin2Shade}"/>
    <circle cx="-26" cy="3" r="6.5" fill="${C.skin2Shade}"/><circle cx="26" cy="3" r="6.5" fill="${C.skin2Shade}"/>
    <ellipse cx="0" cy="0" rx="25" ry="29" fill="${C.skin2}"/>
    <path d="M-20 12 Q-18 28 0 29 Q18 28 20 12 Q14 22 0 22 Q-14 22 -20 12 Z" fill="${hair}" opacity=".16"/>
    <path d="M-27 4 Q-31 -32 0 -32 Q31 -32 27 4 Q25 -14 16 -19 Q2 -12 -14 -20 Q-24 -14 -27 4 Z" fill="${hair}"/>
    <path d="M-16 -29 Q-4 -40 14 -31 Q4 -33 -4 -26 Z" fill="${hair}"/>
    ${youngFace(mood, hair)}
  </g>`;
}

/** The friend: dark ponytail, green top. */
export function friend(mood) {
  const hair = '#3B2A22';
  const skin = '#C98E6A';
  const shade = '#AE7654';
  return `
  <g>
    <path d="M22 -18 Q52 -10 44 34 Q40 50 30 54 Q38 20 18 -6 Z" fill="${hair}"/>
    <path d="M-46 122 L-46 76 Q-46 42 -17 37 L17 37 Q46 42 46 76 L46 122 Z" fill="${C.green}"/>
    <path d="M-15 37 Q0 50 15 37" fill="${skin}"/>
    <path d="M-16 37 Q0 53 16 37" fill="none" stroke="#237A3D" stroke-width="3"/>
    <rect x="-8" y="22" width="16" height="17" rx="4" fill="${shade}"/>
    <circle cx="-24" cy="4" r="6" fill="${shade}"/><circle cx="24" cy="4" r="6" fill="${shade}"/>
    <circle cx="-24" cy="12" r="2.6" fill="#F4C542"/><circle cx="24" cy="12" r="2.6" fill="#F4C542"/>
    <ellipse cx="0" cy="0" rx="23" ry="28" fill="${skin}"/>
    <path d="M-25 8 Q-30 -32 2 -31 Q30 -30 25 6 Q22 -14 8 -18 Q-6 -10 -18 -14 Q-24 -8 -25 8 Z" fill="${hair}"/>
    <circle cx="-14" cy="11" r="4.5" fill="#E86F7C" opacity=".3"/><circle cx="14" cy="11" r="4.5" fill="#E86F7C" opacity=".3"/>
    ${youngFace(mood, hair)}
  </g>`;
}

// A hand is just a skin-coloured rounded blob at the end of a sleeve.
export const hand = (x, y, fill, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;

export function phoneSmall(x, y, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="-17" y="-30" width="34" height="60" rx="6" fill="#1E2330"/>
    <rect x="-14" y="-26" width="28" height="52" rx="3" fill="${C.cream}"/>
    <rect x="-11" y="-21" width="22" height="10" rx="2.5" fill="#fff"/>
    <circle cx="-7" cy="-16" r="2.4" fill="${C.sage}"/>
    <rect x="-3" y="-17.5" width="11" height="3" rx="1.5" fill="${C.sageText}"/>
    <g fill="${C.sage}">
      ${[0, 1, 2, 3]
        .map((col) => [0, 1, 2].map((row) => `<circle cx="${-8 + col * 5.4}" cy="${-4 + row * 6}" r="1.6"/>`).join(''))
        .join('')}
    </g>
    <circle cx="8.2" cy="8" r="1.6" fill="${C.danger}"/>
    <rect x="-8" y="16" width="16" height="6" rx="3" fill="${C.sage}"/>
  </g>`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
  body {
    font-family: 'Liberation Sans', 'DejaVu Sans', 'Noto Color Emoji', sans-serif;
    background: ${C.cream};
    color: ${C.text};
    -webkit-font-smoothing: antialiased;
  }
  .head {
    background: ${C.navy};
    color: #fff;
    padding: 16px 20px 18px;
    height: 104px;
    position: relative;
    overflow: hidden;
  }
  .head::after {
    content: ''; position: absolute; right: -30px; top: -40px; width: 150px; height: 150px;
    border-radius: 50%; background: ${C.green}; opacity: .18;
  }
  .kicker { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #9ED7AE; }
  .head h1 { font-size: 30px; line-height: 1.08; margin-top: 6px; letter-spacing: -.01em; }
  .head h1 em { font-style: normal; color: #7BD493; }

  .grid {
    position: absolute; left: 12px; right: 12px; top: 114px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  }
  .panel {
    position: relative; background: #fff; border: 3px solid ${C.navy}; border-radius: 14px;
    overflow: hidden; height: 242px;
  }
  .panel svg { display: block; position: absolute; left: 0; bottom: 0; }
  .panel.wide { grid-column: 1 / 3; height: 230px; }
  .num {
    position: absolute; left: 8px; top: 8px; z-index: 2;
    width: 22px; height: 22px; border-radius: 50%; background: ${C.navy}; color: #fff;
    font-size: 12px; font-weight: 700; display: grid; place-items: center;
  }
  .cap {
    position: absolute; left: 36px; top: 8px; right: 8px; z-index: 2;
    font-size: 11.5px; font-weight: 700; color: ${C.navy}; line-height: 1.2; padding-top: 4px;
  }
  .bubble {
    position: absolute; z-index: 3; background: #fff; border: 2.5px solid ${C.navy};
    border-radius: 14px; padding: 7px 10px; font-size: 12.5px; line-height: 1.22; font-weight: 700;
    color: ${C.text};
  }
  .bubble::after, .bubble::before {
    content: ''; position: absolute; width: 0; height: 0; border-style: solid;
  }
  .bubble.tl::before { left: 18px; bottom: -13px; border-width: 13px 10px 0 0; border-color: ${C.navy} transparent transparent; }
  .bubble.tl::after  { left: 20.5px; bottom: -8.5px; border-width: 9px 7px 0 0; border-color: #fff transparent transparent; }
  .bubble.tr::before { right: 22px; bottom: -13px; border-width: 13px 0 0 10px; border-color: ${C.navy} transparent transparent; }
  .bubble.tr::after  { right: 24.5px; bottom: -8.5px; border-width: 9px 0 0 7px; border-color: #fff transparent transparent; }
  .thought { border-radius: 22px; font-style: italic; }
  .hl { color: ${C.green}; }
  .miss { color: ${C.danger}; }

  .p3-scene { position: absolute; left: 0; bottom: 0; }
  .p3-phone { position: absolute; right: 18px; top: 8px; width: 111px; height: 222px; transform: rotate(4deg); filter: drop-shadow(0 6px 10px rgba(7,38,85,.25)); }
  .p3-phone svg { position: static; width: 111px; height: 222px; }
  .tags { position: absolute; left: 198px; top: 92px; display: flex; flex-direction: column; gap: 8px; z-index: 2; }
  .tag {
    display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: ${C.navy};
    background: #fff; border: 2px solid ${C.navy}; border-radius: 999px; padding: 5px 10px 5px 6px; white-space: nowrap;
  }
  .dot { width: 16px; height: 16px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 10px; flex: none; }

  .foot {
    position: absolute; left: 0; right: 0; bottom: 0; height: 78px; background: #fff;
    border-top: 1px solid ${C.border};
    display: flex; align-items: center; justify-content: space-between; padding: 0 18px;
  }
  .foot img { height: 34px; display: block; }
  .foot .sub { font-size: 10.5px; color: ${C.sageText}; margin-top: 5px; font-weight: 700; }
  .cta {
    background: ${C.green}; color: #fff; font-weight: 700; font-size: 14px; border-radius: 999px;
    padding: 11px 18px; box-shadow: 0 3px 0 #237A3D; white-space: nowrap;
  }
  .cta small { display: block; font-size: 9px; font-weight: 700; opacity: .9; letter-spacing: .06em; text-transform: uppercase; }`;

/** A full 540x675 ad page: shared comic CSS plus any per-ad rules. */
export const page = ({ title, css = '', body }) => `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>${CSS}${css}</style></head>
<body>
${body}
</body></html>`;

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function findChrome() {
  const explicit = process.env.GOODLIST_CHROME || process.env.CHROME_PATH;
  if (explicit && existsSync(explicit)) return explicit;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (base && existsSync(base)) {
    const dirs = readdirSync(base);
    // headless_shell honours --window-size exactly; full Chrome crops it.
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

/** Writes docs/marketing/<name>.html and shoots it to <name>.png at 1080x1350. */
export async function renderAd({ name, html }) {
  mkdirSync(OUT_DIR, { recursive: true });
  const htmlPath = join(OUT_DIR, `${name}.html`);
  const pngPath = join(OUT_DIR, `${name}.png`);
  writeFileSync(htmlPath, html);

  execFileSync(
    findChrome(),
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      `--window-size=${W},${H}`,
      `--screenshot=${pngPath}`,
      htmlPath,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  );

  const out = await sharp(readFileSync(pngPath)).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  writeFileSync(pngPath, out);
  const { width, height } = await sharp(out).metadata();
  console.log(`✓ docs/marketing/${name}.png  ${width}x${height}  ${(out.length / 1024).toFixed(0)} KB`);
}
