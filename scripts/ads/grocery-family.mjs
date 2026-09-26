/**
 * Ad 3 — "3 kids, 6 requests, 3 forgotten": Mom asks her three teens what
 * they need from the grocery, comes home missing three things, and Dad
 * suggests the kids send their own list on Goodlist.
 *
 * Keep the copy inside what the app does (src/content/guide.ts, "Ask someone
 * to do something"): in a Family group each person sends a Requested task,
 * it lands on Mom's phone as "From <name>" with a red number on Tasks, and
 * ticking it clears it for both. One group and requests are free. Goodlist is
 * for ages 13+ with no child accounts (src/content/legal.ts), so the kids are
 * teenagers with their own phones.
 */
import { C, hand, logo, mom, page, teen, youngMan } from '../lib/ad-kit.mjs';

export const name = 'fb-ad-grocery-family';

const KIDS = {
  mia: { style: 'long', hair: '#4A2E22', shirt: '#9B6BC7' },
  leo: { style: 'spiky', hair: '#2F2622', shirt: '#E9A23B' },
  ben: { style: 'cap', hair: '#2F2622', shirt: '#3F8FC4', skin: '#D59A74', shade: '#B97E5A' },
};
const husband = (mood) => youngMan(mood, { shirt: '#5F7855', collar: '#7C9473', placket: '#4A5F42', beard: true });

// Panel 1 (wide) — Mom at the front door, all three teens calling out at once.
const panel1 = `
<svg viewBox="0 0 516 196" width="516" height="196">
  <rect width="516" height="196" fill="#F3EBDD"/>
  <rect x="0" y="160" width="516" height="36" fill="#D9C7AA"/>
  <!-- front door -->
  <rect x="436" y="46" width="64" height="120" rx="3" fill="#8A5A3B"/>
  <rect x="444" y="56" width="48" height="44" rx="2" fill="#9E6B4A"/>
  <rect x="444" y="108" width="48" height="44" rx="2" fill="#9E6B4A"/>
  <circle cx="490" cy="112" r="3.5" fill="#E9C46A"/>
  <!-- the three teens -->
  <g transform="translate(62 136) scale(.7)">${teen('happy', KIDS.mia)}</g>
  <g transform="translate(156 138) scale(.7)">${teen('neutral', KIDS.leo)}</g>
  <g transform="translate(250 136) scale(.7)">${teen('happy', KIDS.ben)}</g>
  <!-- mom with handbag, heading out -->
  <g transform="translate(378 146) scale(.78)">
    ${mom('worried')}
    <path d="M40 66 Q58 80 58 104" fill="none" stroke="#E07A5F" stroke-width="15" stroke-linecap="round"/>
    <path d="M44 96 Q58 76 72 96" fill="none" stroke="#6B3E26" stroke-width="3"/>
    <rect x="40" y="96" width="36" height="28" rx="6" fill="#B5474F"/>
    ${hand(58, 104, '#E8B08A', 7)}
  </g>
</svg>`;

// Panel 2 — back home: groceries on the counter, three things missing.
const panel2 = `
<svg viewBox="0 0 254 256" width="254" height="256">
  <rect width="254" height="256" fill="#EAF0EC"/>
  <rect x="0" y="0" width="254" height="176" fill="#E3ECE6"/>
  <!-- cabinets -->
  <rect x="150" y="68" width="92" height="44" rx="4" fill="#C9D8CE"/>
  <path d="M196 68 V112" stroke="#B3C6B9" stroke-width="2"/>
  <!-- mom, overwhelmed -->
  <g transform="translate(82 186) scale(.84)">
    ${mom('worried')}
    <path d="M-40 66 Q-60 40 -30 -8" fill="none" stroke="#E07A5F" stroke-width="15" stroke-linecap="round"/>
    ${hand(-24, -14, '#E8B08A', 8.5)}
  </g>
  <!-- counter + grocery bag -->
  <rect x="0" y="216" width="254" height="40" fill="#B98C5E"/>
  <rect x="0" y="216" width="254" height="6" fill="#CFA273"/>
  <g transform="translate(160 190)">
    <rect x="0" y="0" width="56" height="50" rx="4" fill="#D8B784"/>
    <path d="M0 8 H56" stroke="#C4A06A" stroke-width="2"/>
    <rect x="8" y="-22" width="12" height="26" rx="3" fill="#fff" stroke="#C9D2DC"/>
    <rect x="9" y="-14" width="10" height="8" fill="#6FA8DC"/>
    <circle cx="32" cy="-8" r="10" fill="#E94F37"/>
    <path d="M32 -18 q2 -5 6 -5" stroke="#5F7855" stroke-width="2" fill="none"/>
    <path d="M42 -16 q6 -14 10 -2 q-4 6 -10 2 Z" fill="#F4C542"/>
  </g>
</svg>`;

// Mom's phone: the Requested tab with one request from each teen.
function requestRow(y, title, from) {
  return `
    <rect x="12" y="${y}" width="126" height="32" rx="9" fill="#fff"/>
    <circle cx="25" cy="${y + 16}" r="5.5" fill="none" stroke="${C.sage}" stroke-width="1.6"/>
    <text x="36" y="${y + 14}" font-size="7.6" fill="${C.text}">${title}</text>
    <text x="36" y="${y + 24}" font-size="6.4" fill="${C.sageText}">From ${from}</text>`;
}

const momPhone = `
<svg viewBox="0 0 150 300" width="150" height="300">
  <defs><clipPath id="scr3"><rect x="7" y="7" width="136" height="286" rx="18"/></clipPath></defs>
  <rect x="0" y="0" width="150" height="300" rx="24" fill="#1E2330"/>
  <rect x="7" y="7" width="136" height="286" rx="18" fill="${C.cream}"/>
  <g clip-path="url(#scr3)" font-family="'Liberation Sans',sans-serif">
    <rect x="58" y="12" width="34" height="8" rx="4" fill="#1E2330"/>
    <text x="14" y="42" font-size="12" font-weight="700" fill="${C.text}">Our Family</text>
    <rect x="12" y="50" width="61" height="17" rx="8.5" fill="#fff"/>
    <text x="42.5" y="61.5" font-size="7" text-anchor="middle" fill="${C.text}">Personal</text>
    <rect x="77" y="50" width="61" height="17" rx="8.5" fill="#E8E2D0"/>
    <text x="107.5" y="61.5" font-size="7" font-weight="700" text-anchor="middle" fill="${C.text}">Requested</text>
    ${requestRow(74, 'Cereal + milk', 'Mia')}
    ${requestRow(110, 'Shampoo', 'Leo')}
    ${requestRow(146, 'AA batteries', 'Ben')}
    ${requestRow(182, 'Chips for movie night', 'Leo')}
    <!-- compose bar -->
    <rect x="12" y="232" width="98" height="20" rx="10" fill="#fff"/>
    <text x="22" y="245" font-size="7" fill="${C.sageText}">Ask for…</text>
    <circle cx="126" cy="242" r="10" fill="${C.sage}"/>
    <path d="M126 247 V237 M122 241 L126 237 L130 241" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
    <!-- tab bar with the unread badge -->
    <rect x="7" y="262" width="136" height="31" fill="${C.cream}"/>
    <path d="M7 262 H143" stroke="${C.border}"/>
    <g font-size="5.6" text-anchor="middle" fill="${C.sageText}">
      <text x="27" y="284" fill="${C.text}" font-weight="700">Tasks</text><text x="52" y="284">Calendar</text>
      <text x="77" y="284">Meds</text><text x="102" y="284">Group</text><text x="126" y="284">Settings</text>
    </g>
    <circle cx="34" cy="272" r="6" fill="${C.danger}"/>
    <text x="34" y="274.6" font-size="7" font-weight="700" text-anchor="middle" fill="#fff">4</text>
  </g>
</svg>`;

// Panel 3 — Dad's idea, with Mom's phone showing everyone's requests.
const panel3 = `
<svg viewBox="0 0 254 256" width="254" height="256">
  <rect width="254" height="256" fill="#FFF6E3"/>
  <circle cx="190" cy="220" r="110" fill="#FCEBCB"/>
  <rect x="0" y="222" width="254" height="34" fill="#F3E3C4"/>
  <g transform="translate(66 190) scale(.84)">
    ${husband('happy')}
    <path d="M42 70 Q70 60 76 30" fill="none" stroke="#5F7855" stroke-width="15" stroke-linecap="round"/>
    ${hand(76, 24, C.skin2, 8)}
  </g>
</svg>`;

export const html = page({
  title: 'Goodlist family grocery ad',
  css: `
  .panel.top { grid-column: 1 / 3; height: 202px; }
  .panel.tall { height: 262px; }
  .shout {
    position: absolute; z-index: 3; background: #fff; border: 2.5px solid ${C.navy}; border-radius: 12px;
    padding: 5px 8px; font-size: 11.5px; font-weight: 700; line-height: 1.15; color: ${C.text}; white-space: nowrap;
  }
  .shout::before, .shout::after { content: ''; position: absolute; border-style: solid; width: 0; height: 0; }
  .shout::before { left: 16px; bottom: -12px; border-width: 12px 8px 0 0; border-color: ${C.navy} transparent transparent; }
  .shout::after  { left: 18.5px; bottom: -7.5px; border-width: 8px 5px 0 0; border-color: #fff transparent transparent; }
  .who { display: block; font-size: 9px; color: ${C.sageText}; letter-spacing: .04em; text-transform: uppercase; }
  .missing { position: absolute; z-index: 3; right: 10px; top: 92px; display: flex; flex-direction: column; gap: 4px; }
  .miss-chip {
    background: #fff; border: 2px solid ${C.danger}; color: ${C.danger}; border-radius: 999px;
    padding: 3px 9px 3px 5px; font-size: 11px; font-weight: 700; display: flex; align-items: center; gap: 5px;
  }
  .miss-chip i { width: 14px; height: 14px; border-radius: 50%; background: ${C.danger}; color: #fff; font-style: normal; font-size: 9px; display: grid; place-items: center; }
  .p3-phone2 { position: absolute; right: 8px; bottom: -34px; width: 104px; height: 208px; transform: rotate(5deg); filter: drop-shadow(0 6px 10px rgba(7,38,85,.25)); z-index: 2; }
  .p3-phone2 svg { position: static; width: 104px; height: 208px; }`,
  body: `
  <header class="head">
    <div class="kicker">A Goodlist story</div>
    <h1>3 kids, 6 requests, 3 forgotten.<br><em>Not anymore.</em></h1>
  </header>

  <main class="grid">
    <section class="panel top">
      <div class="num">1</div>
      <div class="cap">Mom’s off to the grocery: “Anything you need?”</div>
      ${panel1}
      <div class="shout" style="left: 18px; top: 40px;"><span class="who">Mia</span>Cereal + milk!</div>
      <div class="shout" style="left: 134px; top: 40px;"><span class="who">Leo</span>Shampoo! Chips!</div>
      <div class="shout" style="left: 254px; top: 40px;"><span class="who">Ben</span>Batteries! Juice!</div>
      <div class="bubble tl thought" style="left: 352px; top: 86px; white-space: nowrap; font-size: 11.5px;">Okay… I’ll remember!</div>
    </section>

    <section class="panel tall">
      <div class="num">2</div>
      <div class="cap">Back home…</div>
      ${panel2}
      <div class="bubble tl" style="left: 10px; right: 8px; top: 34px;">Mom, where’s my cereal? And my shampoo?! My batteries?</div>
      <div class="missing">
        <div class="miss-chip"><i>✕</i>Cereal</div>
        <div class="miss-chip"><i>✕</i>Shampoo</div>
        <div class="miss-chip"><i>✕</i>Batteries</div>
      </div>
    </section>

    <section class="panel tall">
      <div class="num">3</div>
      <div class="cap">Then Dad had an idea.</div>
      ${panel3}
      <div class="bubble tl" style="left: 10px; right: 8px; top: 34px;">Let the kids send their list on <span class="hl">Goodlist</span> — it lands right on your phone!</div>
      <div class="p3-phone2">${momPhone}</div>
    </section>
  </main>

  <footer class="foot">
    <div>
      <img src="${logo}" alt="Goodlist">
      <div class="sub">Everyone sends their own list. Nothing gets forgotten.</div>
    </div>
    <div class="cta"><small>Get it on</small>Google Play</div>
  </footer>`,
});
