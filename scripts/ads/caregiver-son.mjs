/**
 * Ad 2 — "Pa, did you take your medicine?": Dad keeps missing his maintenance
 * medicine, a friend tells the son about Goodlist, and now Dad is reminded at
 * every dose while the son sees each one on his own phone.
 *
 * Keep the copy inside what the app does (supabase/schema.sql, "Medicines";
 * src/components/meds/meds-view.tsx): Dad shares his medicine with a Family
 * group and the son sees it under "Dad · shared with you" — taken, skipped or
 * missed. Sharing is Premium (the footer says so). The son is not pushed an
 * alert on a missed dose, so it's "check anytime", never "get alerted". No
 * health outcomes: "back on track", not "got well".
 */
import { C, friend, hand, logo, man, page, phoneSmall, son } from '../lib/ad-kit.mjs';

export const name = 'fb-ad-caregiver-son';

const pillOrganiser = `
  <g>
    <rect x="-2" y="3" width="108" height="26" rx="5" fill="#00000022"/>
    <rect x="0" y="0" width="106" height="26" rx="5" fill="#8FB3D9"/>
    ${['S', 'M', 'T', 'W', 'T', 'F', 'S']
      .map(
        (day, i) => `
      <rect x="${3 + i * 14.6}" y="3" width="12.6" height="20" rx="3" fill="#D9E7F5"/>
      <text x="${9.3 + i * 14.6}" y="10" font-size="5.5" font-weight="700" text-anchor="middle" fill="#3E6A99">${day}</text>
      <ellipse cx="${9.3 + i * 14.6}" cy="16.5" rx="3.6" ry="2.4" fill="#fff" stroke="#C9B9A0" stroke-width=".6"/>`,
      )
      .join('')}
  </g>`;

// Panel 1 — Dad at the kitchen table, every day's pill still in the box, the
// son on a video call from the propped-up phone.
const panel1 = `
<svg viewBox="0 0 254 236" width="254" height="236">
  <defs><clipPath id="vc"><rect x="186" y="112" width="44" height="66" rx="4"/></clipPath></defs>
  <rect width="254" height="236" fill="#E9E4DA"/>
  <rect x="0" y="0" width="254" height="170" fill="#E4DDCF"/>
  <!-- dad, tired -->
  <g transform="translate(98 152) scale(.84)">
    ${man('tired')}
    <path d="M44 66 Q66 84 70 102" fill="none" stroke="${C.cardigan}" stroke-width="16" stroke-linecap="round"/>
  </g>
  <!-- table -->
  <rect x="0" y="190" width="254" height="46" fill="#B98C5E"/>
  <rect x="0" y="190" width="254" height="6" fill="#CFA273"/>
  <g transform="translate(34 200)">${pillOrganiser}</g>
  <!-- phone on a stand: the son calling -->
  <path d="M196 196 L208 180 L220 196 Z" fill="#555C6B"/>
  <rect x="182" y="108" width="52" height="74" rx="7" fill="#1E2330"/>
  <rect x="186" y="112" width="44" height="66" rx="4" fill="#DDE7F3"/>
  <g clip-path="url(#vc)">
    <g transform="translate(208 142) scale(.4)">${son('worried')}</g>
  </g>
  <rect x="190" y="170" width="10" height="5" rx="2.5" fill="${C.danger}"/>
</svg>`;

// Panel 2 — the son and a friend over coffee; she shows him the app.
const panel2 = `
<svg viewBox="0 0 254 236" width="254" height="236">
  <rect width="254" height="236" fill="#F2E8DA"/>
  <!-- café window + hanging lamp -->
  <rect x="96" y="96" width="66" height="70" rx="4" fill="#CFE3EE" stroke="#fff" stroke-width="4"/>
  <path d="M129 96 V166" stroke="#fff" stroke-width="3"/>
  <path d="M0 150 H254" stroke="#E2D4BE" stroke-width="2"/>
  <!-- son, listening -->
  <g transform="translate(62 150) scale(.84)">
    ${son('worried')}
  </g>
  <!-- friend, showing her phone -->
  <g transform="translate(192 150) scale(.84)">
    ${friend('happy')}
    <path d="M-34 66 Q-58 62 -62 36" fill="none" stroke="${C.green}" stroke-width="15" stroke-linecap="round"/>
    ${phoneSmall(-64, 16, -10)}
    ${hand(-60, 36, '#C98E6A', 7.5)}
  </g>
  <!-- table + cups -->
  <rect x="0" y="208" width="254" height="28" fill="#7A5A3E"/>
  <rect x="0" y="208" width="254" height="5" fill="#936D4C"/>
  <g transform="translate(20 196)">
    <path d="M0 0 H22 L19 18 H3 Z" fill="#fff"/><path d="M22 4 Q30 6 21 13" fill="none" stroke="#fff" stroke-width="3"/>
    <path d="M7 -6 q-3 -5 0 -9 M14 -6 q-3 -5 0 -9" fill="none" stroke="#C9B9A0" stroke-width="1.5" stroke-linecap="round"/>
  </g>
  <g transform="translate(222 196)">
    <path d="M0 0 H22 L19 18 H3 Z" fill="#fff"/><path d="M0 4 Q-8 6 1 13" fill="none" stroke="#fff" stroke-width="3"/>
  </g>
</svg>`;

// The son's Meds screen: Dad's medicine, shared with him.
function weekStrip() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return days
    .map((day, i) => {
      const x = 12 + i * 17;
      const today = i === 5;
      const future = i === 6;
      return `
      ${today ? `<rect x="${x - 7}" y="-2" width="14" height="24" rx="5" fill="#E8E2D0" stroke="${C.sage}" stroke-width="1"/>` : ''}
      <text x="${x}" y="7" font-size="6.4" font-weight="700" text-anchor="middle" fill="${C.sageText}">${day}</text>
      <circle cx="${x}" cy="15" r="3.4" fill="${future ? 'none' : C.sage}" stroke="${future ? C.border : 'none'}" stroke-width="1.2"/>
      ${future ? '' : `<path d="M${x - 1.6} 15 l1.1 1.1 l2 -2.3" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round"/>`}`;
    })
    .join('');
}

const sonPhone = `
<svg viewBox="0 0 150 300" width="150" height="300">
  <defs><clipPath id="scr2"><rect x="7" y="7" width="136" height="286" rx="18"/></clipPath></defs>
  <rect x="0" y="0" width="150" height="300" rx="24" fill="#1E2330"/>
  <rect x="7" y="7" width="136" height="286" rx="18" fill="${C.cream}"/>
  <g clip-path="url(#scr2)" font-family="'Liberation Sans',sans-serif">
    <rect x="58" y="12" width="34" height="8" rx="4" fill="#1E2330"/>
    <text x="14" y="42" font-size="12" font-weight="700" fill="${C.text}">Medicines</text>
    <text x="14" y="58" font-size="6.8" font-weight="700" fill="${C.sageText}">Dad · shared with you</text>
    <!-- 8:00 AM taken -->
    <rect x="12" y="63" width="126" height="36" rx="9" fill="#fff"/>
    <circle cx="24" cy="81" r="5.5" fill="${C.sage}"/>
    <path d="M21.5 81 l2 2 l3.5 -4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
    <text x="34" y="78" font-size="7.4" fill="${C.text}">8:00 AM · Maintenance</text>
    <text x="34" y="89" font-size="6.4" fill="${C.sageDark}" font-weight="700">Taken at 8:02 AM</text>
    <!-- 8:00 PM upcoming -->
    <rect x="12" y="104" width="126" height="36" rx="9" fill="#fff"/>
    <circle cx="24" cy="122" r="5" fill="none" stroke="${C.sage}" stroke-width="1.6"/>
    <text x="34" y="119" font-size="7.4" fill="${C.text}">8:00 PM · Maintenance</text>
    <text x="34" y="130" font-size="6.4" fill="${C.sageText}">1 tablet · Upcoming</text>
    <!-- week -->
    <text x="14" y="158" font-size="6.8" font-weight="700" fill="${C.sageText}">This week</text>
    <g transform="translate(12 163)">
      <rect width="126" height="54" rx="9" fill="#fff"/>
      <g transform="translate(6 10)">${weekStrip()}</g>
      <text x="63" y="46" font-size="6.6" text-anchor="middle" fill="${C.sageDark}" font-weight="700">100% taken · 6-day streak</text>
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
</svg>`;

// Panel 3 — the son at work, relieved; Dad (inset) with his dose taken.
const panel3 = `
<svg viewBox="0 0 516 224" width="516" height="224">
  <rect width="516" height="224" fill="#EEF4EA"/>
  <circle cx="440" cy="190" r="120" fill="#E1ECDA"/>
  <rect x="0" y="182" width="516" height="42" fill="#D6E2CD"/>
  <!-- desk + laptop behind the son -->
  <rect x="140" y="150" width="60" height="36" rx="3" fill="#9AA3B0"/>
  <rect x="144" y="154" width="52" height="28" rx="2" fill="#CFE0EF"/>
  <g transform="translate(86 142) scale(.9)">
    ${son('happy')}
    <path d="M40 70 Q64 64 62 34" fill="none" stroke="#1F3F7A" stroke-width="16" stroke-linecap="round"/>
    ${phoneSmall(62, 12, 8)}
    ${hand(60, 32, C.skin2, 8)}
  </g>
  <!-- Dad inset: a happy video-call bubble -->
  <g transform="translate(236 62) scale(.8)">
    <circle r="30" fill="#FFF6E3" stroke="${C.navy}" stroke-width="2.5"/>
    <clipPath id="dadc"><circle r="28.5"/></clipPath>
    <g clip-path="url(#dadc)"><g transform="translate(0 6) scale(.62)">${man('happy')}</g></g>
    <circle cx="22" cy="22" r="9" fill="${C.sage}" stroke="#fff" stroke-width="2"/>
    <path d="M18 22 l3 3 l5 -6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  </g>
</svg>`;

export const html = page({
  title: 'Goodlist caregiver ad',
  css: `
  .foot .sub b { color: ${C.navy}; }
  .premium { font-size: 8.5px; color: ${C.sageText}; margin-top: 3px; font-weight: 400; }`,
  body: `
  <header class="head">
    <div class="kicker">A Goodlist story</div>
    <h1>“Pa, did you take your<br>medicine?” <em>Now I just check.</em></h1>
  </header>

  <main class="grid">
    <section class="panel">
      <div class="num">1</div>
      <div class="cap">Dad kept missing his medicine — and wasn’t getting better.</div>
      ${panel1}
      <div class="bubble tr" style="left: 58px; right: 8px; top: 44px;">Did you take it today, Pa?</div>
      <div class="bubble tl thought" style="left: 44px; top: 84px; white-space: nowrap; font-size: 11.5px;">Hmm… I think so?</div>
    </section>

    <section class="panel">
      <div class="num">2</div>
      <div class="cap">A friend told me about Goodlist.</div>
      ${panel2}
      <div class="bubble tr" style="left: 10px; right: 8px; top: 34px;">It reminds your dad at every dose — and you can <span class="hl">see if he took it</span>, right on your phone!</div>
    </section>

    <section class="panel wide">
      <div class="num">3</div>
      <div class="cap">Now Dad gets reminded — and I can see it’s taken.</div>
      <div class="p3-scene">${panel3}</div>
      <div class="bubble tl" style="left: 22px; top: 36px; width: 176px;">Dad took it at 8:02 <span class="hl">✓</span><br>I can check anytime — even at work.</div>
      <div class="tags">
        <div class="tag"><span class="dot" style="background:${C.navy}">⏰</span>Reminds Dad on time</div>
        <div class="tag"><span class="dot" style="background:${C.sage}">✓</span>See Taken or Missed</div>
        <div class="tag"><span class="dot" style="background:${C.danger}">♥</span>Share with family</div>
      </div>
      <div class="p3-phone">${sonPhone}</div>
    </section>
  </main>

  <footer class="foot">
    <div>
      <img src="${logo}" alt="Goodlist">
      <div class="sub">Dad’s back on track — and I have peace of mind.</div>
      <div class="premium">Family sharing is a Premium feature.</div>
    </div>
    <div class="cta"><small>Get it on</small>Google Play</div>
  </footer>`,
});
