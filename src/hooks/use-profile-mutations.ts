import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { updateDisplayName } from '@/lib/mutations/profile';
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
