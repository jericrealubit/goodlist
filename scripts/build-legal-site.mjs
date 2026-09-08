// Renders the public legal site from src/content/legal.ts — the same module
// the in-app Privacy Policy and Terms screens render from.
//
// Google Play requires a publicly reachable privacy policy URL, and requires
// it to agree with the Data Safety declaration and with what the app actually
// does. It also requires a web page where an account can be deleted without
// installing the app. Generating all three from the app's own copy is what
// keeps them from drifting apart between releases.
//
// Run with: npm run legal:site
// Output:   docs/legal/{,privacy/,terms/,delete-account/}index.html
//           served by GitHub Pages (Settings → Pages → main /docs) at
//           https://jericrealubit.github.io/goodlist/legal/
//
// Imports a .ts module directly — Node >= 22.6 strips the type annotations on
// its own, and src/content/legal.ts is deliberately free of syntax that needs
// a real compiler.
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  CONTACT_EMAIL,
  EFFECTIVE_DATE,
  accountDeletion,
  privacyPolicy,
  termsOfService,
} from '../src/content/legal.ts';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(rootDir, 'docs', 'legal');

const SITE_NAME = 'Goodlist';
const BASE = '/goodlist/legal';

/** Order matters — this is the header nav. */
const DOCS = [
  { doc: privacyPolicy, slug: 'privacy', nav: 'Privacy' },
  { doc: termsOfService, slug: 'terms', nav: 'Terms' },
  { doc: accountDeletion, slug: 'delete-account', nav: 'Delete account' },
];

const escape = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const mailto = () =>
  `<a href="mailto:${escape(CONTACT_EMAIL)}">${escape(CONTACT_EMAIL)}</a>`;

function renderSpans(spans) {
  return spans
    .map((span) => {
      if (typeof span === 'string') return escape(span);
      if ('bold' in span) return `<strong>${escape(span.bold)}</strong>`;
      return mailto();
    })
    .join('');
}

function renderBlock(block) {
  switch (block.kind) {
    case 'para':
      return `<p>${renderSpans(block.spans)}</p>`;
    case 'lead':
      return `<p class="lead">${renderSpans(block.spans)}</p>`;
    case 'bullets':
      return `<ul>\n${block.items
        .map((item) => `            <li>${renderSpans(item)}</li>`)
        .join('\n')}\n          </ul>`;
    case 'callout':
      return `<aside class="callout${block.variant === 'warn' ? ' warn' : ''}">${renderSpans(
        block.spans,
      )}</aside>`;
    default:
      throw new Error(`Unknown block kind: ${block.kind}`);
  }
}

const STYLES = `
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
  @media (max-width: 760px) { .layout { grid-template-columns: 1fr; gap: 0; } .toc { display: none; } }

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

function shell({ title, description, activeSlug, body }) {
  const nav = DOCS.map(
    ({ slug, nav: label }) =>
      `<a href="${BASE}/${slug}/"${slug === activeSlug ? ' aria-current="page"' : ''}>${escape(label)}</a>`,
  ).join('\n        ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} · ${SITE_NAME}</title>
<meta name="description" content="${escape(description)}">
<meta name="robots" content="index, follow">
<style>${STYLES}</style>
</head>
<body>
<header class="top">
  <div class="top-inner">
    <a class="brand" href="${BASE}/">
      ${MARK}
      <b>${SITE_NAME}</b>
    </a>
    <nav class="docs" aria-label="Legal documents">
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

function renderDoc(doc, slug) {
  const toc = doc.clauses
    .map((clause) => `      <a href="#${clause.id}">${escape(clause.title)}</a>`)
    .join('\n');

  const sections = doc.clauses
    .map(
      (clause, index) => `      <section id="${clause.id}">
        <h2><span class="num">${index + 1}.</span>${escape(clause.title)}</h2>
          ${clause.blocks.map(renderBlock).join('\n          ')}
      </section>`,
    )
    .join('\n');

  const body = `<main>
  <div class="hero">
    <h1>${escape(doc.title)}</h1>
    <p>${escape(doc.summary)}</p>
    <span class="stamp">Effective <b>${escape(EFFECTIVE_DATE)}</b></span>
  </div>
  <div class="layout">
    <nav class="toc" aria-label="On this page">
      <span class="toc-label">On this page</span>
${toc}
    </nav>
    <article>
${sections}
    </article>
  </div>
</main>`;

  return shell({ title: doc.title, description: doc.summary, activeSlug: slug, body });
}

function renderIndex() {
  const cards = DOCS.map(
    ({ doc, slug }) =>
      `    <a class="card" href="${BASE}/${slug}/"><b>${escape(doc.title)}</b><span>${escape(
        doc.summary,
      )}</span></a>`,
  ).join('\n');

  const body = `<main>
  <div class="hero">
    <h1>Legal &amp; privacy</h1>
    <p>${SITE_NAME} is a task app for your own to-dos and for sharing tasks with a small family or team group. These pages are the same text shown inside the app.</p>
    <span class="stamp">Effective <b>${escape(EFFECTIVE_DATE)}</b></span>
  </div>
  <div class="cards">
${cards}
  </div>
</main>`;

  return shell({
    title: 'Legal & privacy',
    description: `${SITE_NAME} privacy policy, terms of service, and account deletion.`,
    activeSlug: null,
    body,
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  // GitHub Pages runs Jekyll over /docs by default, which would try to process
  // the Markdown docs living alongside this site. These pages are plain HTML
  // and want serving verbatim.
  await writeFile(path.join(rootDir, 'docs', '.nojekyll'), '');
  await writeFile(path.join(outDir, 'index.html'), renderIndex());

  for (const { doc, slug } of DOCS) {
    const dir = path.join(outDir, slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), renderDoc(doc, slug));
  }

  console.log(
    `Generated docs/legal/ — index, ${DOCS.map(({ slug }) => slug).join(', ')} (effective ${EFFECTIVE_DATE})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
