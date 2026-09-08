// Renders the front door of the published site — the page the wordmark links
// to from every other page, and what https://jericrealubit.github.io/goodlist/
// serves. Without it that bare URL 404s and only the section pages resolve.
//
// Run with: npm run index:site  (or npm run site, which builds all three)
// Output:   docs/index.html
//
// Deliberately thin: it points at the sections rather than restating them, so
// there is no copy here that can drift from src/content/guide.ts or
// src/content/legal.ts.
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { SITE_BASE, SITE_NAME, escape, shell } from './lib/site-shell.mjs';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(rootDir, 'docs');

/** The app's own tagline, from src/app/(auth)/sign-in.tsx. */
const TAGLINE = 'A better place for your everyday tasks.';

const SECTIONS = [
  {
    href: `${SITE_BASE}/guide/`,
    title: 'How to use Goodlist',
    blurb:
      'A plain-language walkthrough with a picture for every step — from your first task on your own to sharing with a family or team.',
  },
  {
    href: `${SITE_BASE}/legal/`,
    title: 'Legal & privacy',
    blurb:
      'The privacy policy, terms of service, and how to delete your account — the same text shown inside the app.',
  },
];

const EXTRA_STYLES = `
  .hero-lede { font-size: 17px; max-width: 54ch; }
`;

function renderIndex() {
  const cards = SECTIONS.map(
    ({ href, title, blurb }) =>
      `    <a class="card" href="${href}"><b>${escape(title)}</b><span>${escape(blurb)}</span></a>`,
  ).join('\n');

  const body = `<main>
  <div class="hero">
    <h1>${SITE_NAME}</h1>
    <p class="hero-lede">${escape(TAGLINE)} Keep your own to-do list, and share tasks with a small family or team group.</p>
  </div>
  <div class="cards">
${cards}
  </div>
</main>`;

  return shell({
    title: SITE_NAME,
    description: `${TAGLINE} User guide, privacy policy and terms for the ${SITE_NAME} task app.`,
    activeHref: null,
    body,
    extraStyles: EXTRA_STYLES,
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  // Same reason as the other two builders: GitHub Pages runs Jekyll over /docs
  // by default, which would try to process the Markdown living alongside this.
  await writeFile(path.join(outDir, '.nojekyll'), '');
  await writeFile(path.join(outDir, 'index.html'), renderIndex());

  console.log(`Generated docs/index.html — ${SECTIONS.length} sections`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
