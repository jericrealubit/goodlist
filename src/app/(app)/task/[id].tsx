import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { DueDatePicker } from '@/components/due-date-picker';
import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useTheme } from '@/hooks/use-theme';
import {
  useCancelTaskMutation,
  useCompleteTaskMutation,
  useDeleteTaskMutation,
  useReopenTaskMutation,
  useUpdateTaskMutation,
} from '@/hooks/use-task-mutations';
import { useTaskDetailQuery } from '@/hooks/use-tasks-query';
import { getErrorMessage } from '@/lib/errors';
import { validateTaskTitle } from '@/lib/validation/task';

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
  const { user } = useSession();
  const { data: task } = useTaskDetailQuery(id);
  const updateMutation = useUpdateTaskMutation();
  const completeMutation = useCompleteTaskMutation();
  const reopenMutation = useReopenTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const cancelMutation = useCancelTaskMutation();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!task || initializedRef.current) return;
    initializedRef.current = true;
    setTitle(task.title);
    setNotes(task.notes ?? '');
    setDueAt(task.due_at ? new Date(task.due_at) : null);
  }, [task]);

  // Every action below is optimistic — the mutation's own onMutate already
  // updates the cache instantly, so the screen can dismiss right away rather
  // than waiting on a network round trip that may be paused for a long time
  // while offline. A later failure is surfaced by the mutation's shared
  // onError rolling back the cache, not by this now-unmounted screen.
  function handleSave() {
    const titleError = validateTaskTitle(title);
    if (titleError) {
      setError(titleError);
      return;
    }
    setError(null);
    updateMutation.mutate(
      { id, title, notes, due_at: dueAt ? dueAt.toISOString() : null },
      { onError: (err) => setError(getErrorMessage(err, 'Could not save this task.')) },
    );
    router.back();
  }

  function handleToggleComplete() {
    if (!task) return;
    const mutation = task.status === 'open' ? completeMutation : reopenMutation;
    mutation.mutate(task, { onError: (err) => setError(getErrorMessage(err, 'Could not update this task.')) });
    router.back();
  }

  function handleDelete() {
    if (!task) return;
    deleteMutation.mutate(task, { onError: (err) => setError(getErrorMessage(err, 'Could not delete this task.')) });
    router.back();
  }

  function handleCancelRequest() {
    if (!task) return;
    cancelMutation.mutate(task, { onError: (err) => setError(getErrorMessage(err, 'Could not cancel this request.')) });
    router.back();
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
              <ReadOnlyField label="Requested by" value={task.creator?.display_name || 'A group member'} />
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
                <DueDatePicker value={dueAt} onChange={setDueAt} disabled={isRequested && !isOpen} />
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
              <PrimaryButton title="Save changes" onPress={handleSave} />
              <PrimaryButton
                title={task.status === 'open' ? 'Mark complete' : 'Reopen task'}
                onPress={handleToggleComplete}
                variant="secondary"
              />
              <PrimaryButton title="Delete task" onPress={handleDelete} variant="danger" />
            </>
          )}

          {isCreator && isOpen && (
            <>
              <PrimaryButton title="Save changes" onPress={handleSave} />
              <PrimaryButton title="Cancel request" onPress={handleCancelRequest} variant="danger" />
            </>
          )}

          {isAssignee && (
            <PrimaryButton
              title={task.status === 'open' ? 'Mark complete' : 'Reopen task'}
              onPress={handleToggleComplete}
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
