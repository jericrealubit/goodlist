import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/contexts/session-context';
import { touchLastSeen } from '@/lib/mutations/presence';

// Half the server's 2-minute live window (see app_user_stats in
// supabase/schema.sql), so one dropped beat doesn't blink the user out of the
// live count.
const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Marks the signed-in user as present, every 60s while the app is in the
 * foreground, so `app_user_stats()` can count who is live right now.
 *
 * Mounted once from the authenticated layout rather than from the stats
 * screen: "live users" has to mean everyone with the app open, not just
 * whoever happens to be looking at the statistics.
 */
export function usePresenceHeartbeat() {
  const { user } = useSession();
  // Depend on the id, not the user object — a token refresh hands back a new
  // object identity and would otherwise restart the interval.
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function beat() {
      // A backgrounded app isn't "live", and its timers can still fire before
      // the OS suspends them.
      if (cancelled || AppState.currentState !== 'active') return;
      try {
        await touchLastSeen();
      } catch {
        // Best effort: a missed beat costs this user a slot in the live count
        // until the next one, which isn't worth surfacing to them.
      }
    }

    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    // Coming back from the background shouldn't wait out the remainder of the
    // interval before the user reappears as live.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') beat();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, [userId]);
}
