import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Share, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { modeLabel, roleLabel } from '@/constants/group';
import { BottomTabInset, MaxContentWidth, Spacing, WebTopNavInset } from '@/constants/theme';
import { useGroup } from '@/contexts/group-context';
import { useSession } from '@/contexts/session-context';

export default function GroupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useSession();
  const { group, isLoading, error, refresh } = useGroup();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <EmptyState title="Something went wrong" message={error} actionLabel="Retry" onAction={refresh} />
    );
  }

  if (!group) {
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
          <ThemedView style={styles.buttonGroup}>
            <PrimaryButton title="Create a group" onPress={() => router.push('/group/create')} />
            <PrimaryButton
              title="Join a group"
              variant="secondary"
              onPress={() => router.push('/group/join')}
            />
          </ThemedView>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + WebTopNavInset + Spacing.three }]}>
        <ThemedView style={styles.titleRow}>
          <ThemedText type="title">{group.name}</ThemedText>
          <ThemedView type="backgroundElement" style={styles.modePill}>
            <ThemedText type="small" themeColor="textSecondary">
              {modeLabel(group.mode)}
            </ThemedText>
          </ThemedView>
        </ThemedView>
        <ThemedText themeColor="textSecondary">
          {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.body}>
        <ThemedView type="backgroundElement" style={styles.inviteCard}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Invite code
          </ThemedText>
          <ThemedText type="title" style={styles.inviteCode}>
            {group.invite_code}
          </ThemedText>
          <PrimaryButton
            title="Share invite code"
            variant="secondary"
            onPress={() =>
              Share.share({
                message: `Join my group on Goodlist: ${group.invite_code}`,
              })
            }
          />
        </ThemedView>

        <ThemedView style={styles.members}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Members
          </ThemedText>
          {group.members.map((member) => {
            const tags = [roleLabel(group.mode, member.member_role), member.role === 'owner' ? 'Owner' : null]
              .filter(Boolean)
              .join(' · ');
            return (
              <ThemedView key={member.user_id} type="backgroundElement" style={styles.memberRow}>
                <ThemedText>
                  {member.profiles?.display_name || 'Unnamed'}
                  {member.user_id === user?.id ? ' (You)' : ''}
                </ThemedText>
                {tags ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {tags}
                  </ThemedText>
                ) : null}
              </ThemedView>
            );
          })}
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
    marginTop: Spacing.three,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.half,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  modePill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  body: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  inviteCard: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  inviteCode: {
    letterSpacing: 4,
  },
  members: {
    gap: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
