import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { medicationKeys } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

let channelSequence = 0;

// Same shape as useRealtimeTasks: invalidate rather than patch (RLS already
// scopes what arrives), and a unique channel name per subscription because
// tab screens stay mounted and a shared name would hand back an
// already-subscribed channel.
export function useRealtimeMedications() {
  const queryClient = useQueryClient();
  const nameRef = useRef<string | null>(null);
  if (nameRef.current === null) {
    nameRef.current = `medications-changes-${channelSequence++}`;
  }

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: medicationKeys.all });
    const channel = supabase
      .channel(nameRef.current!)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medication_doses' }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
