import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export function LoadingState() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator color={theme.primary} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
