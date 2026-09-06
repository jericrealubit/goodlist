import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabase';

let channelSequence = 0;

// Invalidates the tasks query cache rather than patching local state from
// the payload — a plain refetch is simple and RLS already scopes which rows
// a subscriber actually receives, so no column filter is needed here.
//
// Channel names must be unique per subscription: expo-router/ui's Tabs keeps
// every visited tab's screen mounted (not unmounted on switch), so both the
// Tasks and History screens can hold a live `useRealtimeTasks` subscription
// at once. A shared/hardcoded channel name causes the second `.channel()`
// call to return the same, already-subscribed channel object, and calling
// `.on()` on it throws.
export function useRealtimeTasks() {
  const queryClient = useQueryClient();
  const nameRef = useRef<string | null>(null);
  if (nameRef.current === null) {
    nameRef.current = `tasks-changes-${channelSequence++}`;
  }

  useEffect(() => {
    const channel = supabase
      .channel(nameRef.current!)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () =>
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
