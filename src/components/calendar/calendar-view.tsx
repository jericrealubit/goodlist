import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput } from 'react-native';

import { AlarmStatusBanner } from '@/components/calendar/alarm-status-banner';
import { MonthGrid, type DayState } from '@/components/calendar/month-grid';
import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { formatSlotTime, STATUS_LABEL } from '@/components/meds/dose-format';
import { PrimaryButton } from '@/components/primary-button';
import { RoundActionButton } from '@/components/round-action-button';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionIcons, type IconName } from '@/constants/icons';
import { READ_ONLY_MESSAGE } from '@/constants/premium';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useGroupsQuery } from '@/hooks/use-group-query';
import { useDosesQuery, useMedicationsQuery } from '@/hooks/use-medications-query';
import { useRealtimeMedications } from '@/hooks/use-realtime-medications';
import { useRealtimeTasks } from '@/hooks/use-realtime-tasks';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { buildNewTaskInput, useCreateTaskMutation, useUpdateTaskMutation } from '@/hooks/use-task-mutations';
import { useOpenTasksQuery } from '@/hooks/use-tasks-query';
import { bucketByDay } from '@/lib/calendar/bucket';
import { addMonths, fromDayKey, isOverdue, startOfLocalDay, toDayKey, withDueTime, type DayKey } from '@/lib/calendar/day';
import { buildMonthGrid, monthLabel } from '@/lib/calendar/month';
import { getErrorMessage } from '@/lib/errors';
import { tapLight } from '@/lib/haptics';
import { indexDoses, slotKey, slotStatus, type SlotStatus } from '@/lib/medications/adherence';
import { summarizeDay, type DaySummary } from '@/lib/medications/day-summary';
import { slotsForDayAll } from '@/lib/medications/schedule';
import type { MedicationDose, Task } from '@/lib/types';
import { displayTitle } from '@/lib/url';
import { validateTaskTitle } from '@/lib/validation/task';

/** Weeks start on Sunday, matching `Date.getDay()`. A preference is a later concern. */
const WEEK_START = 0;

/** The same shapes as the grid's corner mark, plus the two states a day can be in before it has a verdict. */
const STATUS_GLYPH: Record<SlotStatus, IconName> = {
  taken: ActionIcons.doseTaken,
  missed: ActionIcons.doseMissed,
  skipped: ActionIcons.doseSkipped,
  due: ActionIcons.doseDue,
  upcoming: ActionIcons.time,
};

/** How much of the unscheduled pile to show before it stops being a hint and becomes a list. */
const UNSCHEDULED_PREVIEW = 4;

function RowIconButton({
  icon,
  color,
  onPress,
  accessibilityLabel,
}: {
  icon: IconName;
  color: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconButton,
        { borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.6 : 1 },
      ]}>
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  );
}

function MonthNavButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const tokens = useTokens();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.navButton,
        {
          borderColor: theme.border,
          borderWidth: tokens.borderWidth,
          borderRadius: tokens.radii.pill,
          opacity: pressed ? 0.6 : 1,
        },
      ]}>
      <Ionicons name={icon} size={18} color={theme.text} />
    </Pressable>
  );
}

/**
 * The calendar, entire. The route file is a wrapper that supplies insets, which
 * is what keeps placement a one-file decision.
 *
 * Everything reads from `useOpenTasksQuery()` — the same unbounded,
 * offline-persisted, realtime-invalidated query the Tasks screen uses — and
 * writes through the existing create/update mutations. No new query, no new
 * mutation key, so `src/lib/mutation-defaults.ts` stays untouched and offline
 * replay is inherited rather than rebuilt.
 */
export function CalendarView({ topInset, bottomInset }: { topInset: number; bottomInset: number }) {
  const router = useRouter();
  const theme = useTheme();
  const tokens = useTokens();
  const { user } = useSession();
  const { data, isLoading, isError, error: queryError, refetch } = useOpenTasksQuery();
  const { data: groups } = useGroupsQuery();
  const createMutation = useCreateTaskMutation();
  const updateMutation = useUpdateTaskMutation();

  // Read once on mount rather than on every render: a bare `new Date()` in the
  // render body is the pattern the React Compiler rules flag. The cost is that
  // "today" does not move if the app is left open across midnight, which is a
  // fair trade for a tab that is revisited rather than watched.
  const [now] = useState(() => new Date());
  const [anchor, setAnchor] = useState(() => startOfLocalDay(now));
  const [selectedKey, setSelectedKey] = useState<DayKey>(() => toDayKey(now));
  const [refreshing, setRefreshing] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  // The task waiting for a day. While this is set the grid is a picker.
  const [armed, setArmed] = useState<Task | null>(null);

  useRealtimeTasks();
  useRealtimeMedications();

  const buckets = useMemo(() => bucketByDay(data ?? [], now), [data, now]);
  const grid = useMemo(() => buildMonthGrid(anchor, WEEK_START), [anchor]);

  const stateByDay = useMemo(() => {
    const map = new Map<DayKey, DayState>();
    for (const [key, dayTasks] of buckets.byDay) {
      map.set(key, {
        count: dayTasks.length,
        hasOverdue: dayTasks.some((t) => !!t.due_at && isOverdue(new Date(t.due_at), now)),
      });
    }
    return map;
  }, [buckets, now]);

  const todayKey = toDayKey(now);

  // Medicines: your own only — anything shared with you lives on the Meds tab.
  // Doses are fetched for exactly the 42 cells on screen, so paging back a
  // month fetches that month rather than widening one ever-growing window.
  const { data: meds } = useMedicationsQuery();
  const myMeds = useMemo(() => (meds ?? []).filter((m) => m.owner_id === user?.id), [meds, user?.id]);
  const gridFrom = grid.cells[0].key;
  const gridTo = grid.cells[grid.cells.length - 1].key;
  // Nothing on screen can have a verdict when the whole grid is in the future.
  const wantsDoses = myMeds.length > 0 && gridFrom <= todayKey;
  const { data: gridDoses } = useDosesQuery(gridFrom, gridTo, wantsDoses);
  const doseIndex = useMemo(() => indexDoses<MedicationDose>(gridDoses ?? []), [gridDoses]);

  const medsByDay = useMemo(() => {
    const map = new Map<DayKey, DaySummary>();
    if (!wantsDoses) return map;
    for (const cell of grid.cells) {
      if (cell.key > todayKey) break;
      const summary = summarizeDay(myMeds, doseIndex, cell.key, now);
      if (summary) map.set(cell.key, summary);
    }
    return map;
  }, [wantsDoses, grid, todayKey, myMeds, doseIndex, now]);

  const daySlots = useMemo(() => slotsForDayAll(myMeds, selectedKey), [myMeds, selectedKey]);
  const medsById = useMemo(() => new Map(myMeds.map((m) => [m.id, m])), [myMeds]);

  const dayTasks = buckets.byDay.get(selectedKey) ?? [];
  const selectedDate = fromDayKey(selectedKey);
  const error = isError && !data ? getErrorMessage(queryError, 'Could not load your tasks.') : null;

  /**
   * A requested task in a group whose Premium has lapsed cannot change its
   * `due_at` — the `enforce_group_task_read_only` trigger names that column
   * explicitly. Computed the same way `task/[id].tsx` does it.
   */
  function isReadOnly(task: Task): boolean {
    return !!task.family_id && groups?.find((g) => g.id === task.family_id)?.is_writable === false;
  }

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function goToMonth(delta: number) {
    setAnchor((current) => addMonths(current, delta));
  }

  function jumpToOldestOverdue() {
    const oldest = buckets.overdue[0];
    if (!oldest?.due_at) return;
    const due = new Date(oldest.due_at);
    setAnchor(startOfLocalDay(due));
    setSelectedKey(toDayKey(due));
  }

  /** Tapping a day either picks it, or lands the task that is waiting for one. */
  function handleSelectDay(key: DayKey) {
    if (!armed) {
      setSelectedKey(key);
      return;
    }
    const day = fromDayKey(key);
    if (!day) return;

    const task = armed;
    setArmed(null);
    setSelectedKey(key);
    setActionError(null);
    tapLight();

    // Only `id` and `due_at`: in UpdateTaskInput `undefined` means "leave
    // alone" and `null` means "clear", so sending anything else would
    // round-trip a value nobody edited.
    //
    // No error-code check below on purpose. The read-only trigger raises a
    // message character-identical to READ_ONLY_MESSAGE, and getErrorMessage
    // returns err.message verbatim — so the right sentence already reaches the
    // user through the ordinary path. Adding a check would be dead code.
    updateMutation.mutate(
      { id: task.id, due_at: withDueTime(day).toISOString() },
      { onError: (err) => setActionError(getErrorMessage(err, 'Could not move this task.')) },
    );
  }

  function handleClearDate(task: Task) {
    setActionError(null);
    updateMutation.mutate(
      { id: task.id, due_at: null },
      { onError: (err) => setActionError(getErrorMessage(err, 'Could not clear this date.')) },
    );
  }

  function handleCreate() {
    const titleError = validateTaskTitle(draftTitle);
    if (titleError) {
      setActionError(titleError);
      return;
    }
    const day = fromDayKey(selectedKey);
    if (!day || !user) return;

    const title = draftTitle;
    setDraftTitle('');
    setActionError(null);
    tapLight();

    // Personal and family_id null, so neither the restrictive insert policy nor
    // the read-only trigger can fire on it.
    createMutation.mutate(
      buildNewTaskInput({ title, due_at: withDueTime(day).toISOString() }, user.id),
      {
        onError: (err) => {
          setActionError(getErrorMessage(err, 'Could not add this task.'));
          setDraftTitle(title);
        },
      },
    );
  }

  function subtitleFor(task: Task): string | undefined {
    if (task.origin !== 'requested') return undefined;
    return task.assignee_id === user?.id
      ? `From ${task.creator?.display_name || 'Unnamed'}`
      : `To ${task.assignee?.display_name || 'Unnamed'}`;
  }

  function renderTask(task: Task) {
    const label = displayTitle(task.title);
    const readOnly = isReadOnly(task);
    return (
      <TaskRow
        key={task.id}
        task={task}
        subtitle={subtitleFor(task)}
        // Completing is the Tasks screen's job; here a tap opens the editor.
        showCheckbox={false}
        onToggleComplete={() => {}}
        onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
        trailingActions={
          readOnly ? undefined : (
            <ThemedView style={styles.trailingActions}>
              <RowIconButton
                icon={ActionIcons.dueDate}
                color={theme.text}
                onPress={() => setArmed(task)}
                accessibilityLabel={
                  task.due_at ? `Move "${label}" to another day` : `Give "${label}" a day`
                }
              />
              {task.due_at ? (
                <RowIconButton
                  icon={ActionIcons.clear}
                  color={theme.textSecondary}
                  onPress={() => handleClearDate(task)}
                  accessibilityLabel={`Clear the date on "${label}"`}
                />
              ) : null}
            </ThemedView>
          )
        }
      />
    );
  }

  function statusColor(status: SlotStatus): string {
    if (status === 'taken') return theme.primary;
    if (status === 'missed') return theme.danger;
    return theme.textSecondary;
  }

  const selectedHeading = selectedDate
    ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
    : 'That day';

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: topInset + Spacing.two }]}>
        <ThemedText type="header" numberOfLines={1}>
          {monthLabel(grid.anchor)}
        </ThemedText>
        <ThemedView style={styles.headerActions}>
          <MonthNavButton
            icon={ActionIcons.back}
            onPress={() => goToMonth(-1)}
            accessibilityLabel="Previous month"
          />
          <MonthNavButton
            icon={ActionIcons.continue}
            onPress={() => goToMonth(1)}
            accessibilityLabel="Next month"
          />
        </ThemedView>
      </ThemedView>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState title="Something went wrong" message={error} actionLabel="Retry" onAction={refetch} />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={[
            styles.content,
            { gap: tokens.spacing.three, paddingBottom: bottomInset + Spacing.four },
          ]}>
          <AlarmStatusBanner tasks={data ?? []} />

          {armed ? (
            <ThemedView
              type="backgroundElement"
              style={[
                styles.armedBanner,
                { borderRadius: tokens.radii.md, padding: tokens.spacing.three, gap: tokens.spacing.two },
              ]}>
              <ThemedText type="small" accessibilityLiveRegion="polite">
                Pick a day for &ldquo;{displayTitle(armed.title)}&rdquo;
              </ThemedText>
              <PrimaryButton
                title="Cancel"
                icon={ActionIcons.cancel}
                variant="secondary"
                onPress={() => setArmed(null)}
              />
            </ThemedView>
          ) : null}

          {actionError ? (
            <ThemedText type="small" themeColor="danger">
              {actionError}
            </ThemedText>
          ) : null}

          <MonthGrid
            grid={grid}
            stateByDay={stateByDay}
            selectedKey={selectedKey}
            todayKey={todayKey}
            onSelectDay={handleSelectDay}
            labelSuffix={armed ? 'tap to move here' : undefined}
            medsByDay={medsByDay}
          />

          {buckets.overdue.length > 0 ? (
            <Pressable
              onPress={jumpToOldestOverdue}
              accessibilityRole="button"
              accessibilityLabel={`${buckets.overdue.length} overdue, go to the oldest`}
              style={({ pressed }) => [styles.overdueLine, { opacity: pressed ? 0.6 : 1 }]}>
              <ThemedText type="smallBold" themeColor="danger">
                {buckets.overdue.length} {buckets.overdue.length === 1 ? 'task' : 'tasks'} overdue
              </ThemedText>
            </Pressable>
          ) : null}

          <ThemedView style={[styles.section, { gap: tokens.spacing.two }]}>
            <ThemedText type="smallBold">{selectedHeading}</ThemedText>

            <ThemedView style={[styles.addRow, { gap: tokens.spacing.two }]}>
              <TextInput
                value={draftTitle}
                onChangeText={setDraftTitle}
                placeholder="Add something for this day..."
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={handleCreate}
                blurOnSubmit={false}
                returnKeyType="done"
                accessibilityLabel={`Add a task due ${selectedHeading}`}
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundElement,
                    borderWidth: tokens.borderWidth,
                    borderRadius: tokens.radii.pill,
                    paddingHorizontal: tokens.spacing.three,
                    paddingVertical: tokens.spacing.two,
                  },
                ]}
              />
              {/* The same round button the compose bar submits with, rather than a
                  labelled one: it is compact enough not to crowd the field, it
                  carries all nine themes' shapes already, and it means adding a
                  task here reads exactly like adding one on the Tasks screen. */}
              <RoundActionButton
                icon={ActionIcons.send}
                onPress={handleCreate}
                disabled={draftTitle.trim().length === 0}
                accessibilityLabel="Add task"
              />
            </ThemedView>

            {dayTasks.length > 0 ? (
              dayTasks.map(renderTask)
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Nothing due this day.
              </ThemedText>
            )}
          </ThemedView>

          {daySlots.length > 0 ? (
            <ThemedView style={[styles.section, { gap: tokens.spacing.two }]}>
              <ThemedText type="smallBold">Medicines</ThemedText>
              {daySlots.map((slot) => {
                const med = medsById.get(slot.medicationId);
                if (!med) return null;
                const status = slotStatus(slot, doseIndex.get(slotKey(slot.medicationId, slot.day, slot.time)), now);
                return (
                  <ThemedView key={slotKey(slot.medicationId, slot.day, slot.time)} style={styles.doseLine}>
                    <Ionicons name={STATUS_GLYPH[status]} size={16} color={statusColor(status)} />
                    <ThemedText type="small" style={styles.doseText}>
                      {formatSlotTime(slot.time)} · {med.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {STATUS_LABEL[status]}
                    </ThemedText>
                  </ThemedView>
                );
              })}
              <Pressable onPress={() => router.navigate('/meds')} accessibilityRole="link">
                <ThemedText type="linkPrimary">Log doses in Meds</ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          {buckets.unscheduled.length > 0 ? (
            <ThemedView style={[styles.section, { gap: tokens.spacing.two }]}>
              <ThemedText type="smallBold">
                {buckets.unscheduled.length}{' '}
                {buckets.unscheduled.length === 1 ? 'task has' : 'tasks have'} no date
              </ThemedText>
              {buckets.unscheduled.slice(0, UNSCHEDULED_PREVIEW).map(renderTask)}
              {buckets.unscheduled.length > UNSCHEDULED_PREVIEW ? (
                <ThemedText type="small" themeColor="textSecondary">
                  and {buckets.unscheduled.length - UNSCHEDULED_PREVIEW} more
                </ThemedText>
              ) : null}
            </ThemedView>
          ) : null}

          {groups?.some((g) => g.is_writable === false) ? (
            <ThemedText type="small" themeColor="textSecondary">
              {READ_ONLY_MESSAGE}
            </ThemedText>
          ) : null}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  armedBanner: {
    alignSelf: 'stretch',
  },
  overdueLine: {
    alignSelf: 'center',
  },
  doseLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  doseText: {
    flex: 1,
  },
  section: {
    backgroundColor: 'transparent',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  trailingActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
