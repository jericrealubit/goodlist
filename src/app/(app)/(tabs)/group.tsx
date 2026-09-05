import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Share, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { useSurfaceStyle } from '@/components/surface';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { modeLabel, roleLabel } from '@/constants/group';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useGroup } from '@/contexts/group-context';
import { useSession } from '@/contexts/session-context';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';
import { useTokens } from '@/hooks/use-tokens';
import { getErrorMessage } from '@/lib/errors';
import { leaveGroup, removeGroupMember, renameGroup, transferGroupOwnership } from '@/lib/mutations/group';

type PendingAction =
  | { type: 'leave' }
  | { type: 'remove'; userId: string; name: string }
  | { type: 'transfer'; userId: string; name: string };

export default function GroupScreen() {
  const { topInset, bottomInset } = useTabScreenInsets();
  const router = useRouter();
  const { user } = useSession();
  const { group, isLoading, error, refresh } = useGroup();
  const tokens = useTokens();
  const cardStyle = useSurfaceStyle();

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function startRenaming() {
    setActionError(null);
    setRenameValue(group?.name ?? '');
    setRenaming(true);
  }

  async function handleRename() {
    setActionError(null);
    setActionLoading(true);
    try {
      await renameGroup(renameValue);
      await refresh();
      setRenaming(false);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not rename your household.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmPending() {
    if (!pending) return;
    setActionError(null);
    setActionLoading(true);
    try {
      if (pending.type === 'leave') {
        await leaveGroup();
      } else if (pending.type === 'remove') {
        await removeGroupMember(pending.userId);
      } else {
        await transferGroupOwnership(pending.userId);
      }
      await refresh();
      setPending(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not complete that action.'));
    } finally {
      setActionLoading(false);
    }
  }

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

  const isOwner = group.role === 'owner';

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: topInset + Spacing.three }]}>
        <ThemedView style={styles.titleRow}>
          <ThemedText type="header" numberOfLines={1} style={styles.groupName}>
            {group.name}
          </ThemedText>
          <ThemedView type="backgroundElement" style={[styles.modePill, { borderRadius: tokens.radii.pill }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {modeLabel(group.mode)}
            </ThemedText>
          </ThemedView>
        </ThemedView>
        <ThemedText themeColor="textSecondary">
          {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
        </ThemedText>
      </ThemedView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: bottomInset + Spacing.four }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <ThemedView style={[cardStyle, styles.inviteCard]}>
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

        {isOwner ? (
          <ThemedView style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Household name
            </ThemedText>
            {renaming ? (
              <ThemedView style={styles.renameRow}>
                <TextField
                  label="Household name"
                  value={renameValue}
                  onChangeText={setRenameValue}
                  placeholder="Household name"
                />
                <ThemedView style={styles.inlineButtons}>
                  <PrimaryButton
                    title="Save"
                    onPress={handleRename}
                    loading={actionLoading}
                    disabled={!renameValue.trim()}
                    style={styles.inlineButton}
                  />
                  <PrimaryButton
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setRenaming(false)}
                    disabled={actionLoading}
                    style={styles.inlineButton}
                  />
                </ThemedView>
              </ThemedView>
            ) : (
              <PrimaryButton title="Rename household" variant="secondary" onPress={startRenaming} />
            )}
          </ThemedView>
        ) : null}

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Members
          </ThemedText>
          {group.members.map((member) => {
            const isSelf = member.user_id === user?.id;
            const tags = [roleLabel(group.mode, member.member_role), member.role === 'owner' ? 'Owner' : null]
              .filter(Boolean)
              .join(' · ');
            const name = member.profiles?.display_name || 'Unnamed';

            return (
              <ThemedView key={member.user_id} style={[cardStyle, styles.memberCard]}>
                <ThemedView style={styles.memberRow}>
                  <ThemedText>
                    {name}
                    {isSelf ? ' (You)' : ''}
                  </ThemedText>
                  {tags ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {tags}
                    </ThemedText>
                  ) : null}
                </ThemedView>

                {isOwner && !isSelf ? (
                  <ThemedView style={styles.memberActions}>
                    <PrimaryButton
                      title="Make owner"
                      variant="secondary"
                      onPress={() => {
                        setActionError(null);
                        setPending({ type: 'transfer', userId: member.user_id, name });
                      }}
                      style={styles.inlineButton}
                    />
                    <PrimaryButton
                      title="Remove"
                      variant="secondary"
                      onPress={() => {
                        setActionError(null);
                        setPending({ type: 'remove', userId: member.user_id, name });
                      }}
                      style={styles.inlineButton}
                    />
                  </ThemedView>
                ) : null}
              </ThemedView>
            );
          })}
        </ThemedView>

        {pending ? (
          <ThemedView style={[cardStyle, styles.confirmCard]}>
            <ThemedText type="small">
              {pending.type === 'leave'
                ? 'Leave this household?'
                : pending.type === 'remove'
                  ? `Remove ${pending.name} from this household?`
                  : `Make ${pending.name} the household owner? You'll become a regular member.`}
            </ThemedText>
            {actionError ? (
              <ThemedText type="small" themeColor="danger">
                {actionError}
              </ThemedText>
            ) : null}
            <ThemedView style={styles.inlineButtons}>
              <PrimaryButton
                title="Confirm"
                variant={pending.type === 'transfer' ? 'primary' : 'danger'}
                onPress={handleConfirmPending}
                loading={actionLoading}
                style={styles.inlineButton}
              />
              <PrimaryButton
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setPending(null);
                  setActionError(null);
                }}
                disabled={actionLoading}
                style={styles.inlineButton}
              />
            </ThemedView>
          </ThemedView>
        ) : (
          <ThemedView style={styles.section}>
            {actionError ? (
              <ThemedText type="small" themeColor="danger">
                {actionError}
              </ThemedText>
            ) : null}
            <PrimaryButton
              title="Leave household"
              variant="danger"
              onPress={() => {
                setActionError(null);
                setPending({ type: 'leave' });
              }}
            />
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
  groupName: {
    flexShrink: 1,
  },
  modePill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
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
  inviteCard: {
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  inviteCode: {
    letterSpacing: 4,
  },
  section: {
    gap: Spacing.two,
  },
  renameRow: {
    gap: Spacing.two,
  },
  inlineButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  inlineButton: {
    flex: 1,
  },
  memberCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
