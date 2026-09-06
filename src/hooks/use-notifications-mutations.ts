import { useMutation, type UseMutationOptions } from '@tanstack/react-query';

import { markAllNotificationsRead } from '@/lib/mutations/notifications';
import { notificationKeys, queryClient } from '@/lib/query-client';

export const markAllReadMutationOptions: UseMutationOptions<void, Error, void, { previous?: number }> = {
  mutationKey: ['notifications', 'markAllRead'],
  mutationFn: markAllNotificationsRead,
  onMutate: async () => {
    await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount });
    const previous = queryClient.getQueryData<number>(notificationKeys.unreadCount);
    queryClient.setQueryData(notificationKeys.unreadCount, 0);
    return { previous };
  },
  onError: (_err, _vars, context) => {
    if (context?.previous !== undefined) {
      queryClient.setQueryData(notificationKeys.unreadCount, context.previous);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
  },
};

export function useMarkAllReadMutation() {
  return useMutation(markAllReadMutationOptions);
}
