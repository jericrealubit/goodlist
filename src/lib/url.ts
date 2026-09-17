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

// The scheme and a leading "www." carry no information — every link has them —
// so both come off before a URL is shown or spoken.
function bareUrl(url: string) {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
}

/**
 * The host of a URL, without scheme or "www.", for labelling the control that
 * opens it ("Open vercel.com"). Falls back to the whole URL if it somehow has
 * no host — a label is never worth throwing over.
 */
export function urlHost(url: string): string {
  const host = bareUrl(url).split(/[/?#]/)[0];
  return host ? host.toLowerCase() : url;
}

/**
 * A URL as it should read on screen: scheme and "www." dropped, everything
 * else kept, because the path is what tells two links from the same site
 * apart. A trailing "/" goes too. The host is lowercased — hosts are
 * case-insensitive — while the path keeps the case it was typed in, since
 * that part of a URL isn't.
 */
export function urlLabel(url: string): string {
  const bare = bareUrl(url);
  const hostEnd = bare.search(/[/?#]/);
  if (hostEnd === -1) return bare ? bare.toLowerCase() : url;

  const host = bare.slice(0, hostEnd).toLowerCase();
  const path = bare.slice(hostEnd).replace(/\/+$/, '');
  return host ? host + path : url;
}

/**
 * The URL a piece of text consists *entirely* of, or `null` when it is prose
 * that merely contains one. "https://vercel.com/academy" qualifies; "Read
 * https://vercel.com/academy first" doesn't — there the words are the task.
 */
export function urlOnly(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  const url = extractUrl(trimmed);
  if (!trimmed || !url) return null;

  return trimmed === url || `https://${trimmed}` === url ? url : null;
}

/**
 * How a task's title should read on a row. A title that is nothing but a link
 * sheds the parts that repeat on every link and keeps the rest:
 * "play.google.com/console/u/0/developers". Everything else is left exactly as
 * it was typed — and the stored title is never rewritten either, so the editor
 * still opens on the full URL.
 */
export function displayTitle(title: string): string {
  const url = urlOnly(title);
  return url ? urlLabel(url) : title;
}
