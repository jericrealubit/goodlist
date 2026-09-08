// The shared chrome for the published Goodlist site: header, nav, palette and
// typography. Both site builders render through this so the guide and the
// legal pages are one site rather than two that merely look alike.
//
//   scripts/build-legal-site.mjs  ->  docs/legal/...   (npm run legal:site)
//   scripts/build-guide-site.mjs  ->  docs/guide/      (npm run guide:site)
//
// Served by GitHub Pages (Settings -> Pages -> main /docs) under
// https://jericrealubit.github.io/goodlist/
import { CONTACT_EMAIL } from '../../src/content/legal.ts';

export const SITE_NAME = 'Goodlist';
/** Repository-name path prefix GitHub Pages serves the site under. */
export const SITE_BASE = '/goodlist';

/** Site-wide header nav, in order. */
export const SITE_NAV = [
  { href: `${SITE_BASE}/guide/`, label: 'Guide' },
  { href: `${SITE_BASE}/legal/privacy/`, label: 'Privacy' },
  { href: `${SITE_BASE}/legal/terms/`, label: 'Terms' },
  { href: `${SITE_BASE}/legal/delete-account/`, label: 'Delete account' },
];

export const escape = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const mailto = () =>
  `<a href="mailto:${escape(CONTACT_EMAIL)}">${escape(CONTACT_EMAIL)}</a>`;

export const STYLES = `
  :root {
    color-scheme: light dark;
    --bg: #fbfbfa;
    --surface: #ffffff;
    --sunk: #f1f3f6;
    --text: #14181f;
    --muted: #5b6472;
    --border: #e2e5ea;
    --brand: #072655;
    --brand-ink: #072655;
    --accent: #2e9e4f;
    --danger: #b23a2c;
    --danger-bg: #fdf3f1;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0b0f17;
      --surface: #111826;
      --sunk: #0e1420;
      --text: #e7e9ed;
      --muted: #9aa3b2;
      --border: #262b36;
      --brand: #5c8ae6;
      --brand-ink: #e7e9ed;
      --accent: #4cb86b;
      --danger: #e4685d;
      --danger-bg: #21150f;
    }
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--brand); }
  a:focus-visible, summary:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 3px;
  }

  header.top {
    position: sticky;
    top: 0;
    z-index: 10;
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border);
  }
  .top-inner {
    max-width: 940px;
    margin: 0 auto;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: auto;
    text-decoration: none;
    color: inherit;
  }
  .mark {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: #072655;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .mark svg { width: 17px; height: 17px; }
  .brand b { font-size: 15px; letter-spacing: -0.01em; }
  nav.docs { display: flex; gap: 4px; flex-wrap: wrap; }
  nav.docs a {
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    color: var(--muted);
    padding: 6px 12px;
    border-radius: 999px;
  }
  nav.docs a:hover { color: var(--text); background: var(--sunk); }
  nav.docs a[aria-current="page"] { color: var(--brand-ink); background: var(--sunk); }

  main { max-width: 940px; margin: 0 auto; padding: 40px 20px 80px; }

  .hero { margin-bottom: 36px; }
  .hero h1 {
    font-size: clamp(28px, 5vw, 36px);
    line-height: 1.15;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
  }
  .hero p { margin: 0 0 14px; color: var(--muted); max-width: 60ch; }
  .stamp {
    display: inline-block;
    font-size: 13px;
    color: var(--muted);
    background: var(--sunk);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 12px;
  }
  .stamp b { color: var(--text); }

  .layout { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 44px; align-items: start; }

  .toc { position: sticky; top: 76px; display: flex; flex-direction: column; }
  .toc-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 10px;
  }
  .toc a {
    font-size: 13.5px;
    line-height: 1.4;
    color: var(--muted);
    text-decoration: none;
    padding: 5px 0 5px 12px;
    border-left: 2px solid var(--border);
  }
  .toc a:hover { color: var(--text); border-left-color: var(--accent); }
  /* After the .toc rules above, not before them: at equal specificity the
     later declaration wins, so hoisting this to the .layout block left the
     sidebar visible on phones. */
  @media (max-width: 760px) {
    .layout { grid-template-columns: 1fr; gap: 0; }
    .toc { display: none; }
  }

  article { max-width: 68ch; }
  section { scroll-margin-top: 84px; }
  section + section { margin-top: 40px; padding-top: 32px; border-top: 1px solid var(--border); }
  h2 { font-size: 20px; letter-spacing: -0.01em; margin: 0 0 10px; }
  h2 .num { color: var(--muted); font-weight: 500; margin-right: 8px; }
  p { margin: 12px 0; }
  p.lead { color: var(--muted); font-size: 15px; }
  ul { margin: 12px 0; padding-left: 22px; }
  li { margin: 6px 0; }
  strong { font-weight: 650; }

  .callout {
    margin: 16px 0;
    padding: 14px 16px;
    font-size: 15px;
    background: var(--sunk);
    border: 1px solid var(--border);
    border-left: 3px solid var(--brand);
    border-radius: 10px;
  }
  .callout.warn { background: var(--danger-bg); border-left-color: var(--danger); }

  .cards { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); margin-top: 28px; }
  .card {
    display: block;
    padding: 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    text-decoration: none;
    color: inherit;
  }
  .card:hover { border-color: var(--accent); }
  .card b { display: block; font-size: 16px; margin-bottom: 6px; }
  .card span { color: var(--muted); font-size: 14px; }

  footer {
    max-width: 940px;
    margin: 0 auto;
    padding: 24px 20px 60px;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 14px;
  }
`;

const MARK = `<span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" fill="#fff" fill-opacity=".14"/><path d="M7 12.5l3 3 7-7" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

/**
 * Wraps a rendered <main> in the site chrome.
 *
 * `activeHref` marks the current SITE_NAV entry; the wordmark links to the
 * site index unless `brandHref` overrides it. `extraStyles` appends rules a
 * single builder needs — the guide's screenshots, say — without pushing them
 * into every page.
 */
export function shell({
  title,
  description,
  activeHref,
  brandHref = `${SITE_BASE}/`,
  body,
  extraStyles = '',
}) {
  const nav = SITE_NAV.map(
    ({ href, label }) =>
      `<a href="${href}"${href === activeHref ? ' aria-current="page"' : ''}>${escape(label)}</a>`,
  ).join('\n        ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · ${SITE_NAME}</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="index, follow">
<style>${STYLES}${extraStyles}</style>
</head>
<body>
<header class="top">
  <div class="top-inner">
    <a class="brand" href="${brandHref}">
      ${MARK}
      <b>${SITE_NAME}</b>
    </a>
    <nav class="docs" aria-label="Main">
        ${nav}
    </nav>
  </div>
</header>
${body}
<footer>
  ${SITE_NAME} — questions? ${mailto()}
</footer>
</body>
</html>
`;
}
