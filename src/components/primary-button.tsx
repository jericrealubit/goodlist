import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useSurfaceStyle } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
};

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const tokens = useTokens();
  // A secondary button is filled with backgroundElement — the same colour as a
  // card. On top of one it would have no edge at all, so it takes the active
  // design style's surface treatment (border for the bordered styles, shadow
  // for the elevated ones) and reads as a raised control on any background.
  const surfaceStyle = useSurfaceStyle('sm');
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : theme.backgroundElement;
  const textColor = variant === 'secondary' ? theme.text : '#ffffff';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' ? surfaceStyle : null,
        {
          backgroundColor,
          borderRadius: tokens.radii.sm,
          paddingVertical: tokens.spacing.three,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText type="smallBold" style={{ color: textColor }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
