import { useEffect } from 'react';

import { useSyncDeviceLocaleMutation } from '@/hooks/use-profile-mutations';
import { useProfileQuery } from '@/hooks/use-profile-query';
import { deviceLocaleHasChanged, getDeviceLocale } from '@/lib/device-locale';

/**
 * Keeps the signed-in user's stored region/time zone in step with the device,
 * writing only when they actually differ. Mounted once at the authenticated
 * layout boundary.
 *
 * This is the textbook case for an effect — synchronising with an external
 * system — rather than the "adjust state during render" pattern used elsewhere
 * in this codebase for derived state.
 *
 * Fire-and-forget by design: it renders nothing, blocks nothing, and never
 * surfaces an error. If the write fails while offline, the existing persisted
 * mutation queue resumes it later; worst case the values refresh next launch.
 */
export function useSyncDeviceLocale() {
  const { data: profile } = useProfileQuery();
  const { mutate, isPending } = useSyncDeviceLocaleMutation();

  const profileId = profile?.id ?? null;
  const sharing = profile?.locale_sharing ?? false;
  const storedRegion = profile?.region_code ?? null;
  const storedZone = profile?.time_zone ?? null;

  useEffect(() => {
    if (!profileId || !sharing || isPending) return;

    const device = getDeviceLocale();
    if (!deviceLocaleHasChanged({ region_code: storedRegion, time_zone: storedZone }, device)) return;

    mutate({ userId: profileId, locale: device });
    // Depends on the individual stored fields rather than the profile object,
    // which is a fresh reference after every background refetch.
  }, [profileId, sharing, storedRegion, storedZone, isPending, mutate]);
}
