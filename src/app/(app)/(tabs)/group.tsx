import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { GroupCard } from '@/components/group-card';
import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useGroupsQuery } from '@/hooks/use-group-query';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';
import { getErrorMessage } from '@/lib/errors';

const MAX_GROUPS = 2;

export default function GroupScreen() {
  const { topInset, bottomInset } = useTabScreenInsets();
  const router = useRouter();
  const { user } = useSession();
  const { data: groups, isLoading, isError, error: queryError, refetch } = useGroupsQuery();
  const error = isError && !groups ? getErrorMessage(queryError, 'Could not load your groups.') : null;
  const isOnline = useOnlineStatus();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <EmptyState title="Something went wrong" message={error} actionLabel="Retry" onAction={refetch} />;
  }

  const atCap = (groups?.length ?? 0) >= MAX_GROUPS;

  if (!groups?.length) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView
          style={[
            styles.content,
            {
              paddingTop: topInset + Spacing.six,
              paddingBottom: bottomInset,
            },
          ]}>
          <ThemedText style={styles.icon}>🌱</ThemedText>
          <ThemedText type="subtitle" style={styles.centerText}>
            You&apos;re using Goodlist solo
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Add a partner or child later to start sharing Requested tasks. Your Personal tasks stay
            exactly as they are when you do.
          </ThemedText>
          <ThemedView style={styles.buttonGroup}>
            <PrimaryButton title="Create a group" onPress={() => router.push('/group/create')} />
            <PrimaryButton title="Join a group" variant="secondary" onPress={() => router.push('/group/join')} />
          </ThemedView>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: topInset + Spacing.three }]}>
        <ThemedText type="header">Groups</ThemedText>
        {!isOnline ? (
          <ThemedText type="small" themeColor="textSecondary">
            You&apos;re offline — group changes require an internet connection.
          </ThemedText>
        ) : null}
      </ThemedView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: bottomInset + Spacing.four }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} currentUserId={user!.id} isOnline={isOnline} />
        ))}

        {atCap ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            You&apos;ve joined the maximum of {MAX_GROUPS} groups.
          </ThemedText>
        ) : (
          <ThemedView style={styles.buttonGroup}>
            <PrimaryButton title="Create a group" onPress={() => router.push('/group/create')} />
            <PrimaryButton title="Join a group" variant="secondary" onPress={() => router.push('/group/join')} />
          </ThemedView>
        )}
      </ScrollView>
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
  buttonGroup: {
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.half,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
