import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/constants/icons';
import { SpringPress } from '@/constants/motion';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { tapLight, tapWarning } from '@/lib/haptics';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  /** Draws to the left of the title. Pick it from `ActionIcons`. */
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
};

const GLYPH_SIZE = 18;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({
  title,
  onPress,
  icon,
  loading,
  disabled,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const tokens = useTokens();
  const isDisabled = disabled || loading;
  // A plain boolean + effect, not a shared value mutated straight from the
  // press handlers — mutating `.value` inside an inline JSX callback trips
  // the React Compiler's immutability check; inside an effect (the same
  // shape `mic-button.tsx` already uses) it's the sanctioned escape hatch.
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(pressed ? 0.96 : 1, SpringPress);
  }, [pressed, scale]);

  const backgroundColor =
    variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : theme.backgroundElement;
  const textColor = variant === 'secondary' ? theme.text : '#ffffff';

  // Press feedback, not idle motion: a button reacting to a touch reads as
  // responsive; a button moving on its own with nobody touching it reads as
  // a bug. See constants/motion.ts for the shared spring tuning.
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    if (variant === 'danger') tapWarning();
    else tapLight();
    onPress();
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        {
          backgroundColor,
          borderRadius: tokens.radii.sm,
          paddingVertical: tokens.spacing.three,
          gap: tokens.spacing.two,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
        pressStyle,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={GLYPH_SIZE} color={textColor} /> : null}
          <ThemedText type="smallBold" style={{ color: textColor }}>
            {title}
          </ThemedText>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
