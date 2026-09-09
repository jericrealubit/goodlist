import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type FormHeaderProps = {
  title: string;
  /** The form's actions — a <HeaderAction />, or a couple of them. */
  children: ReactNode;
};

/**
 * Section title on the left, actions on the right, for forms that live inside
 * a screen rather than behind a stack header (Settings, the group card). Gives
 * those forms the same "Save is up and to the right" shape the modal screens
 * get from `headerRight`. Plain Views, not ThemedViews, so it stays
 * transparent over whatever surface it is placed on.
 */
export function FormHeader({ title, children }: FormHeaderProps) {
  return (
    <View style={styles.row}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
