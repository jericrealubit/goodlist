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
import { createHousehold } from '@/lib/mutations/household';

export default function CreateHouseholdScreen() {
  const router = useRouter();
  const { refresh } = useHousehold();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (name.trim().length === 0) {
      setError('Give your household a name.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createHousehold(name);
      await refresh();
      router.back();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create this household.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText themeColor="textSecondary">
            Give your household a name. You can invite a partner once it's created.
          </ThemedText>
          <TextField label="Household name" value={name} onChangeText={setName} placeholder="The Smiths" autoFocus />
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
          <PrimaryButton title="Create household" onPress={handleCreate} loading={saving} />
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
