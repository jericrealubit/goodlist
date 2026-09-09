import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { IconName } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

type HeaderActionProps = {
  label: string;
  icon: IconName;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
};

const GLYPH_SIZE = 16;
// Wide enough for the spinner that replaces the glyph while saving, so the
// pill keeps its width instead of twitching on every press.
const GLYPH_SLOT = 20;

/**
 * The compact icon + label pill used for a form's primary action, either in a
 * stack header's `headerRight` or at the top right of an inline form. It sits
 * above the keyboard rather than below the fields, so "Save" stays reachable
 * while the user is still typing.
 */
export function HeaderAction({
  label,
  icon,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: HeaderActionProps) {
  const theme = useTheme();
  const tokens = useTokens();
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';
  const contentColor = isPrimary ? '#ffffff' : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: isPrimary ? theme.primary : theme.backgroundElement,
          borderRadius: tokens.radii.pill,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}>
      <View style={styles.glyphSlot}>
        {loading ? (
          <ActivityIndicator size="small" color={contentColor} />
        ) : (
          <Ionicons name={icon} size={GLYPH_SIZE} color={contentColor} />
        )}
      </View>
      <ThemedText type="smallBold" style={{ color: contentColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/**
 * Wrapper for whatever a stack renders as its `headerRight`. The JS header
 * used on web leaves nothing between that element and the screen edge (the
 * native iOS/Android headers inset it themselves), so this gives the gap back
 * on web only.
 */
export function HeaderActionSlot({ children }: { children: ReactNode }) {
  return <View style={styles.slot}>{children}</View>;
}

const styles = StyleSheet.create({
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginRight: Platform.select({ web: Spacing.three }) ?? 0,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  glyphSlot: {
    width: GLYPH_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
