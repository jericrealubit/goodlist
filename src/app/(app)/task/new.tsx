import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createTask } from '@/lib/mutations/tasks';
import { validateTaskTitle } from '@/lib/validation/task';

export default function NewTaskScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const titleError = validateTaskTitle(title);
    if (titleError) {
      setError(titleError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createTask({ title, notes, due_at: dueAt ? dueAt.toISOString() : null });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this task.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Buy groceries" autoFocus />
          <TextField
            label="Note (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add details"
            multiline
            style={styles.noteInput}
          />

          <ThemedView style={styles.dueDateGroup}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Due date (optional)
            </ThemedText>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.dueDateButton, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
              <ThemedText>{dueAt ? dueAt.toLocaleDateString() : 'No due date'}</ThemedText>
            </Pressable>
            {dueAt && (
              <Pressable onPress={() => setDueAt(null)}>
                <ThemedText type="link" themeColor="danger">
                  Clear due date
                </ThemedText>
              </Pressable>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={dueAt ?? new Date()}
                mode="date"
                onChange={(_event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setDueAt(selectedDate);
                }}
              />
            )}
          </ThemedView>

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <PrimaryButton title="Save task" onPress={handleSave} loading={saving} />
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
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dueDateGroup: {
    gap: Spacing.two,
  },
  dueDateButton: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
