import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PrimaryButton } from '@/components/primary-button';
import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ActionIcons } from '@/constants/icons';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

/** Dims the screen behind the sheet the same amount in all nine themes. */
const SCRIM = 'rgba(0, 0, 0, 0.55)';
const RING_SIZE = 104;
const MIC_SIZE = 36;

type VoiceSheetProps = {
  listening: boolean;
  /** Interim while listening, the final sentence once it lands. */
  transcript: string;
  /** 0–1. Stays 0 in browsers, which report no levels. */
  level: number;
  /**
   * Already-humanized — the session's error, or the one line saying what was
   * just committed. Null while the transcript is the only thing to show.
   */
  message: string | null;
  tone: 'danger' | 'textSecondary';
  onCancel: () => void;
};

/**
 * What the app looks like while it is listening to you.
 *
 * It covers the four states that have something to say — listening, heard
 * nothing, denied, offline — with one shape: a ring that moves with your voice,
 * what has been heard so far, and one line when something needs saying. The
 * copy for the failures is not written here; it arrives as `message` from the
 * session hook, which is the one place an error code becomes a sentence.
 *
 * The spec's fifth state, unavailable, has no rendering on purpose: where the
 * platform can't listen, the microphone is never drawn, so this never opens.
 */
export function VoiceSheet({ listening, transcript, level, message, tone, onCancel }: VoiceSheetProps) {
  const theme = useTheme();
  const tokens = useTokens();
  const pulse = useSharedValue(0);

  // Driven from one shared value so the ring keeps moving without waiting on a
  // React render — and so a platform that reports no level (every browser)
  // still shows a live ring rather than a dead one, which is the only
  // on-screen proof that the microphone is open.
  useEffect(() => {
    pulse.value = withTiming(listening ? 0.3 + level * 0.7 : 0, { duration: 180 });
  }, [level, listening, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.7,
    transform: [{ scale: 0.7 + pulse.value * 0.4 }],
  }));

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Pressable
        style={styles.scrim}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Close voice input"
      />
      <Surface style={[styles.card, { padding: tokens.spacing.four, gap: tokens.spacing.three }]}>
        <View style={styles.ringWrap}>
          <Animated.View
            pointerEvents="none"
            style={[styles.ring, { borderColor: theme.danger }, ringStyle]}
          />
          <Ionicons
            name={ActionIcons.voice}
            size={MIC_SIZE}
            color={listening ? theme.danger : theme.textSecondary}
          />
        </View>

        {transcript ? (
          <ThemedText type="default" style={styles.centered} accessibilityLiveRegion="polite" numberOfLines={4}>
            {transcript}
          </ThemedText>
        ) : listening ? (
          <ThemedText type="default" themeColor="textSecondary" style={styles.centered}>
            Listening…
          </ThemedText>
        ) : null}

        {message ? (
          <ThemedText type="small" themeColor={tone} style={styles.centered}>
            {message}
          </ThemedText>
        ) : null}

        <PrimaryButton
          title={listening ? 'Cancel' : 'Close'}
          icon={ActionIcons.cancel}
          variant="secondary"
          onPress={onCancel}
          style={styles.action}
        />
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: Spacing.four,
    // Both are set so the sheet stays above the list on Android (elevation) as
    // well as everywhere else (zIndex) — the same pairing OfflineBanner uses.
    zIndex: 20,
    elevation: 8,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SCRIM,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
  },
});
