import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { ShareBreakdown, type ShareSegment } from '@/components/share-breakdown';
import { StatTile } from '@/components/stat-tile';
import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useTheme } from '@/hooks/use-theme';
import { useUserStatsQuery } from '@/hooks/use-stats-query';
import { mixHex, washToSurface } from '@/lib/color';
import { getErrorMessage } from '@/lib/errors';

function formatWindow(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function formatUpdatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useUserStatsQuery();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (isLoading) {
    return <LoadingState />;
  }

  // Only a *failure with nothing to show* takes over the screen — a background
  // refresh that fails keeps the last good numbers on screen, with the
  // "Updated at" line below saying how old they are.
  if (isError && !data) {
    return (
      <EmptyState
        title="Couldn’t load statistics"
        message={getErrorMessage(error, 'Something went wrong loading the community statistics.')}
        actionLabel="Retry"
        onAction={refetch}
      />
    );
  }

  // Offline with nothing cached, react-query pauses the fetch rather than
  // failing it — so this is the offline landing, not an empty dataset.
  if (!data) {
    return (
      <EmptyState
        title={isOnline ? 'No statistics yet' : 'You’re offline'}
        message={
          isOnline
            ? 'Check back once the numbers are in.'
            : 'Community statistics need an internet connection. They’ll load as soon as you’re back online.'
        }
        actionLabel="Retry"
        onAction={refetch}
      />
    );
  }

  const grouped = data.one_group_users + data.two_group_users;

  // These buckets are an ordered scale (0 → 1 → 2 groups), so they get a
  // sequential ramp — one hue, weak to strong — rather than three categorical
  // colors that would imply the buckets are unrelated.
  //
  // The ramp is built around `primary` in both directions instead of washing
  // down from it: washing alone leaves the pale end too faint on the themes
  // whose primary already sits close to their card color, and the steps end up
  // too close together to tell apart.
  const surface = theme.backgroundElement;
  const segments: ShareSegment[] = [
    {
      key: 'solo',
      label: 'Solo — no group',
      value: data.solo_users,
      color: washToSurface(theme.primary, surface),
    },
    {
      key: 'one',
      label: 'In 1 group',
      value: data.one_group_users,
      color: theme.primary,
    },
    {
      key: 'two',
      label: 'In 2 groups',
      value: data.two_group_users,
      color: mixHex(theme.primary, theme.text, 0.4),
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.six }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <ThemedView style={styles.intro}>
          <ThemedText type="header">Community</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            How everyone is using Goodlist right now. Counts only — no names, and nothing about
            anyone’s tasks.
          </ThemedText>
        </ThemedView>

        {/* The one hero figure on this screen: the number it leads with. */}
        <StatTile
          hero
          label="Live now"
          value={data.live_users}
          caption={`Active in the last ${formatWindow(data.live_window_seconds)}`}
          dotColor={theme.accent}
        />

        <View style={styles.tileRow}>
          <StatTile label="Registered" value={data.total_users} caption="Accounts created" />
          <StatTile label="Sharing" value={grouped} caption="In at least one group" />
        </View>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Group membership
          </ThemedText>
          <Surface style={styles.card}>
            <ShareBreakdown segments={segments} total={data.total_users} />
          </Surface>
          <ThemedText type="small" themeColor="textSecondary">
            Two groups is the current maximum per account.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.footer}>
          {!isOnline ? (
            <ThemedText type="small" themeColor="textSecondary">
              You’re offline — showing the last numbers this device loaded.
            </ThemedText>
          ) : null}
          {dataUpdatedAt ? (
            <ThemedText type="small" themeColor="textSecondary">
              Updated {formatUpdatedAt(dataUpdatedAt)} · refreshes automatically
            </ThemedText>
          ) : null}
        </ThemedView>
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
    gap: Spacing.four,
  },
  intro: {
    gap: Spacing.two,
  },
  tileRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.four,
  },
  footer: {
    gap: Spacing.one,
  },
});
