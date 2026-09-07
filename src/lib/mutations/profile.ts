import type { DeviceLocale } from '@/lib/device-locale';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

/**
 * Stores the device's region and time zone on the caller's own profile row.
 * Covered by the existing "Users can update their own profile" RLS policy —
 * no extra grant needed.
 */
export async function syncDeviceLocale(userId: string, locale: DeviceLocale): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...locale, locale_updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Flips the locale-sharing opt-out. Turning it off clears the stored values in
 * the same write, so opting out actually removes the data rather than just
 * hiding it from the report.
 */
export async function updateLocaleSharing(userId: string, enabled: boolean): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(
      enabled
        ? { locale_sharing: true }
        : { locale_sharing: false, region_code: null, time_zone: null, locale_updated_at: null },
    )
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() || null })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
