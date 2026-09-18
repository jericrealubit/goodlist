import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { RoundActionButton } from '@/components/round-action-button';
import { ActionIcons } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';

type MicButtonProps = {
  listening: boolean;
  starting?: boolean;
  /** 0–1. Stays 0 where the recognizer reports no levels, which is every browser. */
  level: number;
  onPress: () => void;
  disabled?: boolean;
};

const RING_SIZE = 56;

/**
 * The compose bar's microphone: the same round button as send, wrapped in a
 * ring that breathes with how loudly you're speaking.
 *
 * The ring is driven entirely from one shared value so the animation never
 * depends on a React render landing — and so a platform that reports no volume
 * (any browser) still gets a steady ring rather than a dead one, which is the
 * only on-screen proof that the microphone is live.
 */
export function MicButton({ listening, starting, level, onPress, disabled }: MicButtonProps) {
  const theme = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withTiming(listening ? 0.25 + level * 0.75 : 0, { duration: 180 });
  }, [level, listening, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.6,
    transform: [{ scale: 0.75 + pulse.value * 0.35 }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderColor: theme.danger }, ringStyle]}
      />
      <RoundActionButton
        icon={listening ? ActionIcons.voiceListening : ActionIcons.voice}
        onPress={onPress}
        disabled={disabled}
        loading={starting}
        accessibilityLabel={listening ? 'Stop listening' : 'Start voice input'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
  },
});
