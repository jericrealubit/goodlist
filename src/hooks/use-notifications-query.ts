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

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // A prior mount's cleanup may still be mid-flight (removeChannel is
      // async): supabase.channel() dedupes by topic and would otherwise hand
      // back that still-`joined` channel, and .on() throws on it.
      const stale = supabase.getChannels().find((c) => c.topic === 'realtime:notifications-changes');
      if (stale) await supabase.removeChannel(stale);
      if (cancelled) return;

      channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount }),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({ queryKey: notificationKeys.unreadCount, queryFn: getUnreadCount, enabled: !!user });
}
