/**
 * Ad 1 — "Did I take my medicine today?": he loses track in a paper notebook,
 * his wife suggests Goodlist, the reminder rings and the calendar shows every
 * dose. Copy stays within what the app does (reminders, taken/skipped, missed
 * doses on the calendar) — it's a reminder and a record, not medical advice.
 */
import { C, hand, logo, man, page, phoneSmall, woman } from '../lib/ad-kit.mjs';

export const name = 'fb-ad-medicine-reminder';

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

export const html = page({
  title: 'Goodlist medicine reminder ad',
  body: `  <header class="head">
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
  </footer>`,
});
