/**
 * Renders the Facebook feed ad for medicine reminders:
 * docs/marketing/fb-ad-medicine-reminder.png (1080x1350, 4:5).
 *
 * A three-panel comic — he loses track in a paper notebook, she suggests
 * Goodlist, the reminder rings and the calendar shows every dose — drawn as
 * inline SVG with the brand navy/green and the default "Minimal Sage" app
 * tokens (src/constants/themes.ts), so the phone mockup matches the real Meds
 * and Calendar screens. Same pipeline as generate-guide-screens.mjs: plain
 * HTML shot with headless Chromium at 2x, then compressed with sharp.
 *
 * Usage:  node ./scripts/generate-fb-ad.mjs  (npm run ad:fb)
 *
 * Copy stays within what the app does (reminders, taken/skipped, missed doses
 * on the calendar) — it's a reminder and a record, not medical advice.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'docs', 'marketing');
const NAME = 'fb-ad-medicine-reminder';
// Laid out at half size and shot at 2x, so strokes and text stay crisp.
const W = 540;
const H = 675;

const C = {
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

const logo = `data:image/png;base64,${readFileSync(join(ROOT, 'assets', 'images', 'goodlist-logo-horizontal.png')).toString('base64')}`;

// ---------------------------------------------------------------------------
// Characters — head centre at (0,0), bust down to y=120.
// ---------------------------------------------------------------------------
function man(mood) {
  const brows =
    mood === 'confused'
      ? `<path d="M-19 -14 Q-12 -20 -4 -15" /><path d="M4 -11 Q12 -12 19 -9" />`
      : `<path d="M-19 -13 Q-12 -18 -4 -14" /><path d="M4 -14 Q12 -18 19 -13" />`;
  const eyes =
    mood === 'happy'
      ? `<path d="M-14 1 Q-11 -3 -8 1" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>
         <path d="M8 1 Q11 -3 14 1" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`
      : `<circle cx="-11" cy="0" r="2.3" fill="${C.ink}"/><circle cx="11" cy="0" r="2.3" fill="${C.ink}"/>`;
  const mouth =
    mood === 'happy'
      ? `<path d="M-8 22 Q0 30 8 22 Z" fill="#8C3B3B"/>`
      : mood === 'confused'
        ? `<path d="M-6 25 Q-1 22 3 25 Q6 27 8 24" fill="none" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>`
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

function woman(mood) {
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

// A hand is just a skin-coloured rounded blob at the end of a sleeve.
const hand = (x, y, fill, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;

function phoneSmall(x, y, rot = 0) {
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
// Panels (each drawn in its own SVG coordinate space)
// ---------------------------------------------------------------------------
const panel1 = `
<svg viewBox="0 0 254 236" width="254" height="236">
  <rect width="254" height="236" fill="#F3E6CF"/>
  <rect x="0" y="0" width="254" height="150" fill="#EFE2C8"/>
  <!-- window + wall clock -->
  <rect x="160" y="30" width="72" height="60" rx="4" fill="#CFE3EE" stroke="#fff" stroke-width="4"/>
  <path d="M196 30 V90 M160 60 H232" stroke="#fff" stroke-width="3"/>
  <circle cx="186" cy="72" r="9" fill="#FFE39A" opacity=".8"/>
  <circle cx="30" cy="54" r="15" fill="#fff" stroke="${C.cardigan}" stroke-width="3"/>
  <path d="M30 54 V45 M30 54 L37 57" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>
  <!-- man -->
  <g transform="translate(112 130) scale(.92)">
    ${man('confused')}
    <!-- arm up scratching head -->
    <path d="M40 60 Q68 22 36 -14" fill="none" stroke="${C.cardigan}" stroke-width="17" stroke-linecap="round"/>
    ${hand(28, -22, C.skin, 9.5)}
  </g>
  <!-- table -->
  <rect x="0" y="176" width="254" height="60" fill="#B98C5E"/>
  <rect x="0" y="176" width="254" height="7" fill="#CFA273"/>
  <!-- notebook -->
  <g transform="translate(62 182) rotate(-6)">
    <rect x="-3" y="2" width="96" height="58" rx="3" fill="#00000022"/>
    <rect x="0" y="0" width="94" height="58" rx="3" fill="#FFFDF3" stroke="#D8CDB8"/>
    <path d="M47 0 V58" stroke="#D8CDB8"/>
    <g font-family="'Comic Neue','Liberation Sans',sans-serif" font-size="8.5" fill="#3552A0" font-style="italic">
      <text x="5" y="12">Mon ✓</text><text x="5" y="24">Tue ✓</text>
      <text x="5" y="36">Wed ✓?</text><text x="5" y="48">Thu</text>
      <text x="51" y="12" text-decoration="line-through">Fri ✓</text><text x="51" y="24">Fri ??</text>
      <text x="51" y="36" fill="${C.danger}">took it?</text>
    </g>
    <path d="M30 44 q6 -4 12 0 t12 0" fill="none" stroke="#3552A0" stroke-width="1"/>
  </g>
  <!-- pill bottle + loose pills -->
  <g transform="translate(196 180)">
    <rect x="0" y="4" width="26" height="34" rx="4" fill="#E9933B"/>
    <rect x="-2" y="-4" width="30" height="10" rx="3" fill="#fff"/>
    <rect x="3" y="14" width="20" height="14" rx="2" fill="#fff" opacity=".9"/>
  </g>
  <ellipse cx="180" cy="222" rx="5" ry="3" fill="#fff" stroke="#D8CDB8"/>
  <ellipse cx="170" cy="226" rx="5" ry="3" fill="#fff" stroke="#D8CDB8"/>
  <!-- thought bubble -->
  <text x="222" y="140" font-family="'Liberation Sans',sans-serif" font-size="30" font-weight="700" fill="${C.danger}" opacity=".85">?</text>
  <text x="236" y="162" font-family="'Liberation Sans',sans-serif" font-size="20" font-weight="700" fill="${C.danger}" opacity=".6">?</text>
</svg>`;

const panel2 = `
<svg viewBox="0 0 254 236" width="254" height="236">
  <rect width="254" height="236" fill="#E9EFE4"/>
  <rect x="0" y="176" width="254" height="60" fill="#DCE5D3"/>
  <!-- plant -->
  <g transform="translate(226 150)">
    <path d="M0 0 Q-14 -30 -4 -50 M0 0 Q10 -34 18 -44 M0 0 Q-2 -28 6 -58" fill="none" stroke="${C.sageDark}" stroke-width="3"/>
    <ellipse cx="-6" cy="-50" rx="6" ry="11" fill="${C.sage}" transform="rotate(-20 -6 -50)"/>
    <ellipse cx="18" cy="-44" rx="6" ry="11" fill="${C.sage}" transform="rotate(30 18 -44)"/>
    <ellipse cx="6" cy="-60" rx="6" ry="11" fill="${C.sageDark}"/>
    <path d="M-12 0 H12 L8 26 H-8 Z" fill="#C97C4E"/>
  </g>
  <!-- man (listening) -->
  <g transform="translate(68 150) scale(.86)">
    ${man('neutral')}
  </g>
  <!-- woman, turned toward him, showing phone -->
  <g transform="translate(168 146) scale(.86)">
    ${woman('neutral')}
    <path d="M-36 62 Q-60 58 -64 30" fill="none" stroke="${C.blouse}" stroke-width="16" stroke-linecap="round"/>
    ${phoneSmall(-66, 10, -12)}
    ${hand(-62, 30, C.skin2, 8)}
  </g>
  <!-- sparkle toward phone -->
  <g stroke="${C.green}" stroke-width="2.4" stroke-linecap="round">
    <path d="M100 116 l-6 -4 M102 104 l-7 0 M100 92 l-6 4"/>
  </g>
</svg>`;

// Mini month grid for the phone screen in panel 3: every day ticked, one miss.
function miniCalendar() {
  const cells = [];
  const missed = 16;
  for (let d = 1; d <= 21; d += 1) {
    const col = (d - 1) % 7;
    const row = Math.floor((d - 1) / 7);
    const x = 14 + col * 19;
    const y = 18 + row * 21;
    const today = d === 21;
    cells.push(`
      ${today ? `<rect x="${x - 8}" y="${y - 10}" width="16" height="19" rx="5" fill="#E8E2D0" stroke="${C.sage}" stroke-width="1.2"/>` : ''}
      <text x="${x}" y="${y}" font-size="7" font-weight="700" text-anchor="middle" fill="${C.text}">${d}</text>
      <circle cx="${x}" cy="${y + 5}" r="1.9" fill="${d === missed ? C.danger : C.sage}"/>`);
  }
  return cells.join('');
}

const phoneScreen = `
<svg viewBox="0 0 150 300" width="150" height="300">
  <defs><clipPath id="scr"><rect x="7" y="7" width="136" height="286" rx="18"/></clipPath></defs>
  <rect x="0" y="0" width="150" height="300" rx="24" fill="#1E2330"/>
  <rect x="7" y="7" width="136" height="286" rx="18" fill="${C.cream}"/>
  <g clip-path="url(#scr)" font-family="'Liberation Sans',sans-serif">
    <rect x="58" y="12" width="34" height="8" rx="4" fill="#1E2330"/>
    <!-- notification -->
    <rect x="12" y="26" width="126" height="44" rx="10" fill="#fff" filter="url(#sh)"/>
    <rect x="18" y="32" width="14" height="14" rx="4" fill="${C.navy}"/>
    <path d="M21.5 39 l2.5 2.5 l4.5 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
    <text x="36" y="42" font-size="6.5" fill="${C.sageText}" font-weight="700">GOODLIST · now</text>
    <text x="18" y="56" font-size="7.6" font-weight="700" fill="${C.text}">⏰ Time for your medicine</text>
    <text x="18" y="65" font-size="6.6" fill="${C.sageText}">8:00 AM · Maintenance · 1 tablet</text>
    <!-- meds card -->
    <text x="14" y="88" font-size="11" font-weight="700" fill="${C.text}">Medicines</text>
    <text x="14" y="101" font-size="6.8" font-weight="700" fill="${C.sageText}">Today</text>
    <rect x="12" y="106" width="126" height="48" rx="10" fill="#fff"/>
    <circle cx="24" cy="120" r="5.5" fill="${C.sage}"/>
    <path d="M21.5 120 l2 2 l3.5 -4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
    <text x="34" y="119" font-size="7.4" fill="${C.text}">8:00 AM · Maintenance</text>
    <text x="34" y="129" font-size="6.4" fill="${C.sageText}">1 tablet · Taken</text>
    <rect x="86" y="136" width="44" height="13" rx="6.5" fill="${C.sage}"/>
    <text x="108" y="145.3" font-size="6.8" font-weight="700" fill="#fff" text-anchor="middle">Taken ✓</text>
    <!-- calendar card -->
    <text x="14" y="172" font-size="6.8" font-weight="700" fill="${C.sageText}">This month</text>
    <g transform="translate(12 177)">
      <rect width="126" height="78" rx="10" fill="#fff"/>
      ${miniCalendar()}
    </g>
    <!-- tab bar -->
    <rect x="7" y="266" width="136" height="27" fill="${C.cream}"/>
    <path d="M7 266 H143" stroke="${C.border}"/>
    <g font-size="5.6" text-anchor="middle" fill="${C.sageText}">
      <text x="27" y="284">Tasks</text><text x="52" y="284">Calendar</text>
      <text x="77" y="284" fill="${C.text}" font-weight="700">Meds</text>
      <text x="102" y="284">Group</text><text x="126" y="284">Settings</text>
    </g>
  </g>
  <defs><filter id="sh" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-opacity=".15"/></filter></defs>
</svg>`;

const panel3 = `
<svg viewBox="0 0 516 224" width="516" height="224">
  <rect width="516" height="224" fill="#FFF6E3"/>
  <circle cx="440" cy="190" r="120" fill="#FCEBCB"/>
  <circle cx="200" cy="40" r="26" fill="#FFE39A" opacity=".7"/>
  <rect x="0" y="176" width="516" height="48" fill="#F3E3C4"/>
  <!-- woman behind, arm around him -->
  <g transform="translate(160 132) scale(.86)">
    ${woman('happy')}
  </g>
  <g transform="translate(86 140) scale(.9)">
    ${man('happy')}
    <!-- thumbs up -->
    <path d="M-40 70 Q-66 60 -62 26" fill="none" stroke="${C.cardigan}" stroke-width="17" stroke-linecap="round"/>
    <rect x="-72" y="6" width="20" height="18" rx="6" fill="${C.skin}"/>
    <rect x="-68" y="-8" width="8" height="18" rx="4" fill="${C.skin}"/>
  </g>
  <!-- hearts -->
  <g fill="${C.danger}" opacity=".8">
    <path d="M232 62 c-4 -6 -12 -2 -8 5 l8 7 l8 -7 c4 -7 -4 -11 -8 -5 z"/>
    <path d="M254 78 c-3 -4 -8 -1 -6 3 l6 5 l6 -5 c2 -4 -3 -7 -6 -3 z" opacity=".7"/>
  </g>
</svg>`;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Goodlist medicine reminder ad</title>
<style>
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
  .cta small { display: block; font-size: 9px; font-weight: 700; opacity: .9; letter-spacing: .06em; text-transform: uppercase; }
</style></head>
<body>
  <header class="head">
    <div class="kicker">A Goodlist story</div>
    <h1>“Did I take my medicine<br>today?” <em>Never again.</em></h1>
  </header>

  <main class="grid">
    <section class="panel">
      <div class="num">1</div>
      <div class="cap">Every morning, the same question…</div>
      ${panel1}
      <div class="bubble tl thought" style="left: 10px; top: 36px; width: 150px;">Did I take it today… or was that yesterday?</div>
    </section>

    <section class="panel">
      <div class="num">2</div>
      <div class="cap">Then his wife had an idea.</div>
      ${panel2}
      <div class="bubble tr" style="left: 10px; right: 8px; top: 34px;">Use <span class="hl">Goodlist</span>, dear! It reminds you — and the calendar shows any dose you <span class="miss">miss</span>.</div>
    </section>

    <section class="panel wide">
      <div class="num">3</div>
      <div class="cap">Now his phone reminds him — right on time.</div>
      <div class="p3-scene">${panel3}</div>
      <div class="bubble tl" style="left: 22px; top: 36px; width: 170px;">It rang at 8:00 — <span class="hl">taken ✓</span> I can see every day on the calendar!</div>
      <div class="tags">
        <div class="tag"><span class="dot" style="background:${C.navy}">⏰</span>Rings at every dose</div>
        <div class="tag"><span class="dot" style="background:${C.sage}">✓</span>One tap: Taken</div>
        <div class="tag"><span class="dot" style="background:${C.danger}">!</span>Misses show on calendar</div>
      </div>
      <div class="p3-phone">${phoneScreen}</div>
    </section>
  </main>

  <footer class="foot">
    <div>
      <img src="${logo}" alt="Goodlist">
      <div class="sub">Medicine reminders · Tasks · Calendar</div>
    </div>
    <div class="cta"><small>Get it on</small>Google Play</div>
  </footer>
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

mkdirSync(OUT_DIR, { recursive: true });
const htmlPath = join(OUT_DIR, `${NAME}.html`);
const pngPath = join(OUT_DIR, `${NAME}.png`);
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
console.log(`✓ docs/marketing/${NAME}.png  ${width}x${height}  ${(out.length / 1024).toFixed(0)} KB`);
