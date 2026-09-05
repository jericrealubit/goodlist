import { ScrollView, StyleSheet } from 'react-native';

import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

export default function PreviewThemes() {
  const theme = useTheme();
  const tokens = useTokens();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { gap: tokens.spacing.four }]}>
        <ThemedText type="title">Title</ThemedText>
        <ThemedText type="header">Header</ThemedText>
        <ThemedText type="subtitle">Subtitle</ThemedText>
        <ThemedText type="default">Default body text for reading.</ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Small bold secondary
        </ThemedText>
        <ThemedText type="linkPrimary">Primary link</ThemedText>

        <Surface style={[styles.card, { padding: tokens.spacing.four }]} radius="lg">
          <ThemedText type="header">Card surface</ThemedText>
          <ThemedText type="default">surface: {tokens.surface}</ThemedText>
          <ThemedText type="default">radii.lg: {tokens.radii.lg}</ThemedText>
          <ThemedText type="default">borderWidth: {tokens.cardBorderWidth}</ThemedText>
        </Surface>

        <ThemedView style={{ gap: tokens.spacing.two }}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Theme
          </ThemedText>
          <ThemeSwitcher />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  card: {},
});
