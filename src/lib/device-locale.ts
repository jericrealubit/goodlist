import * as Localization from 'expo-localization';

/**
 * The two coarse locale values Goodlist stores on a profile, read from the
 * device's own language/region settings. Nothing here comes from GPS, a
 * permission prompt, or an IP lookup.
 *
 * `region_code` is exact — it is the Region the user picked in OS settings.
 * `time_zone` is only ever a *proxy* for anything finer: an IANA zone is
 * `Area/Location`, and for most countries it says nothing about which state or
 * city someone is in. See the precision note in `supabase/schema.sql`.
 */
export type DeviceLocale = {
  region_code: string | null;
  time_zone: string | null;
};

/**
 * Reads the device region and time zone. Both SDK calls are synchronous and
 * typed as non-empty tuples (`[Locale, ...Locale[]]`), so indexing `[0]` needs
 * no length guard. Either field can still be null — notably on web, where the
 * region is parsed from the browser locale and may be absent.
 */
export function getDeviceLocale(): DeviceLocale {
  const [locale] = Localization.getLocales();
  const [calendar] = Localization.getCalendars();

  return {
    // Uppercased to satisfy the profiles_region_code_check constraint, which
    // expects ISO 3166-1 alpha-2 in caps.
    region_code: locale.regionCode ? locale.regionCode.toUpperCase() : null,
    time_zone: calendar.timeZone ?? null,
  };
}

/** True when the device's current values differ from what's already stored. */
export function deviceLocaleHasChanged(stored: DeviceLocale, device: DeviceLocale): boolean {
  return stored.region_code !== device.region_code || stored.time_zone !== device.time_zone;
}
