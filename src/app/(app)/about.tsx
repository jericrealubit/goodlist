import Constants from 'expo-constants';
import { StyleSheet } from 'react-native';

import { DevSignatureBadge } from '@/components/dev-signature-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedView style={styles.top}>
          <ThemedText type="title">goodlist</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Version {version}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            A better place for your everyday tasks.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.bottom}>
          <DevSignatureBadge />
        </ThemedView>
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
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    justifyContent: 'space-between',
  },
  top: {
    gap: Spacing.three,
  },
  bottom: {
    alignItems: 'center',
  },
});
