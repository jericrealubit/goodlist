import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import type { DeviceLocale } from '@/lib/device-locale';
import { syncDeviceLocale, updateDisplayName, updateLocaleSharing } from '@/lib/mutations/profile';
import { groupKeys, profileKeys, queryClient } from '@/lib/query-client';
import type { GroupSummary, Profile } from '@/lib/types';

type UpdateDisplayNameVariables = { userId: string; displayName: string };
type UpdateDisplayNameContext = { previousProfile?: Profile | null; previousGroups?: GroupSummary[] };

export const updateDisplayNameMutationOptions: UseMutationOptions<
  Profile,
  Error,
  UpdateDisplayNameVariables,
  UpdateDisplayNameContext
> = {
  mutationKey: ['profile', 'updateDisplayName'],
  mutationFn: ({ userId, displayName }) => updateDisplayName(userId, displayName),
  onMutate: async ({ userId, displayName }) => {
    await Promise.all([
      queryClient.cancelQueries({ queryKey: profileKeys.mine }),
      queryClient.cancelQueries({ queryKey: groupKeys.mine }),
    ]);
    const previousProfile = queryClient.getQueryData<Profile | null>(profileKeys.mine);
    const previousGroups = queryClient.getQueryData<GroupSummary[]>(groupKeys.mine);
    const trimmed = displayName.trim() || null;

    queryClient.setQueryData<Profile | null>(profileKeys.mine, (old) => (old ? { ...old, display_name: trimmed } : old));
    // group.tsx renders member names from this separate query — patch the
    // matching member entry in every group the user belongs to (up to 2), or
    // a self-rename won't show up there until the next refetch.
    queryClient.setQueryData<GroupSummary[]>(groupKeys.mine, (old) =>
      old?.map((group) => ({
        ...group,
        members: group.members.map((m) =>
          m.user_id === userId ? { ...m, profiles: { ...m.profiles, display_name: trimmed } } : m,
        ),
      })),
    );
    return { previousProfile, previousGroups };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousProfile !== undefined) queryClient.setQueryData(profileKeys.mine, context.previousProfile);
    if (context?.previousGroups !== undefined) queryClient.setQueryData(groupKeys.mine, context.previousGroups);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: profileKeys.mine });
    queryClient.invalidateQueries({ queryKey: groupKeys.mine });
  },
};

export function useUpdateDisplayNameMutation() {
  return useMutation(updateDisplayNameMutationOptions);
}

type SyncDeviceLocaleVariables = { userId: string; locale: DeviceLocale };
type ProfileOnlyContext = { previousProfile?: Profile | null };

// Background telemetry, not a user action: no error is ever surfaced, and a
// failed write simply leaves the old values in place until the next launch.
export const syncDeviceLocaleMutationOptions: UseMutationOptions<
  Profile,
  Error,
  SyncDeviceLocaleVariables,
  ProfileOnlyContext
> = {
  mutationKey: ['profile', 'syncDeviceLocale'],
  mutationFn: ({ userId, locale }) => syncDeviceLocale(userId, locale),
  onMutate: async ({ locale }) => {
    await queryClient.cancelQueries({ queryKey: profileKeys.mine });
    const previousProfile = queryClient.getQueryData<Profile | null>(profileKeys.mine);
    // Patch the cache immediately so useSyncDeviceLocale() stops seeing a
    // difference and doesn't fire again while this write is in flight.
    queryClient.setQueryData<Profile | null>(profileKeys.mine, (old) => (old ? { ...old, ...locale } : old));
    return { previousProfile };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousProfile !== undefined) queryClient.setQueryData(profileKeys.mine, context.previousProfile);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: profileKeys.mine });
  },
};

export function useSyncDeviceLocaleMutation() {
  return useMutation(syncDeviceLocaleMutationOptions);
}

type UpdateLocaleSharingVariables = { userId: string; enabled: boolean };

export const updateLocaleSharingMutationOptions: UseMutationOptions<
  Profile,
  Error,
  UpdateLocaleSharingVariables,
  ProfileOnlyContext
> = {
  mutationKey: ['profile', 'updateLocaleSharing'],
  mutationFn: ({ userId, enabled }) => updateLocaleSharing(userId, enabled),
  onMutate: async ({ enabled }) => {
    await queryClient.cancelQueries({ queryKey: profileKeys.mine });
    const previousProfile = queryClient.getQueryData<Profile | null>(profileKeys.mine);
    // Mirror the server-side clearing so the switch and the stored values stay
    // consistent on screen even before the write lands.
    queryClient.setQueryData<Profile | null>(profileKeys.mine, (old) =>
      old
        ? {
            ...old,
            locale_sharing: enabled,
            ...(enabled ? null : { region_code: null, time_zone: null, locale_updated_at: null }),
          }
        : old,
    );
    return { previousProfile };
  },
  onError: (_err, _vars, context) => {
    if (context?.previousProfile !== undefined) queryClient.setQueryData(profileKeys.mine, context.previousProfile);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: profileKeys.mine });
  },
};

export function useUpdateLocaleSharingMutation() {
  return useMutation(updateLocaleSharingMutationOptions);
}
