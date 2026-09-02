import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DevSignatureBadge } from '@/components/dev-signature-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

const FEATURES = [
  'Keep a personal to-do list that syncs across your devices.',
  'Share a household or group and hand off tasks to each other.',
  'Request a task from a member and track it until it’s done.',
  'Drag to reorder, check off when complete, and reopen if needed.',
  'Browse a full history of finished tasks — with one-tap undo.',
  'Everyone in a group sees changes the moment they happen.',
];

const TECH_STACK = [
  'React Native',
  'Expo',
  'Expo Router',
  'TypeScript',
  'Supabase',
  'PostgreSQL',
  'Reanimated',
];

export default function AboutScreen() {
  const theme = useTheme();
  const tokens = useTokens();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.top}>
          <ThemedText type="title">goodlist</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Version {version}
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            A better place for your everyday tasks.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            What it does
          </ThemedText>
          <ThemedView style={styles.featureList}>
            {FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <View style={[styles.bullet, { backgroundColor: theme.accent }]} />
                <ThemedText type="default" style={styles.featureText}>
                  {feature}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Built with
          </ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            A cross-platform Expo app with a realtime Supabase backend.
          </ThemedText>
          <View style={styles.chipRow}>
            {TECH_STACK.map((tech) => (
              <ThemedView
                key={tech}
                type="backgroundElement"
                style={[
                  styles.chip,
                  { borderColor: theme.border, borderWidth: tokens.borderWidth, borderRadius: tokens.radii.pill },
                ]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {tech}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        </ThemedView>

        <View style={styles.badge}>
          <DevSignatureBadge />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.five,
  },
  top: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.three,
  },
  featureList: {
    gap: Spacing.three,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  featureText: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  badge: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
