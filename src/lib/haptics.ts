import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * The app's one haptic vocabulary, funnelled through two calls so the
 * `Platform.OS === 'web'` guard (expo-haptics has no web implementation) is
 * written once instead of copied at every new call site — before this file,
 * three call sites each carried their own copy, one of them without the
 * guard at all.
 */

/** A light tap for an ordinary confirmed action: a press, a toggle, a save. */
export function tapLight(): void {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** A firmer double-pulse for something reversing or undoing a prior action. */
export function tapWarning(): void {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
