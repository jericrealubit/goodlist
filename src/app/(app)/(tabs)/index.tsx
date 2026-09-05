import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, TextInput } from 'react-native';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridDragEndParams } from 'react-native-sortables';

import { ComposeBar } from '@/components/compose-bar';
import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { OptionPicker } from '@/components/option-picker';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useGroup } from '@/contexts/group-context';
import { useNotifications } from '@/contexts/notifications-context';
import { useSession } from '@/contexts/session-context';
import { useRealtimeTasks } from '@/hooks/use-realtime-tasks';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';
import { useTokens } from '@/hooks/use-tokens';
import { getErrorMessage } from '@/lib/errors';
import { listOpenTasks } from '@/lib/queries/tasks';
import { completeTask, createRequest, createTask, reopenTask, reorderTask } from '@/lib/mutations/tasks';
import { validateTaskTitle } from '@/lib/validation/task';
import type { Task, TaskOrigin } from '@/lib/types';

const TAB_OPTIONS: { id: TaskOrigin; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'requested', label: 'Requested' },
];

export default function TasksScreen() {
  const router = useRouter();
  const { topInset, bottomInset } = useTabScreenInsets();
  const tokens = useTokens();
  const { group } = useGroup();
  const { user } = useSession();
  const { markAllRead } = useNotifications();
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [openTasks, setOpenTasks] = useState<Task[] | null>(null);
  const [justCompleted, setJustCompleted] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TaskOrigin>('personal');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [composeText, setComposeText] = useState('');
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSaving, setComposeSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const composeInputRef = useRef<TextInput>(null);

  const tab = group ? activeTab : 'personal';

  const otherMembers = useMemo(
    () => group?.members.filter((m) => m.user_id !== user?.id) ?? [],
    [group, user],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listOpenTasks();
      setOpenTasks(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your tasks.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setJustCompleted([]);
      load();
      markAllRead();
    }, [load, markAllRead]),
  );

  useRealtimeTasks(load);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleToggle(task: Task) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionError(null);
    if (task.status === 'open') {
      setOpenTasks((current) => current?.filter((t) => t.id !== task.id) ?? current);
      setJustCompleted((current) => [
        ...current,
        { ...task, status: 'completed', completed_at: new Date().toISOString() },
      ]);
      try {
        await completeTask(task.id);
      } catch {
        setJustCompleted((current) => current.filter((t) => t.id !== task.id));
        setOpenTasks((current) => (current ? [task, ...current] : [task]));
        setActionError('Could not update this task.');
      }
    } else {
      setJustCompleted((current) => current.filter((t) => t.id !== task.id));
      setOpenTasks((current) => (current ? [{ ...task, status: 'open', completed_at: null }, ...current] : current));
      try {
        await reopenTask(task.id);
      } catch {
        setOpenTasks((current) => current?.filter((t) => t.id !== task.id) ?? current);
        setJustCompleted((current) => [...current, task]);
        setActionError('Could not update this task.');
      }
    }
  }

  const effectiveAssigneeId =
    otherMembers.length === 1 ? otherMembers[0].user_id : otherMembers.length >= 2 ? assigneeId ?? otherMembers[0].user_id : null;

  async function handleSubmitCompose() {
    const titleError = validateTaskTitle(composeText);
    if (titleError) {
      setComposeError(titleError);
      return;
    }
    if (tab === 'requested' && (!group || !effectiveAssigneeId)) {
      setComposeError('Choose who this task is for.');
      return;
    }
    setComposeError(null);
    setComposeSaving(true);
    composeInputRef.current?.focus();
    try {
      const created =
        tab === 'personal'
          ? await createTask({ title: composeText })
          : await createRequest({ title: composeText, assigneeId: effectiveAssigneeId!, familyId: group!.id });
      setOpenTasks((current) => (current ? [created, ...current] : [created]));
      setComposeText('');
      composeInputRef.current?.focus();
    } catch (err) {
      setComposeError(getErrorMessage(err, 'Could not add this task.'));
    } finally {
      setComposeSaving(false);
    }
  }

  function applyReorder(data: Task[], toIndex: number) {
    const movedItem = data[toIndex];
    const prev = data[toIndex - 1];
    const next = data[toIndex + 1];
    let newSortOrder: number;
    if (prev && next) {
      newSortOrder = (prev.sort_order + next.sort_order) / 2;
    } else if (prev) {
      newSortOrder = prev.sort_order + 1;
    } else if (next) {
      newSortOrder = next.sort_order - 1;
    } else {
      newSortOrder = movedItem.sort_order;
    }

    setActionError(null);
    setOpenTasks((current) => {
      const otherTabs = (current ?? []).filter((t) => t.origin !== tab);
      const reorderedTab = data.map((t) => (t.id === movedItem.id ? { ...t, sort_order: newSortOrder } : t));
      return [...reorderedTab, ...otherTabs];
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reorderTask(movedItem.id, newSortOrder).catch(() => {
      setActionError('Could not save the new order.');
      load();
    });
  }

  function handleDragEnd({ data, toIndex }: SortableGridDragEndParams<Task>) {
    applyReorder(data, toIndex);
  }

  // Non-gesture alternative to drag-to-reorder (screen-reader "Move up"/"Move
  // down" accessibility actions) — reuses the exact same sort_order math as
  // dragging, just computed from a plain array move instead of the Sortable
  // grid's own drag-end callback.
  function handleMove(task: Task, direction: 'up' | 'down') {
    const fromIndex = openVisibleTasks.findIndex((t) => t.id === task.id);
    const toIndex = fromIndex + (direction === 'up' ? -1 : 1);
    if (fromIndex === -1 || toIndex < 0 || toIndex >= openVisibleTasks.length) return;
    const reordered = [...openVisibleTasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    applyReorder(reordered, toIndex);
  }

  function renderTaskRow(item: Task, draggable: boolean) {
    const isRequested = item.origin === 'requested';
    const isAssignee = item.assignee_id === user?.id;
    const subtitle = isRequested
      ? isAssignee
        ? `From ${item.creator?.display_name || 'Unnamed'}`
        : `To ${item.assignee?.display_name || 'Unnamed'}`
      : undefined;
    const indexInList = draggable ? openVisibleTasks.findIndex((t) => t.id === item.id) : -1;
    return (
      <TaskRow
        task={item}
        subtitle={subtitle}
        showCheckbox={!isRequested || isAssignee}
        onToggleComplete={() => handleToggle(item)}
        onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
        draggable={draggable}
        onMoveUp={draggable && indexInList > 0 ? () => handleMove(item, 'up') : undefined}
        onMoveDown={
          draggable && indexInList >= 0 && indexInList < openVisibleTasks.length - 1
            ? () => handleMove(item, 'down')
            : undefined
        }
      />
    );
  }

  const openVisibleTasks = (openTasks ?? []).filter((t) => t.origin === tab);
  const completedVisibleTasks = justCompleted.filter((t) => t.origin === tab);
  const isEmpty = openVisibleTasks.length === 0 && completedVisibleTasks.length === 0;
  const showAssigneePicker = tab === 'requested' && otherMembers.length >= 2;

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: topInset + Spacing.two }]}>
        <ThemedText type="header">{group ? group.name : 'Solo mode'}</ThemedText>
        {actionError ? (
          <ThemedText type="small" themeColor="danger">
            {actionError}
          </ThemedText>
        ) : null}
      </ThemedView>

      {group ? (
        <ThemedView style={styles.tabRow}>
          <OptionPicker
            layout="row"
            options={TAB_OPTIONS}
            selectedId={tab}
            onSelect={(id) => setActiveTab(id as TaskOrigin)}
          />
        </ThemedView>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        {openTasks === null ? (
          <LoadingState />
        ) : error ? (
          <EmptyState title="Something went wrong" message={error} actionLabel="Retry" onAction={load} />
        ) : isEmpty ? (
          <EmptyState
            title={tab === 'personal' ? 'Nothing on your list yet' : 'No requests yet'}
            message={
              tab === 'personal'
                ? 'Type below to add your first Personal task.'
                : 'Type below to request a task from a group member.'
            }
          />
        ) : (
          <Animated.ScrollView
            ref={scrollableRef}
            style={styles.flex}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={[
              styles.listContent,
              { gap: tokens.spacing.two, paddingBottom: bottomInset + Spacing.six + (showAssigneePicker ? Spacing.six : 0) },
            ]}>
            <Sortable.Grid
              columns={1}
              rowGap={tokens.spacing.two}
              data={openVisibleTasks}
              keyExtractor={(item) => item.id}
              scrollableRef={scrollableRef}
              onDragEnd={handleDragEnd}
              renderItem={({ item }) => renderTaskRow(item, true)}
            />
            {completedVisibleTasks.length > 0 ? (
              <ThemedView style={styles.completedSection}>
                {completedVisibleTasks.map((item) => (
                  <ThemedView key={item.id}>{renderTaskRow(item, false)}</ThemedView>
                ))}
              </ThemedView>
            ) : null}
          </Animated.ScrollView>
        )}

        <ThemedView style={[styles.footer, { paddingBottom: Spacing.two }]}>
          {showAssigneePicker ? (
            <OptionPicker
              layout="row"
              options={otherMembers.map((m) => ({ id: m.user_id, label: m.profiles?.display_name || 'Unnamed' }))}
              selectedId={effectiveAssigneeId}
              onSelect={setAssigneeId}
            />
          ) : null}
          {composeError ? (
            <ThemedText type="small" themeColor="danger">
              {composeError}
            </ThemedText>
          ) : null}
          <ComposeBar
            ref={composeInputRef}
            value={composeText}
            onChangeText={setComposeText}
            onSubmit={handleSubmitCompose}
            submitting={composeSaving}
            placeholder={tab === 'personal' ? 'I want to...' : 'Ask for...'}
          />
        </ThemedView>
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.half,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  tabRow: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  completedSection: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
