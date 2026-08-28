import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, WebTopNavInset } from '@/constants/theme';

export default function HouseholdScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <ThemedView
        style={[
          styles.content,
          {
            paddingTop: insets.top + WebTopNavInset + Spacing.six,
            paddingBottom: insets.bottom + BottomTabInset,
          },
        ]}>
        <ThemedText style={styles.icon}>🌱</ThemedText>
        <ThemedText type="subtitle" style={styles.centerText}>
          You're using Goodlist solo
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          Add a partner or child later to start sharing Requested tasks. Your Personal tasks stay
          exactly as they are when you do.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  icon: {
    fontSize: 40,
  },
  centerText: {
    textAlign: 'center',
  },
});
