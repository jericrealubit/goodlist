import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useHousehold } from '@/contexts/household-context';
import { getErrorMessage } from '@/lib/errors';
import { joinHousehold } from '@/lib/mutations/household';

export default function JoinHouseholdScreen() {
  const router = useRouter();
  const { refresh } = useHousehold();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleJoin() {
    if (code.trim().length === 0) {
      setError('Enter an invite code.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await joinHousehold(code);
      await refresh();
      router.back();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not join this household.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText themeColor="textSecondary">
            Enter the invite code a household member shared with you.
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
          <PrimaryButton title="Join household" onPress={handleJoin} loading={saving} />
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
