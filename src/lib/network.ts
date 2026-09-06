import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

// NetInfo over expo-network: isInternetReachable does active reachability
// probing (catches Wi-Fi-but-no-internet/captive portals), not just
// interface association. Treat null/undefined signals as online — they mean
// "not yet confirmed," not "confirmed offline" — so a brief unknown state on
// startup doesn't flash the offline banner.
export function setupOnlineManager() {
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
  });
}

export function isNetworkError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof err.message === 'string' &&
    /network request failed/i.test(err.message)
  );
}
