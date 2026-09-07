import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevSignatureBadge } from '@/components/dev-signature-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

const FEATURES = [
  'Keep a personal to-do list that syncs across your devices, even offline.',
  'Create or join up to two groups — Family or Team mode, each with its own member roles.',
  'Request a task from a group member, and jump straight to that task’s group.',
  'Drag to reorder, tap or swipe to complete, and reopen anything you finish by mistake.',
  'Browse a full history of finished and cancelled tasks, each timestamped with when it was completed.',
  'Get notified the moment someone requests a task from you — updates arrive live across every device.',
  'Works offline: changes queue up and sync automatically once you’re back online.',
  'Pick from nine built-in color themes, light or dark.',
  'See anonymous community stats — how many people use Goodlist, and how many share a group.',
];

const TECH_STACK = [
  'React Native',
  'Expo',
  'Expo Router',
  'TypeScript',
  'Supabase',
  'PostgreSQL',
  'TanStack Query',
  'Reanimated',
];

export default function AboutScreen() {
  const theme = useTheme();
  const tokens = useTokens();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.six }]}>
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
