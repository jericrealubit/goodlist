import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSession } from '@/contexts/session-context';
import { notificationKeys } from '@/lib/query-client';
import { getUnreadCount } from '@/lib/queries/notifications';
import { supabase } from '@/lib/supabase';

// Single subscription for the whole app (mounted once from app-tabs). Bundled
// with the read here, rather than left in a Context, since the query cache
// is already the shared, deduplicated source of truth every consumer reads.
export function useUnreadCountQuery() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({ queryKey: notificationKeys.unreadCount, queryFn: getUnreadCount, enabled: !!user });
}
