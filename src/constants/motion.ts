import { Easing } from 'react-native-reanimated';

/**
 * Durations for state/gesture-driven motion: a press reacting, a banner
 * fading, a sheet settling. Not for continuous loops — those use
 * `PulseCycle` below, so every "breathing" mark in the app beats at the same
 * tempo instead of each one inventing its own.
 */
export const Duration = {
  instant: 100,
  fast: 150,
  base: 250,
  slow: 400,
} as const;

/** Entrances, press-releases, anything that starts and stops once. */
export const EasingStandard = Easing.out(Easing.cubic);

/**
 * For a `withRepeat` loop specifically: sine has no velocity discontinuity
 * at the seam where one cycle hands off to the next, so the loop reads as a
 * continuous breath rather than a visible "tick" at the turnaround (which a
 * linear or cubic curve would show).
 */
export const EasingBreathe = Easing.inOut(Easing.sin);

/**
 * One half-cycle length for every "breathing" loop in the app — the stats
 * hero dot, a due-medicine ring, an empty-state glyph's float all share this
 * so they read as one system, not three unrelated animations.
 */
export const PulseCycle = 1800;

/** Shared spring for button press feedback — tuned once, reused everywhere. */
export const SpringPress = {
  damping: 14,
  stiffness: 220,
  mass: 0.5,
} as const;
