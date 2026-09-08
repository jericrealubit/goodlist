import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { useSurfaceStyle } from '@/components/surface';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { modeLabel, roleLabel } from '@/constants/group';
import { Spacing } from '@/constants/theme';
import { useTokens } from '@/hooks/use-tokens';
import { getErrorMessage } from '@/lib/errors';
import { leaveGroup, removeGroupMember, renameGroup, transferGroupOwnership } from '@/lib/mutations/group';
import { groupKeys } from '@/lib/query-client';
import type { GroupSummary } from '@/lib/types';

type PendingAction =
  | { type: 'leave' }
  | { type: 'remove'; userId: string; name: string }
  | { type: 'transfer'; userId: string; name: string };

type GroupCardProps = {
  group: GroupSummary;
  currentUserId: string;
  isOnline: boolean;
};

export function GroupCard({ group, currentUserId, isOnline }: GroupCardProps) {
  const queryClient = useQueryClient();
  const tokens = useTokens();
  const cardStyle = useSurfaceStyle();
  const isOwner = group.role === 'owner';

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  function startRenaming() {
    setActionError(null);
    setRenameValue(group.name);
    setRenaming(true);
  }

  async function handleRename() {
    setActionError(null);
    setActionLoading(true);
    try {
      await renameGroup(group.id, renameValue);
      await queryClient.invalidateQueries({ queryKey: groupKeys.mine });
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
        await leaveGroup(group.id);
      } else if (pending.type === 'remove') {
        await removeGroupMember(group.id, pending.userId);
      } else {
        await transferGroupOwnership(group.id, pending.userId);
      }
      await queryClient.invalidateQueries({ queryKey: groupKeys.mine });
      setPending(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not complete that action.'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <ThemedView style={[cardStyle, styles.card]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText type="subtitle" numberOfLines={1} style={styles.groupName}>
            {group.name}
          </ThemedText>
          <ThemedView type="backgroundElement" style={[styles.modePill, { borderRadius: tokens.radii.pill }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {modeLabel(group.mode)}
            </ThemedText>
          </ThemedView>
        </View>
        <ThemedText themeColor="textSecondary">
          {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
        </ThemedText>
      </View>

      <View style={styles.inviteRow}>
        <View style={styles.inviteText}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Invite code
          </ThemedText>
          <ThemedText type="title" style={styles.inviteCode}>
            {group.invite_code}
          </ThemedText>
        </View>
        <PrimaryButton
          title="Share"
          variant="secondary"
          onPress={() => Share.share({ message: `Join my group on Goodlist: ${group.invite_code}` })}
        />
      </View>

      {isOwner ? (
        <View style={styles.section}>
          {renaming ? (
            <View style={styles.renameRow}>
              <TextField label="Group name" value={renameValue} onChangeText={setRenameValue} placeholder="Group name" />
              <View style={styles.inlineButtons}>
                <PrimaryButton
                  title="Save"
                  onPress={handleRename}
                  loading={actionLoading}
                  disabled={!renameValue.trim() || !isOnline}
                  style={styles.inlineButton}
                />
                <PrimaryButton
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setRenaming(false)}
                  disabled={actionLoading}
                  style={styles.inlineButton}
                />
              </View>
            </View>
          ) : (
            <PrimaryButton title="Rename Group" variant="secondary" onPress={startRenaming} disabled={!isOnline} />
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Members
        </ThemedText>
        {group.members.map((member) => {
          const isSelf = member.user_id === currentUserId;
          const tags = [roleLabel(group.mode, member.member_role), member.role === 'owner' ? 'Owner' : null]
            .filter(Boolean)
            .join(' · ');
          const name = member.profiles?.display_name || 'Unnamed';

          return (
            <ThemedView key={member.user_id} style={[cardStyle, styles.memberCard]}>
              <View style={styles.memberRow}>
                <ThemedText>
                  {name}
                  {isSelf ? ' (You)' : ''}
                </ThemedText>
                {tags ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {tags}
                  </ThemedText>
                ) : null}
              </View>

              {isOwner && !isSelf ? (
                <View style={styles.memberActions}>
                  <PrimaryButton
                    title="Make owner"
                    variant="secondary"
                    onPress={() => {
                      setActionError(null);
                      setPending({ type: 'transfer', userId: member.user_id, name });
                    }}
                    disabled={!isOnline}
                    style={styles.inlineButton}
                  />
                  <PrimaryButton
                    title="Remove"
                    variant="secondary"
                    onPress={() => {
                      setActionError(null);
                      setPending({ type: 'remove', userId: member.user_id, name });
                    }}
                    disabled={!isOnline}
                    style={styles.inlineButton}
                  />
                </View>
              ) : null}
            </ThemedView>
          );
        })}
      </View>

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
          <View style={styles.inlineButtons}>
            <PrimaryButton
              title="Confirm"
              variant={pending.type === 'transfer' ? 'primary' : 'danger'}
              onPress={handleConfirmPending}
              loading={actionLoading}
              disabled={!isOnline}
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
          </View>
        </ThemedView>
      ) : (
        <View style={styles.section}>
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
            disabled={!isOnline}
          />
        </View>
      )}
    </ThemedView>
  );
}

// These wrappers are layout only, so they are plain <View>. As <ThemedView>
// they each applied backgroundColor: theme[type ?? 'background'], which
// repainted the beige screen background over the white card in bands.
const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.half,
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
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  inviteText: {
    gap: Spacing.half,
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
