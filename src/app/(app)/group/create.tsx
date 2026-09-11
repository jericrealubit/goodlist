import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { HeaderAction, HeaderActionSlot } from '@/components/header-action';
import { OptionPicker } from '@/components/option-picker';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GROUP_MODE_OPTIONS, roleOptionsForMode } from '@/constants/group';
import { PrimaryButton } from '@/components/primary-button';
import { ActionIcons } from '@/constants/icons';
import { TRIAL_DAYS, isPremiumRequiredError } from '@/constants/premium';
import { Spacing } from '@/constants/theme';
import { useGroupsQuery } from '@/hooks/use-group-query';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { usePremiumStatus } from '@/hooks/use-premium-query';
import { getErrorMessage } from '@/lib/errors';
import { createGroup } from '@/lib/mutations/group';
import { groupKeys, premiumKeys } from '@/lib/query-client';
import type { GroupMode, MemberRole } from '@/lib/types';

const MAX_GROUPS = 2;

export default function CreateGroupScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const { data: groups } = useGroupsQuery();
  const { status: premium } = usePremiumStatus();
  const atCap = (groups?.length ?? 0) >= MAX_GROUPS;
  const ownsGroup = (groups ?? []).some((g) => g.role === 'owner');
  const startsTrial = ownsGroup && !premium.isPremium && !premium.trialUsed;
  const needsPremium = ownsGroup && !premium.isPremium && premium.trialUsed;
  const [name, setName] = useState('');
  const [mode, setMode] = useState<GroupMode>('family');
  const [memberRole, setMemberRole] = useState<MemberRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleModeSelect(id: string) {
    setMode(id as GroupMode);
    setMemberRole(null);
  }

  async function handleCreate() {
    if (name.trim().length === 0) {
      setError('Give your group a name.');
      return;
    }
    if (!memberRole) {
      setError('Choose your role.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createGroup(name, mode, memberRole);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: groupKeys.mine }),
        queryClient.invalidateQueries({ queryKey: premiumKeys.mine }),
      ]);
      router.back();
    } catch (err) {
      if (isPremiumRequiredError(err)) {
        await queryClient.invalidateQueries({ queryKey: premiumKeys.mine });
        router.replace('/premium');
        return;
      }
      setError(getErrorMessage(err, 'Could not create this group.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      {/* The form's one action lives in the header, above the keyboard, so it
          stays reachable while the group name is still being typed. */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderActionSlot>
              <HeaderAction
                label="Create"
                icon={ActionIcons.createGroup}
                onPress={handleCreate}
                loading={saving}
                disabled={!isOnline || atCap || needsPremium}
              />
            </HeaderActionSlot>
          ),
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText themeColor="textSecondary">
            Give your group a name. You can invite others once it&apos;s created.
          </ThemedText>
          <TextField label="Group name" value={name} onChangeText={setName} placeholder="The Smiths" autoFocus />

          <ThemedText type="smallBold" themeColor="textSecondary">
            Is this a family or a team?
          </ThemedText>
          <OptionPicker options={GROUP_MODE_OPTIONS} selectedId={mode} onSelect={handleModeSelect} />

          <ThemedText type="smallBold" themeColor="textSecondary">
            Your role
          </ThemedText>
          <OptionPicker
            options={roleOptionsForMode(mode)}
            selectedId={memberRole}
            onSelect={(id) => setMemberRole(id as MemberRole)}
          />

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
          {atCap ? (
            <ThemedText type="small" themeColor="textSecondary">
              You&apos;ve already joined the maximum of {MAX_GROUPS} groups.
            </ThemedText>
          ) : needsPremium ? (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Your free trial has ended. A second group of your own needs Goodlist Premium.
              </ThemedText>
              <PrimaryButton
                title="See Premium"
                icon={ActionIcons.premium}
                onPress={() => router.replace('/premium')}
              />
            </>
          ) : startsTrial ? (
            <ThemedText type="small" themeColor="textSecondary">
              A second group of your own is a Premium feature. Creating it starts your free{' '}
              {TRIAL_DAYS}-day Premium trial. No card needed.
            </ThemedText>
          ) : !isOnline ? (
            <ThemedText type="small" themeColor="textSecondary">
              Creating a group requires an internet connection.
            </ThemedText>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
});
