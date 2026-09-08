// Locates a Chromium binary for the headless rendering scripts
// (generate-guide-screens.mjs, generate-store-screenshots.mjs).
//
// Preference order is deliberate: an explicit override first, then a browser
// Playwright has already downloaded, then whatever is on PATH. Inside a
// Playwright browsers directory, headless_shell is preferred over the full
// chrome binary — it is the build these scripts are known to render with.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function findChrome() {
  const explicit = process.env.GOODLIST_CHROME || process.env.CHROME_PATH;
  if (explicit && existsSync(explicit)) return explicit;

  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (base && existsSync(base)) {
    // A PLAYWRIGHT_BROWSERS_PATH can also point straight at a binary or at a
    // directory holding one, rather than at Playwright's versioned layout.
    if (existsSync(join(base, 'chromium'))) return join(base, 'chromium');

    const dirs = readdirSync(base);
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
