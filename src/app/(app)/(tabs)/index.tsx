import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComposeBar } from '@/components/compose-bar';
import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { OptionPicker } from '@/components/option-picker';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, WebTopNavInset } from '@/constants/theme';
import { useGroup } from '@/contexts/group-context';
import { useNotifications } from '@/contexts/notifications-context';
import { useSession } from '@/contexts/session-context';
import { useRealtimeTasks } from '@/hooks/use-realtime-tasks';
import { getErrorMessage } from '@/lib/errors';
import { listOpenTasks } from '@/lib/queries/tasks';
import { completeTask, createRequest, createTask, reopenTask } from '@/lib/mutations/tasks';
import { validateTaskTitle } from '@/lib/validation/task';
import type { Task, TaskOrigin } from '@/lib/types';

const TAB_OPTIONS: { id: TaskOrigin; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'requested', label: 'Requested' },
];

export default function TasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { group } = useGroup();
  const { user } = useSession();
  const { markAllRead } = useNotifications();

  const [openTasks, setOpenTasks] = useState<Task[] | null>(null);
  const [justCompleted, setJustCompleted] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TaskOrigin>('personal');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [composeText, setComposeText] = useState('');
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeSaving, setComposeSaving] = useState(false);
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

  async function handleToggle(task: Task) {
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
      }
    } else {
      setJustCompleted((current) => current.filter((t) => t.id !== task.id));
      setOpenTasks((current) => (current ? [{ ...task, status: 'open', completed_at: null }, ...current] : current));
      try {
        await reopenTask(task.id);
      } catch {
        setOpenTasks((current) => current?.filter((t) => t.id !== task.id) ?? current);
        setJustCompleted((current) => [...current, task]);
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

  const visibleTasks = [...(openTasks ?? []), ...justCompleted].filter((t) => t.origin === tab);
  const showAssigneePicker = tab === 'requested' && otherMembers.length >= 2;

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + WebTopNavInset + Spacing.three }]}>
        <ThemedText type="title">Goodlist</ThemedText>
        <ThemedText themeColor="textSecondary">{group ? group.name : 'Solo mode'}</ThemedText>
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

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {openTasks === null ? (
          <LoadingState />
        ) : error ? (
          <EmptyState title="Something went wrong" message={error} actionLabel="Retry" onAction={load} />
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            title={tab === 'personal' ? 'Nothing on your list yet' : 'No requests yet'}
            message={
              tab === 'personal'
                ? 'Type below to add your first Personal task.'
                : 'Type below to request a task from a group member.'
            }
          />
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + BottomTabInset + Spacing.six + (showAssigneePicker ? Spacing.six : 0) },
            ]}>
            {visibleTasks.map((item) => {
              const isRequested = item.origin === 'requested';
              const isAssignee = item.assignee_id === user?.id;
              const subtitle = isRequested
                ? isAssignee
                  ? `From ${item.creator?.display_name || 'Unnamed'}`
                  : `To ${item.assignee?.display_name || 'Unnamed'}`
                : undefined;
              return (
                <TaskRow
                  key={item.id}
                  task={item}
                  subtitle={subtitle}
                  showCheckbox={!isRequested || isAssignee}
                  onToggleComplete={() => handleToggle(item)}
                  onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
                />
              );
            })}
          </ScrollView>
        )}

        <ThemedView
          style={[styles.footer, { paddingBottom: insets.bottom + BottomTabInset + Spacing.two }]}>
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
    paddingBottom: Spacing.three,
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
    gap: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
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
