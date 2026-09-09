import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

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
        {
          backgroundColor,
          borderRadius: tokens.radii.sm,
          paddingVertical: tokens.spacing.three,
          gap: tokens.spacing.two,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
