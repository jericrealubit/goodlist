import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionIcons, type IconName } from '@/constants/icons';
import { Spacing } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  /** Defaults to the retry glyph, which is what every caller wants today. */
  actionIcon?: IconName;
  onAction?: () => void;
  /** 'secondary' (default) suits a quiet Retry; a first-run "add" CTA wants 'primary' to stand out. */
  actionVariant?: 'primary' | 'secondary';
};

export function EmptyState({
  title,
  message,
  actionLabel,
  actionIcon = ActionIcons.retry,
  onAction,
  actionVariant = 'secondary',
}: EmptyStateProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.centerText}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {message}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          title={actionLabel}
          icon={actionIcon}
          onPress={onAction}
          variant={actionVariant}
          style={styles.action}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  action: {
    // Full-width, like the Create/Join buttons on the Group screen — a
    // shrink-wrapped pill leaves the label hugging its rounded edges.
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
});
