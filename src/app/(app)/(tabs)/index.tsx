import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, RefreshControl, StyleSheet, TextInput } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridDragEndParams } from 'react-native-sortables';

import { ComposeBar } from '@/components/compose-bar';
import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { OfflineBanner } from '@/components/offline-banner';
import { OptionPicker } from '@/components/option-picker';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useGroupsQuery } from '@/hooks/use-group-query';
import { useMarkAllReadMutation } from '@/hooks/use-notifications-mutations';
import { useRealtimeTasks } from '@/hooks/use-realtime-tasks';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';
import {
  buildNewRequestInput,
  buildNewTaskInput,
  useCompleteTaskMutation,
  useCreateRequestMutation,
  useCreateTaskMutation,
  useReopenTaskMutation,
  useReorderTaskMutation,
} from '@/hooks/use-task-mutations';
import { useOpenTasksQuery } from '@/hooks/use-tasks-query';
import { useTokens } from '@/hooks/use-tokens';
import { getErrorMessage } from '@/lib/errors';
import { taskKeys } from '@/lib/query-client';
import { validateTaskTitle } from '@/lib/validation/task';
import type { Task, TaskOrigin } from '@/lib/types';

const TAB_OPTIONS: { id: TaskOrigin; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'requested', label: 'Requested' },
];

export default function TasksScreen() {
  const router = useRouter();
  const { topInset, bottomInset, pinnedBottomInset } = useTabScreenInsets();
  const tokens = useTokens();
  const { data: groups } = useGroupsQuery();
  const { user } = useSession();
  const { mutate: markAllRead } = useMarkAllReadMutation();
  const queryClient = useQueryClient();
  const { data: openTasks, isLoading, isError, error: queryError, refetch } = useOpenTasksQuery();
  const createTaskMutation = useCreateTaskMutation();
  const createRequestMutation = useCreateRequestMutation();
  const completeMutation = useCompleteTaskMutation();
  const reopenMutation = useReopenTaskMutation();
  const reorderMutation = useReorderTaskMutation();
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [justCompleted, setJustCompleted] = useState<Task[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TaskOrigin>('personal');
  const [assigneeKey, setAssigneeKey] = useState<string | null>(null);
  const [composeText, setComposeText] = useState('');
  const [composeError, setComposeError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const composeInputRef = useRef<TextInput>(null);

  const error = isError && !openTasks ? getErrorMessage(queryError, 'Could not load your tasks.') : null;
  const tab = groups?.length ? activeTab : 'personal';

  // Pooled across every group the user belongs to (up to 2) rather than
  // scoped to a single one — picking an option determines which group's
  // family_id the created request attaches to.
  const otherMemberOptions = useMemo(
    () =>
      (groups ?? []).flatMap((g) =>
        g.members
          .filter((m) => m.user_id !== user?.id)
          .map((m) => ({
            userId: m.user_id,
            familyId: g.id,
            displayName: m.profiles?.display_name || 'Unnamed',
            groupName: g.name,
          })),
      ),
    [groups, user],
  );

  useFocusEffect(
    useCallback(() => {
      setJustCompleted([]);
      markAllRead();
    }, [markAllRead]),
  );

  useRealtimeTasks();

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function handleToggle(task: Task) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionError(null);
    if (task.status === 'open') {
      setJustCompleted((current) => [
        ...current,
        { ...task, status: 'completed', completed_at: new Date().toISOString() },
      ]);
      completeMutation.mutate(task, {
        onError: () => {
          setJustCompleted((current) => current.filter((t) => t.id !== task.id));
          setActionError('Could not update this task.');
        },
      });
    } else {
      setJustCompleted((current) => current.filter((t) => t.id !== task.id));
      reopenMutation.mutate(task, {
        onError: () => {
          setJustCompleted((current) => [...current, task]);
          setActionError('Could not update this task.');
        },
      });
    }
  }

  // Falls back to the first option (rather than resetting via an effect)
  // whenever the stored key doesn't match anything currently pooled — e.g.
  // right after the very first render, or if the user left a group mid-session.
  const effectiveAssignee =
    otherMemberOptions.length === 1
      ? otherMemberOptions[0]
      : otherMemberOptions.length >= 2
        ? (otherMemberOptions.find((o) => `${o.familyId}:${o.userId}` === assigneeKey) ?? otherMemberOptions[0])
        : null;

  function handleSubmitCompose() {
    const titleError = validateTaskTitle(composeText);
    if (titleError) {
      setComposeError(titleError);
      return;
    }
    if (tab === 'requested' && !effectiveAssignee) {
      setComposeError('Choose who this task is for.');
      return;
    }
    setComposeError(null);
    const title = composeText;
    setComposeText('');
    composeInputRef.current?.focus();

    const onError = (err: unknown) => {
      setComposeError(getErrorMessage(err, 'Could not add this task.'));
      setComposeText(title);
    };

    if (tab === 'personal') {
      createTaskMutation.mutate(buildNewTaskInput({ title }, user!.id), { onError });
    } else {
      createRequestMutation.mutate(
        buildNewRequestInput(
          { title, assigneeId: effectiveAssignee!.userId, familyId: effectiveAssignee!.familyId },
          user!.id,
        ),
        { onError },
      );
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
    queryClient.setQueryData<Task[]>(taskKeys.open, (current) => {
      const otherTabs = (current ?? []).filter((t) => t.origin !== tab);
      const reorderedTab = data.map((t) => (t.id === movedItem.id ? { ...t, sort_order: newSortOrder } : t));
      return [...reorderedTab, ...otherTabs];
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reorderMutation.mutate(
      { id: movedItem.id, sortOrder: newSortOrder },
      { onError: () => setActionError('Could not save the new order.') },
    );
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
  const showAssigneePicker = tab === 'requested' && otherMemberOptions.length >= 2;
  const headerTitle = !groups?.length ? 'Solo mode' : groups.length === 1 ? groups[0].name : 'Groups';

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: topInset + Spacing.two }]}>
        <ThemedText type="header">{headerTitle}</ThemedText>
        {actionError ? (
          <ThemedText type="small" themeColor="danger">
            {actionError}
          </ThemedText>
        ) : null}
      </ThemedView>

      <OfflineBanner />

      {groups?.length ? (
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
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <EmptyState title="Something went wrong" message={error} actionLabel="Retry" onAction={refetch} />
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
              {
                gap: tokens.spacing.two,
                // The compose bar floats over the list, so the last task has to
                // be able to scroll clear of it as well as of the tab bar.
                paddingBottom:
                  Math.max(bottomInset, pinnedBottomInset) +
                  Spacing.six +
                  (showAssigneePicker ? Spacing.six : 0),
              },
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

        <ThemedView style={[styles.footer, { paddingBottom: pinnedBottomInset }]}>
          {showAssigneePicker ? (
            <OptionPicker
              layout="row"
              options={otherMemberOptions.map((o) => ({
                id: `${o.familyId}:${o.userId}`,
                label: groups && groups.length > 1 ? `${o.displayName} (${o.groupName})` : o.displayName,
              }))}
              selectedId={effectiveAssignee ? `${effectiveAssignee.familyId}:${effectiveAssignee.userId}` : null}
              onSelect={setAssigneeKey}
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
