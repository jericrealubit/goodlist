import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { completeTask, deleteTask, reopenTask, updateTask } from '@/lib/mutations/tasks';
import { getTask } from '@/lib/queries/tasks';
import { validateTaskTitle } from '@/lib/validation/task';
import type { Task } from '@/lib/types';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTask(id).then((loaded) => {
      if (!loaded) return;
      setTask(loaded);
      setTitle(loaded.title);
      setNotes(loaded.notes ?? '');
      setDueAt(loaded.due_at ? new Date(loaded.due_at) : null);
    });
  }, [id]);

  async function handleSave() {
    const titleError = validateTaskTitle(title);
    if (titleError) {
      setError(titleError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await updateTask(id, { title, notes, due_at: dueAt ? dueAt.toISOString() : null });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this task.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleComplete() {
    if (!task) return;
    setSaving(true);
    try {
      if (task.status === 'open') {
        await completeTask(task.id);
      } else {
        await reopenTask(task.id);
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this task.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setSaving(true);
    try {
      await deleteTask(task.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this task.');
      setSaving(false);
    }
  }

  if (!task) {
    return <LoadingState />;
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Buy groceries" />
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

          <PrimaryButton title="Save changes" onPress={handleSave} loading={saving} />
          <PrimaryButton
            title={task.status === 'open' ? 'Mark complete' : 'Reopen task'}
            onPress={handleToggleComplete}
            loading={saving}
            variant="secondary"
          />
          <PrimaryButton title="Delete task" onPress={handleDelete} loading={saving} variant="danger" />
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
    gap: Spacing.three,
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
