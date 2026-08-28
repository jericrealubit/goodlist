import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { useSession } from '@/contexts/session-context';
import { markAllNotificationsRead } from '@/lib/mutations/notifications';
import { getUnreadCount } from '@/lib/queries/notifications';
import { supabase } from '@/lib/supabase';

type NotificationsContextValue = {
  unreadCount: number;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { user } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setUnreadCount(await getUnreadCount());
    } catch {
      // Best-effort: an unread badge is not critical enough to surface a
      // dedicated error state for — a transient failure just leaves the
      // count as-is until the next successful refresh or realtime event.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setUnreadCount((count) => count + 1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      refresh();
    }
  }, [unreadCount, refresh]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
