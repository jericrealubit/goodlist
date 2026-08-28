import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  message?: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
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
});
