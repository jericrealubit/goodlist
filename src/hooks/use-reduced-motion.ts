import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the OS "Reduce Motion" setting is on. Every continuous animation
 * added after `dev-signature-badge.tsx` should check this and skip mounting
 * its animated value entirely rather than starting it and relying on
 * Reanimated's own `ReduceMotion.System` to no-op it — a component that
 * never animates in the first place also never pays the worklet cost.
 * `dev-signature-badge.tsx`'s flame loop is the one deliberate exception
 * that ignores this setting; nothing else should follow that lead.
 *
 * Defaults to `false` until the OS answers, which is never wrong for longer
 * than a frame: nothing here needs to be right before first paint, only
 * before an animation would otherwise start.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
