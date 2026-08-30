import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { OptionPicker } from '@/components/option-picker';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { modeLabel, roleOptionsForMode } from '@/constants/group';
import { Spacing } from '@/constants/theme';
import { useGroup } from '@/contexts/group-context';
import { getErrorMessage } from '@/lib/errors';
import { joinGroup } from '@/lib/mutations/group';
import { previewGroupByInviteCode } from '@/lib/queries/group';
import type { GroupMode, MemberRole } from '@/lib/types';

export default function JoinGroupScreen() {
  const router = useRouter();
  const { refresh } = useGroup();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<{ name: string; mode: GroupMode } | null>(null);
  const [memberRole, setMemberRole] = useState<MemberRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (code.trim().length === 0) {
      setError('Enter an invite code.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const found = await previewGroupByInviteCode(code);
      if (!found) {
        setError('Invalid invite code.');
        return;
      }
      setPreview(found);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not look up this invite code.'));
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    setPreview(null);
    setMemberRole(null);
    setError(null);
  }

  async function handleJoin() {
    if (!memberRole) {
      setError('Choose your role.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await joinGroup(code, memberRole);
      await refresh();
      router.back();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not join this group.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!preview ? (
            <>
              <ThemedText themeColor="textSecondary">
                Enter the invite code a group member shared with you.
              </ThemedText>
              <TextField
                label="Invite code"
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                placeholder="ABCD2345"
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
              />
              {error ? (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              ) : null}
              <PrimaryButton title="Continue" onPress={handleContinue} loading={saving} />
            </>
          ) : (
            <>
              <ThemedText type="subtitle">{preview.name}</ThemedText>
              <ThemedText themeColor="textSecondary">This is a {modeLabel(preview.mode)}. Choose your role.</ThemedText>
              <OptionPicker
                options={roleOptionsForMode(preview.mode)}
                selectedId={memberRole}
                onSelect={(id) => setMemberRole(id as MemberRole)}
              />
              {error ? (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              ) : null}
              <PrimaryButton title="Join group" onPress={handleJoin} loading={saving} />
              <PrimaryButton title="Back" variant="secondary" onPress={handleBack} disabled={saving} />
            </>
          )}
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
