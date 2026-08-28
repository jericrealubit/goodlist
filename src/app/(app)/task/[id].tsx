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
import { useSession } from '@/contexts/session-context';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';
import { cancelTask, completeTask, deleteTask, reopenTask, updateTask } from '@/lib/mutations/tasks';
import { getTask } from '@/lib/queries/tasks';
import { validateTaskTitle } from '@/lib/validation/task';
import type { Task } from '@/lib/types';

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.dueDateGroup}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedView type="backgroundElement" style={[styles.dueDateButton, { borderColor: theme.border }]}>
        <ThemedText>{value}</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useSession();

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
      setError(getErrorMessage(err, 'Could not save this task.'));
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
      setError(getErrorMessage(err, 'Could not update this task.'));
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
      setError(getErrorMessage(err, 'Could not delete this task.'));
      setSaving(false);
    }
  }

  async function handleCancelRequest() {
    if (!task) return;
    setSaving(true);
    try {
      await cancelTask(task.id);
      router.back();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not cancel this request.'));
      setSaving(false);
    }
  }

  if (!task) {
    return <LoadingState />;
  }

  const isRequested = task.origin === 'requested';
  const isAssignee = isRequested && task.assignee_id === user?.id;
  const isCreator = isRequested && task.creator_id === user?.id;
  const isOpen = task.status === 'open';

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isAssignee ? (
            <>
              <ReadOnlyField label="Requested by" value={task.creator?.display_name || 'A household member'} />
              <ReadOnlyField label="Title" value={task.title} />
              {task.notes ? <ReadOnlyField label="Note" value={task.notes} /> : null}
              <ReadOnlyField label="Due date" value={task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'} />
            </>
          ) : (
            <>
              <TextField
                label="Title"
                value={title}
                onChangeText={setTitle}
                placeholder="Buy groceries"
                editable={!isRequested || isOpen}
              />
              <TextField
                label="Note (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Add details"
                multiline
                style={styles.noteInput}
                editable={!isRequested || isOpen}
              />

              <ThemedView style={styles.dueDateGroup}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Due date (optional)
                </ThemedText>
                <Pressable
                  disabled={isRequested && !isOpen}
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.dueDateButton, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <ThemedText>{dueAt ? dueAt.toLocaleDateString() : 'No due date'}</ThemedText>
                </Pressable>
                {dueAt && (!isRequested || isOpen) && (
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

              {isCreator && !isOpen ? (
                <ThemedText themeColor="textSecondary">This request is {task.status}.</ThemedText>
              ) : null}
            </>
          )}

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          {!isRequested && (
            <>
              <PrimaryButton title="Save changes" onPress={handleSave} loading={saving} />
              <PrimaryButton
                title={task.status === 'open' ? 'Mark complete' : 'Reopen task'}
                onPress={handleToggleComplete}
                loading={saving}
                variant="secondary"
              />
              <PrimaryButton title="Delete task" onPress={handleDelete} loading={saving} variant="danger" />
            </>
          )}

          {isCreator && isOpen && (
            <>
              <PrimaryButton title="Save changes" onPress={handleSave} loading={saving} />
              <PrimaryButton title="Cancel request" onPress={handleCancelRequest} loading={saving} variant="danger" />
            </>
          )}

          {isAssignee && (
            <PrimaryButton
              title={task.status === 'open' ? 'Mark complete' : 'Reopen task'}
              onPress={handleToggleComplete}
              loading={saving}
            />
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
