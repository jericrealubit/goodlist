// Renders the public user guide from src/content/guide.ts — the same module
// the in-app guide screen renders from, so the page a new user is linked to
// and the screen they find under Settings → Help are the same walkthrough by
// construction.
//
// Run with: npm run guide:site
// Output:   docs/guide/index.html
//           served by GitHub Pages (Settings → Pages → main /docs) at
//           https://jericrealubit.github.io/goodlist/guide/
//
// The screenshots are not copied: the page points at the ones already in
// docs/user-guide/images/, which `npm run guide:screens` writes alongside the
// bundled copies in assets/images/guide/.
//
// Imports a .ts module directly — Node >= 22.6 strips the type annotations on
// its own, and src/content/guide.ts is deliberately free of syntax that needs
// a real compiler.
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { userGuide } from '../src/content/guide.ts';
import { SITE_BASE, SITE_NAME, escape, shell } from './lib/site-shell.mjs';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(rootDir, 'docs', 'guide');

const HREF = `${SITE_BASE}/guide/`;
const SHOTS = `${SITE_BASE}/user-guide/images`;

/** Screens are shot at 390x844 — see scripts/generate-guide-screens.mjs. */
const SHOT_WIDTH = 390;
const SHOT_HEIGHT = 844;

const EXTRA_STYLES = `
  .part {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 6px;
  }
  /* Matches the separation the section + section rule gives the numbered
     steps, so the first part heading isn't crowded against the intro. */
  .intro {
    margin-bottom: 40px;
    padding-bottom: 32px;
    border-bottom: 1px solid var(--border);
  }
  figure.shot {
    margin: 20px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  figure.shot img {
    width: 100%;
    max-width: 260px;
    height: auto;
    /* The screenshots share the page's background, so without an edge they
       bleed into it instead of reading as a picture of a phone. */
    border: 1px solid var(--border);
    border-radius: 22px;
  }
  figure.shot figcaption {
    font-size: 13.5px;
    line-height: 1.45;
    color: var(--muted);
    text-align: center;
    max-width: 34ch;
  }
  .toc a.toc-extra { border-left-style: dashed; }
`;

function renderSpans(spans) {
  return spans
    .map((span) => (typeof span === 'string' ? escape(span) : `<strong>${escape(span.bold)}</strong>`))
    .join('');
}

let shotCount = 0;

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
    case 'image': {
      // The first screenshot is above the fold on most screens, so it loads
      // eagerly; the other sixteen do not need to.
      const loading = shotCount++ === 0 ? 'eager' : 'lazy';
      const caption = escape(block.caption);
      return `<figure class="shot">
            <img src="${SHOTS}/${block.shot}.png" alt="${caption}" width="${SHOT_WIDTH}" height="${SHOT_HEIGHT}" loading="${loading}" decoding="async">
            <figcaption>${caption}</figcaption>
          </figure>`;
    }
    default:
      throw new Error(`Unknown block kind: ${block.kind}`);
  }
}

function renderPage(doc) {
  const toc = [
    ...doc.steps.map(
      (step, index) => `      <a href="#${step.id}">${index + 1}. ${escape(step.title)}</a>`,
    ),
    ...doc.extras.map(
      (section) => `      <a class="toc-extra" href="#${section.id}">${escape(section.title)}</a>`,
    ),
  ].join('\n');

  const steps = doc.steps
    .map(
      (step, index) => `      <section id="${step.id}">
        ${step.part ? `<p class="part">${escape(step.part)}</p>\n        ` : ''}<h2><span class="num">${index + 1}.</span>${escape(step.title)}</h2>
          ${step.blocks.map(renderBlock).join('\n          ')}
      </section>`,
    )
    .join('\n');

  const extras = doc.extras
    .map(
      (section) => `      <section id="${section.id}">
        <h2>${escape(section.title)}</h2>
          ${section.blocks.map(renderBlock).join('\n          ')}
      </section>`,
    )
    .join('\n');

  const body = `<main>
  <div class="hero">
    <h1>${escape(doc.title)}</h1>
    <p>${escape(doc.subtitle)}</p>
    <span class="stamp">${doc.steps.length} steps · <b>a picture for each</b></span>
  </div>
  <div class="layout">
    <nav class="toc" aria-label="On this page">
      <span class="toc-label">On this page</span>
${toc}
    </nav>
    <article>
      <div class="intro">
          ${doc.intro.map(renderBlock).join('\n          ')}
      </div>
${steps}
${extras}
    </article>
  </div>
</main>`;

  return shell({
    title: doc.title,
    description: `${doc.subtitle} A step-by-step guide to ${SITE_NAME}, from your first task on your own to sharing with a family or team.`,
    activeHref: HREF,
    body,
    extraStyles: EXTRA_STYLES,
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  // Same reason as the legal site: GitHub Pages runs Jekyll over /docs by
  // default, which would try to process the Markdown living alongside this.
  await writeFile(path.join(rootDir, 'docs', '.nojekyll'), '');
  await writeFile(path.join(outDir, 'index.html'), renderPage(userGuide));

  console.log(
    `Generated docs/guide/ — ${userGuide.steps.length} steps, ${userGuide.extras.length} extra sections, ${shotCount} screenshots`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
