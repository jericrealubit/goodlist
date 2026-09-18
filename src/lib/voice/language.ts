import * as Localization from 'expo-localization';

/**
 * What the speech recognizer is asked to listen for. Derived from the device's
 * own language setting rather than a picker: someone whose phone is in Spanish
 * expects to be able to speak Spanish, and asking them twice is friction with
 * no payoff.
 *
 * `getLocales()` is typed as a non-empty tuple, so indexing `[0]` needs no
 * length guard — but a tag can still come back empty on web, where it is
 * parsed from the browser locale. `en-US` is the fallback because it is the
 * one locale every recognizer in the compatibility matrix supports.
 */
const FALLBACK_LANGUAGE = 'en-US';

export function getRecognitionLanguage(): string {
  const [locale] = Localization.getLocales();
  const tag = locale.languageTag?.trim();
  return tag || FALLBACK_LANGUAGE;
}
