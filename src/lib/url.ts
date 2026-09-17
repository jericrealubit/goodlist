/**
 * A pasted link is one of the things a task most often *is* — "https://…"
 * typed straight into the compose bar, with nothing else to it. These helpers
 * let a row ask "is there something to open here?" without taking on a
 * link-parsing dependency.
 *
 * Deliberately conservative: a false positive puts a dead button on a row that
 * only happened to mention something dot-shaped, which is worse than missing
 * the occasional link.
 */

// Only links that already say they are links: one carrying a scheme, or the
// bare "www." people type instead of one. A plain "goodlist.expo.app" is left
// alone — too much ordinary writing ("call at 9 a.m.") looks like a hostname.
const LINK_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'`]+/i;

// Punctuation that can't end a URL but routinely follows one in a sentence
// ("see https://expo.dev."). A closing bracket only counts as punctuation when
// the match doesn't open it itself, so paths like /wiki/Expo_(framework) keep
// their tail.
const TRAILING_PUNCTUATION = /[.,;:!?'"]+$/;
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

// After the scheme: a host with at least one dot in it, so "https://" alone or
// a typo'd "http://localhost" doesn't open a browser on nothing.
const HAS_HOST = /^https?:\/\/[^\s/?#]+\.[^\s/?#]{2,}/i;

function countOccurrences(text: string, character: string) {
  let count = 0;
  for (const char of text) if (char === character) count += 1;
  return count;
}

function trimTrailingPunctuation(candidate: string) {
  let trimmed = candidate.replace(TRAILING_PUNCTUATION, '');
  for (;;) {
    const last = trimmed.slice(-1);
    const opener = CLOSERS[last];
    if (!opener || countOccurrences(trimmed, opener) >= countOccurrences(trimmed, last)) break;
    trimmed = trimmed.slice(0, -1).replace(TRAILING_PUNCTUATION, '');
  }
  return trimmed;
}

/**
 * The first openable web link in a piece of task text, normalized to an
 * absolute URL, or `null` when there isn't one.
 */
export function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null;

  const match = text.match(LINK_PATTERN);
  if (!match) return null;

  const candidate = trimTrailingPunctuation(match[0]);
  const url = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  return HAS_HOST.test(url) ? url : null;
}

/**
 * The host of a URL, without scheme or "www.", for labelling the control that
 * opens it ("Open vercel.com"). Falls back to the whole URL if it somehow has
 * no host — a label is never worth throwing over.
 */
export function urlHost(url: string): string {
  const host = url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0];
  return host || url;
}
