import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, PinnedBottomClearance, WebTopNavInset } from '@/constants/theme';

export function useTabScreenInsets() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom + BottomTabInset;

  return {
    topInset: insets.top + WebTopNavInset,
    bottomInset,
    // For content pinned to `bottom: 0` of a tab screen (the Tasks compose
    // bar). Android tab screens are already padded above the tab bar by
    // expo-router's native tabs — each one is wrapped in a bottom-edge
    // SafeAreaView sized from the bar's measured height — so pinned content
    // only needs clearance there. That clearance is not optional padding: the
    // measured inset under-reports by a few dp, so at 0 the bar clips the
    // compose bar's bottom edge, rounded corners and send button. Everywhere
    // else the screen runs the full height behind the bar, so pinned content
    // clears the bar itself first.
    pinnedBottomInset:
      Platform.OS === 'android' ? PinnedBottomClearance : bottomInset + PinnedBottomClearance,
  };
}
