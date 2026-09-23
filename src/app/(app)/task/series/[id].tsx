import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { DueDatePicker } from '@/components/due-date-picker';
import { HeaderAction, HeaderActionSlot } from '@/components/header-action';
import { LoadingState } from '@/components/loading-state';
import { TimePicker } from '@/components/meds/time-picker';
import { PrimaryButton } from '@/components/primary-button';
import {
  NO_REPEAT,
  RecurrencePicker,
  repeatValueOf,
  toRecurrenceInput,
  validateRepeat,
  type RepeatValue,
} from '@/components/recurrence-picker';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionIcons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import {
  useStopTaskRecurrenceMutation,
  useTaskRecurrencesQuery,
  useUpdateTaskRecurrenceMutation,
} from '@/hooks/use-task-recurrences';
import { useTheme } from '@/hooks/use-theme';
import { fromDayKey, toDayKey } from '@/lib/calendar/day';
import { getErrorMessage } from '@/lib/errors';
import { parseTime } from '@/lib/medications/schedule';
import { remindersSupported, requestReminderPermission } from '@/lib/reminders';
import { validateTaskTitle } from '@/lib/validation/task';

/**
 * A repeating task's series: what every occurrence from today on is made
 * from. Saving here replaces the open occurrences from today on with ones
 * built to the new pattern; anything already completed, and anything before
 * today, is left exactly as it was. Editing a single occurrence is the task
 * editor's job, not this screen's.
 */
export default function EditSeriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { data: recurrences, isLoading } = useTaskRecurrencesQuery();
  const series = recurrences?.find((r) => r.id === id);
  const updateMutation = useUpdateTaskRecurrenceMutation();
  const stopMutation = useStopTaskRecurrenceMutation();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState<Date>(() => new Date());
  const [time, setTime] = useState('09:00');
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [repeat, setRepeat] = useState<RepeatValue>(NO_REPEAT);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!series || initializedRef.current) return;
    initializedRef.current = true;
    setTitle(series.title);
    setNotes(series.notes ?? '');
    setStartDate(fromDayKey(series.start_date) ?? new Date());
    setTime(series.due_time);
    setAlarmEnabled(series.alarm_enabled);
    setRepeat(repeatValueOf(series));
  }, [series]);

  function firstDue(): Date {
    const { hour, minute } = parseTime(time) ?? { hour: 9, minute: 0 };
    return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), hour, minute);
  }

  function handleSave() {
    const titleError = validateTaskTitle(title);
    if (titleError) {
      setError(titleError);
      return;
    }
    const dueAt = firstDue();
    const repeatError = validateRepeat(repeat, dueAt);
    if (repeatError) {
      setError(repeatError);
      return;
    }
    setError(null);
    updateMutation.mutate(
      {
        id,
        from: toDayKey(new Date()),
        ...toRecurrenceInput({ title, notes, dueAt, alarmEnabled, repeat }),
      },
      { onError: (err) => setError(getErrorMessage(err, 'Could not save this series.')) },
    );
    if (alarmEnabled && remindersSupported) requestReminderPermission().catch(() => {});
    router.back();
  }

  function handleStop() {
    stopMutation.mutate(
      { id, after: toDayKey(new Date()) },
      { onError: (err) => setError(getErrorMessage(err, 'Could not stop this series.')) },
    );
    router.back();
  }

  if (!series) {
    return isLoading ? (
      <LoadingState />
    ) : (
      <ThemedText style={styles.missing}>This repeating task is no longer here.</ThemedText>
    );
  }

  if (!series.active) {
    return (
      <ThemedView style={styles.content}>
        <ThemedText>“{series.title}” has stopped repeating. The ones already made are still in your list.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderActionSlot>
              <HeaderAction label="Save" icon={ActionIcons.save} onPress={handleSave} />
            </HeaderActionSlot>
          ),
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="small" themeColor="textSecondary">
            Changes here apply to every one from today on that isn’t done yet. Anything already done stays
            as it is.
          </ThemedText>

          <TextField
            label="Title"
            value={title}
            onChangeText={(next) => setTitle(next.replace(/\r?\n/g, ' '))}
            multiline
            autoGrow
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            style={styles.titleInput}
          />
          <TextField
            label="Note (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Add details"
            multiline
            autoGrow
            style={styles.noteInput}
          />

          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Starts
            </ThemedText>
            <DueDatePicker
              value={startDate}
              onChange={(next) => setStartDate(next ?? startDate)}
              name="start date"
            />
          </View>

          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Due at
            </ThemedText>
            <View style={styles.timeRow}>
              <TimePicker value={time} onChange={setTime} accessibilityLabel="Due time" />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <ThemedText>Alarm</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {remindersSupported ? 'A phone alert at the due time, every time.' : 'Alarms arrive on the Goodlist phone app.'}
              </ThemedText>
            </View>
            <Switch
              value={alarmEnabled}
              onValueChange={setAlarmEnabled}
              trackColor={{ true: theme.primary, false: theme.border }}
              accessibilityLabel="Alarm"
            />
          </View>

          <View style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Repeat
            </ThemedText>
            <RecurrencePicker value={repeat} onChange={setRepeat} anchor={startDate} allowNone={false} />
          </View>

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}

          <PrimaryButton title="Stop repeating" icon={ActionIcons.stopRepeat} onPress={handleStop} variant="danger" />
          <ThemedText type="small" themeColor="textSecondary">
            Stopping keeps today’s and anything already done. Only the ones still to come are removed.
          </ThemedText>
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
  missing: {
    padding: Spacing.four,
  },
  group: {
    gap: Spacing.two,
  },
  timeRow: {
    flexDirection: 'row',
  },
  titleInput: {
    maxHeight: 132,
    textAlignVertical: 'top',
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
