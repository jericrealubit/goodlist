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
  EFFECTIVE_DATE,
  accountDeletion,
  privacyPolicy,
  termsOfService,
} from '../src/content/legal.ts';
import { SITE_BASE, SITE_NAME, escape, mailto, shell } from './lib/site-shell.mjs';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(rootDir, 'docs', 'legal');

const BASE = `${SITE_BASE}/legal`;

/** The pages this builder emits; the header nav lives in lib/site-shell.mjs. */
const DOCS = [
  { doc: privacyPolicy, slug: 'privacy' },
  { doc: termsOfService, slug: 'terms' },
  { doc: accountDeletion, slug: 'delete-account' },
];


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

  return shell({
    title: doc.title,
    description: doc.summary,
    activeHref: `${BASE}/${slug}/`,
    brandHref: `${BASE}/`,
    body,
  });
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
    activeHref: null,
    brandHref: `${BASE}/`,
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
