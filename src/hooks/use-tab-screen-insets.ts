import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, WebTopNavInset } from '@/constants/theme';

export function useTabScreenInsets() {
  const insets = useSafeAreaInsets();
  return {
    topInset: insets.top + WebTopNavInset,
    bottomInset: insets.bottom + BottomTabInset,
  };
}
