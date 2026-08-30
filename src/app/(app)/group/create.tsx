import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { OptionPicker } from '@/components/option-picker';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GROUP_MODE_OPTIONS, roleOptionsForMode } from '@/constants/group';
import { Spacing } from '@/constants/theme';
import { useGroup } from '@/contexts/group-context';
import { getErrorMessage } from '@/lib/errors';
import { createGroup } from '@/lib/mutations/group';
import type { GroupMode, MemberRole } from '@/lib/types';

export default function CreateGroupScreen() {
  const router = useRouter();
  const { refresh } = useGroup();
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
      await refresh();
      router.back();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create this group.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText themeColor="textSecondary">
            Give your group a name. You can invite others once it's created.
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
          <PrimaryButton title="Create group" onPress={handleCreate} loading={saving} />
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
