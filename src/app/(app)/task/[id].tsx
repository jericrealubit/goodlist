import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { DueDatePicker } from '@/components/due-date-picker';
import { HeaderAction, HeaderActionSlot } from '@/components/header-action';
import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionIcons } from '@/constants/icons';
import { READ_ONLY_MESSAGE } from '@/constants/premium';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useGroupsQuery } from '@/hooks/use-group-query';
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
import { remindersSupported, requestReminderPermission } from '@/lib/reminders';
import { cancelTaskReminder } from '@/lib/task-reminders';
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
  const theme = useTheme();
  const { data: task } = useTaskDetailQuery(id);
  const { data: groups } = useGroupsQuery();
  const updateMutation = useUpdateTaskMutation();
  const completeMutation = useCompleteTaskMutation();
  const reopenMutation = useReopenTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const cancelMutation = useCancelTaskMutation();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!task || initializedRef.current) return;
    initializedRef.current = true;
    setTitle(task.title);
    setNotes(task.notes ?? '');
    setDueAt(task.due_at ? new Date(task.due_at) : null);
    setAlarmEnabled(task.alarm_enabled);
  }, [task]);

  // The title field wraps so a long title is fully readable while editing, but
  // it is still one logical line: collapse the newlines a Return key or a
  // pasted multi-line string would otherwise leave in it.
  function handleTitleChange(next: string) {
    setTitle(next.replace(/\r?\n/g, ' '));
  }

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
    // No due date means nothing to alarm on — never let a stale `true`
    // round-trip to the server without one.
    const nextAlarmEnabled = dueAt ? alarmEnabled : false;
    updateMutation.mutate(
      { id, title, notes, due_at: dueAt ? dueAt.toISOString() : null, alarm_enabled: nextAlarmEnabled },
      { onError: (err) => setError(getErrorMessage(err, 'Could not save this task.')) },
    );
    if (nextAlarmEnabled) {
      // Asked here — the moment the alarm means something — and never at
      // launch. The layout's sync hook picks the schedule up once permission
      // lands.
      if (remindersSupported) requestReminderPermission().catch(() => {});
    } else if (task?.alarm_enabled) {
      // Turned off (or the due date was cleared): cancel immediately rather
      // than waiting for the next foreground resync to notice the diff.
      cancelTaskReminder(id).catch(() => {});
    }
    router.back();
  }

  // The assignee's Alarm switch is the one control on their read-only view —
  // it's scoped to this device, has nothing to do with the creator's ability
  // to edit the rest of the task, and commits immediately rather than
  // waiting on a "Save" that this view doesn't have.
  function handleAssigneeAlarmToggle(next: boolean) {
    setAlarmEnabled(next);
    updateMutation.mutate(
      { id, alarm_enabled: next },
      { onError: (err) => setError(getErrorMessage(err, 'Could not update the alarm.')) },
    );
    if (next && remindersSupported) {
      requestReminderPermission().catch(() => {});
    } else if (!next) {
      cancelTaskReminder(id).catch(() => {});
    }
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
  const groupReadOnly =
    !!task.family_id && groups?.find((g) => g.id === task.family_id)?.is_writable === false;
  const isOpen = task.status === 'open';
  const canEditRequest = isOpen && !groupReadOnly;
  // Exactly the cases the fields below are editable in: a personal task, or a
  // request you made that nobody has acted on yet.
  const canSave = !isAssignee && (!isRequested || (isCreator && canEditRequest));

  return (
    <ThemedView style={styles.container}>
      {/* Save lives in the header, not at the foot of the form: the keyboard
          covers the bottom of the screen for as long as you're typing, and
          this is the one control you need while you are. */}
      <Stack.Screen
        options={{
          headerRight: () =>
            canSave ? (
              <HeaderActionSlot>
                <HeaderAction label="Save" icon={ActionIcons.save} onPress={handleSave} />
              </HeaderActionSlot>
            ) : null,
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isAssignee ? (
            <>
              <ReadOnlyField label="Requested by" value={task.creator?.display_name || 'A group member'} />
              <ReadOnlyField label="Title" value={task.title} />
              {task.notes ? <ReadOnlyField label="Note" value={task.notes} /> : null}
              <ReadOnlyField label="Due date" value={task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'} />
              {task.due_at ? (
                <View style={styles.switchRow}>
                  <View style={styles.flex}>
                    <ThemedText>Alarm</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {remindersSupported ? 'A phone alert at the due time.' : 'Alarms arrive on the Goodlist phone app.'}
                    </ThemedText>
                  </View>
                  <Switch
                    value={alarmEnabled}
                    onValueChange={handleAssigneeAlarmToggle}
                    trackColor={{ true: theme.primary, false: theme.border }}
                    accessibilityLabel="Alarm"
                  />
                </View>
              ) : null}
            </>
          ) : (
            <>
              <TextField
                label="Title"
                value={title}
                onChangeText={handleTitleChange}
                placeholder="Buy groceries"
                multiline
                autoGrow
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
                style={styles.titleInput}
                editable={!isRequested || canEditRequest}
              />
              <TextField
                label="Note (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Add details"
                multiline
                autoGrow
                style={styles.noteInput}
                editable={!isRequested || canEditRequest}
              />

              <ThemedView style={styles.dueDateGroup}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Due date (optional)
                </ThemedText>
                <DueDatePicker
                  value={dueAt}
                  onChange={setDueAt}
                  disabled={isRequested && !canEditRequest}
                  includeTime
                />
              </ThemedView>

              {dueAt ? (
                <View style={styles.switchRow}>
                  <View style={styles.flex}>
                    <ThemedText>Alarm</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {remindersSupported ? 'A phone alert at the due time.' : 'Alarms arrive on the Goodlist phone app.'}
                    </ThemedText>
                  </View>
                  <Switch
                    value={alarmEnabled}
                    onValueChange={setAlarmEnabled}
                    disabled={isRequested && !canEditRequest}
                    trackColor={{ true: theme.primary, false: theme.border }}
                    accessibilityLabel="Alarm"
                  />
                </View>
              ) : null}

              {isCreator && !isOpen ? (
                <ThemedText themeColor="textSecondary">This request is {task.status}.</ThemedText>
              ) : null}
            </>
          )}

          {groupReadOnly ? <ThemedText themeColor="textSecondary">{READ_ONLY_MESSAGE}</ThemedText> : null}

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          {isRequested && task.family_id ? (
            <PrimaryButton
              title="View group"
              icon={ActionIcons.group}
              onPress={() => router.push('/group')}
              variant="secondary"
            />
          ) : null}

          {!isRequested && (
            <>
              <PrimaryButton
                title={task.status === 'open' ? 'Mark complete' : 'Reopen task'}
                icon={task.status === 'open' ? ActionIcons.complete : ActionIcons.reopen}
                onPress={handleToggleComplete}
                variant="secondary"
              />
              <PrimaryButton
                title="Delete task"
                icon={ActionIcons.delete}
                onPress={handleDelete}
                variant="danger"
              />
            </>
          )}

          {isCreator && canEditRequest && (
            <PrimaryButton
              title="Cancel request"
              icon={ActionIcons.cancel}
              onPress={handleCancelRequest}
              variant="danger"
            />
          )}

          {isAssignee && !groupReadOnly && (
            <PrimaryButton
              title={task.status === 'open' ? 'Mark complete' : 'Reopen task'}
              icon={task.status === 'open' ? ActionIcons.complete : ActionIcons.reopen}
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
  titleInput: {
    // Grows with the title so the whole value stays visible, then scrolls
    // inside the field instead of pushing the buttons off screen.
    maxHeight: 132,
    textAlignVertical: 'top',
  },
  noteInput: {
    // No maxHeight, unlike the title: the whole note should be readable at once,
    // and the ScrollView above already scrolls the page.
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dueDateGroup: {
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dueDateButton: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
