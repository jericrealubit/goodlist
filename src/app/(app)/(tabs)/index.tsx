import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, RefreshControl, StyleSheet, TextInput } from 'react-native';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
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
import { VoiceSheet } from '@/components/voice-sheet';
import { READ_ONLY_MESSAGE } from '@/constants/premium';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useSelectedTheme } from '@/contexts/theme-context';
import { useGroupsQuery } from '@/hooks/use-group-query';
import { useMarkAllReadMutation } from '@/hooks/use-notifications-mutations';
import { useRealtimeTasks } from '@/hooks/use-realtime-tasks';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';
import {
  buildNewRequestInput,
  buildNewTaskInput,
  useCancelTaskMutation,
  useCompleteTaskMutation,
  useCreateRequestMutation,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useReopenTaskMutation,
  useReorderTaskMutation,
} from '@/hooks/use-task-mutations';
import { useOpenTasksQuery } from '@/hooks/use-tasks-query';
import { useTokens } from '@/hooks/use-tokens';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { getErrorMessage } from '@/lib/errors';
import { tapLight } from '@/lib/haptics';
import { taskKeys } from '@/lib/query-client';
import { validateTaskTitle } from '@/lib/validation/task';
import { matchTask } from '@/lib/voice/match-task';
import { parseVoiceCommand } from '@/lib/voice/parse-command';
import type { Task, TaskOrigin } from '@/lib/types';

const TAB_OPTIONS: { id: TaskOrigin; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'requested', label: 'Requested' },
];

/**
 * Dictation adds to what's already in the field rather than replacing it, so
 * someone can type half a task and say the rest — and so pressing the mic by
 * accident never destroys typing.
 */
function mergeDictation(typed: string, heard: string): string {
  return [typed.trim(), heard.trim()].filter(Boolean).join(' ');
}

/** Enough names to bias the recognizer toward a real group; past this it is intent-extra bloat. */
const MAX_CONTEXTUAL_NAMES = 20;

/** Long enough to read one line, short enough not to hold the screen hostage. */
const VOICE_NOTICE_MS = 2600;

/** "Added: buy milk · Sep 19" — one line naming exactly what landed. */
function describeCommit(verb: string, title: string, dueAt: Date | null): string {
  const when = dueAt ? ` · ${dueAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : '';
  return `${verb}: ${title}${when}`;
}

/** The spoken verbs that act on a task that already exists. */
type SpokenVerb = 'completeTask' | 'cancelRequest' | 'deleteTask';

/** The two of those that never act on a voice match alone. */
type DestructiveVerb = 'cancelRequest' | 'deleteTask';

/** What the sheet is currently saying, and how loudly. */
type VoiceNotice = { text: string; tone: 'danger' | 'textSecondary' };

export default function TasksScreen() {
  const router = useRouter();
  const { topInset, bottomInset, pinnedBottomInset } = useTabScreenInsets();
  // With the keyboard up the tab bar is hidden and the compose bar sits on the
  // keyboard's edge, so it needs its own gutter; with the keyboard down the
  // tab bar's inset already supplies one (pinnedBottomInset).
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const { themeId } = useSelectedTheme();
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
  const cancelMutation = useCancelTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [justCompleted, setJustCompleted] = useState<Task[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TaskOrigin>('personal');
  const [assigneeKey, setAssigneeKey] = useState<string | null>(null);
  const [composeText, setComposeText] = useState('');
  const [composeError, setComposeError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [voiceRationaleShown, setVoiceRationaleShown] = useState(false);
  // Whether the sheet is up is derived, never stored: it shows while a session
  // is live or still has something to say, until the user waves it away. A
  // session that ends having heard nothing therefore closes it on its own,
  // with no effect watching for the moment to do so.
  const [voiceDismissed, setVoiceDismissed] = useState(true);
  // The one line the sheet shows once something has happened. A notice clears
  // itself and takes the sheet with it; a problem stays until it is read.
  const [voiceNotice, setVoiceNotice] = useState<VoiceNotice | null>(null);
  // A verb that matched more than one task, and a destructive one waiting on a
  // deliberate tap. Either one holds the sheet open.
  const [voiceChoice, setVoiceChoice] = useState<{ verb: SpokenVerb; tasks: Task[] } | null>(null);
  const [voicePending, setVoicePending] = useState<{ verb: DestructiveVerb; task: Task } | null>(null);
  const composeInputRef = useRef<TextInput>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Every group member but the user, pooled across every group they belong to
  // (up to 2). `writable` rides along so a task spoken at a group whose
  // Premium has lapsed can say why it didn't land, instead of quietly matching
  // nobody.
  const memberOptions = useMemo(
    () =>
      (groups ?? []).flatMap((g) =>
        g.members
          .filter((m) => m.user_id !== user?.id)
          .map((m) => ({
            userId: m.user_id,
            familyId: g.id,
            displayName: m.profiles?.display_name || 'Unnamed',
            groupName: g.name,
            writable: g.is_writable !== false,
          })),
      ),
    [groups, user],
  );

  // What the assignee picker offers, and the only members a request can
  // actually be created for — picking one determines which group's family_id
  // the request attaches to.
  const otherMemberOptions = useMemo(() => memberOptions.filter((o) => o.writable), [memberOptions]);

  // Handed to the recognizer so it hears "Maria" rather than "Mariah". Deduped,
  // because one person can be in both groups, and capped so an unusually large
  // group can't bloat the intent extras.
  const contextualStrings = useMemo(
    () =>
      Array.from(new Set(memberOptions.map((o) => o.displayName)))
        .filter((name) => name !== 'Unnamed')
        .slice(0, MAX_CONTEXTUAL_NAMES),
    [memberOptions],
  );

  function closeVoiceSheet() {
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
      noticeTimer.current = null;
    }
    setVoiceNotice(null);
    setVoiceChoice(null);
    setVoicePending(null);
    setVoiceDismissed(true);
  }

  /** Says what just landed, then gets out of the way on its own. */
  function showVoiceNotice(text: string) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setVoiceNotice({ text, tone: 'textSecondary' });
    noticeTimer.current = setTimeout(() => {
      noticeTimer.current = null;
      // Nothing left to show, so the sheet closes along with the notice.
      setVoiceNotice(null);
    }, VOICE_NOTICE_MS);
  }

  /** Something didn't work in a way worth reading. Stays until it's dismissed. */
  function showVoiceProblem(text: string) {
    if (noticeTimer.current) {
      clearTimeout(noticeTimer.current);
      noticeTimer.current = null;
    }
    setVoiceNotice({ text, tone: 'danger' });
  }

  /**
   * What a sentence the grammar doesn't claim is worth: the compose bar, filled
   * in and ready to send. Nothing is committed, so a misheard word costs an
   * edit rather than an undo.
   */
  function fallBackToCompose(text: string) {
    closeVoiceSheet();
    setComposeText(mergeDictation(composeText, text));
    setComposeError(null);
    composeInputRef.current?.focus();
  }

  /** Spoken failures report where typed ones do, not in a sheet to be dismissed. */
  function failVoice(err: unknown, fallback: string) {
    closeVoiceSheet();
    setComposeError(getErrorMessage(err, fallback));
  }

  function commitSpokenTask(title: string, dueAt: Date | null) {
    if (validateTaskTitle(title)) {
      fallBackToCompose(title);
      return;
    }
    createTaskMutation.mutate(buildNewTaskInput({ title, due_at: dueAt?.toISOString() ?? null }, user!.id), {
      onError: (err) => failVoice(err, 'Could not add this task.'),
    });
    showVoiceNotice(describeCommit('Added', title, dueAt));
  }

  function commitSpokenRequest(assignee: string, title: string, dueAt: Date | null) {
    const target = otherMemberOptions.find((o) => o.displayName === assignee);
    if (!target) {
      // The parser only returns a name a real member answers to, so the one way
      // to arrive here is a group that has gone read-only — the same rule the
      // send button enforces, reported in the same words.
      closeVoiceSheet();
      setComposeError(READ_ONLY_MESSAGE);
      return;
    }
    if (validateTaskTitle(title)) {
      fallBackToCompose(title);
      return;
    }
    createRequestMutation.mutate(
      buildNewRequestInput(
        { title, assigneeId: target.userId, familyId: target.familyId, due_at: dueAt?.toISOString() ?? null },
        user!.id,
      ),
      { onError: (err) => failVoice(err, 'Could not ask for this task.') },
    );
    showVoiceNotice(describeCommit(`Asked ${target.displayName}`, title, dueAt));
  }

  /**
   * Which tasks each verb is even allowed to touch. These are the rules the
   * screen already enforces by hand — a checkbox only appears on a requested
   * task you were the one asked to do, and the database only lets you delete
   * or cancel rows you created. Applying them *before* matching means a spoken
   * verb can never land on a task a tap couldn't reach.
   */
  function poolFor(verb: SpokenVerb): Task[] {
    const open = openTasks ?? [];
    if (verb === 'completeTask') {
      return open.filter((t) => t.origin !== 'requested' || t.assignee_id === user?.id);
    }
    if (verb === 'cancelRequest') {
      return open.filter((t) => t.origin === 'requested' && t.creator_id === user?.id);
    }
    return open.filter((t) => t.creator_id === user?.id);
  }

  /**
   * Completing happens at once: it is exactly what a tap does, it animates the
   * same way, and it is undoable. Cancelling and deleting never do — they stop
   * and ask, because speech is the input most likely to have misheard which
   * task was meant, and a wrong delete is the one mistake with no undo.
   */
  function runSpokenVerb(verb: SpokenVerb, task: Task) {
    setVoiceChoice(null);
    if (verb === 'completeTask') {
      setVoicePending(null);
      handleToggle(task);
      showVoiceNotice(`Completed: ${task.title}`);
      return;
    }
    setVoicePending({ verb, task });
  }

  /** Runs only after the confirmation above has been tapped. */
  function confirmVoicePending() {
    if (!voicePending) return;
    const { verb, task } = voicePending;
    setVoicePending(null);
    if (verb === 'deleteTask') {
      deleteMutation.mutate(task, { onError: (err) => failVoice(err, 'Could not delete this task.') });
      showVoiceNotice(`Deleted: ${task.title}`);
      return;
    }
    cancelMutation.mutate(task, { onError: (err) => failVoice(err, 'Could not cancel this request.') });
    showVoiceNotice(`Cancelled: ${task.title}`);
  }

  function actOnSpokenTask(verb: SpokenVerb, titleHint: string) {
    const { match, candidates } = matchTask(titleHint, poolFor(verb));
    if (match) {
      runSpokenVerb(verb, match);
      return;
    }
    if (candidates.length) {
      setVoiceChoice({ verb, tasks: candidates });
      return;
    }
    // Nothing on the list was close. Saying so is better than acting on a
    // guess, and better than quietly turning "finish the milk" into a new task.
    showVoiceProblem(`Couldn’t find a task like “${titleHint}”.`);
  }

  function handleVoiceChoose(id: string) {
    if (!voiceChoice) return;
    const picked = voiceChoice.tasks.find((t) => t.id === id);
    if (picked) runSpokenVerb(voiceChoice.verb, picked);
  }

  /** Reopens the last thing completed on this screen — what the checkbox undoes. */
  function undoSpoken() {
    const last = justCompleted[justCompleted.length - 1];
    if (!last) {
      showVoiceProblem('Nothing to undo yet.');
      return;
    }
    setVoiceChoice(null);
    setVoicePending(null);
    handleToggle(last);
    showVoiceNotice(`Back on the list: ${last.title}`);
  }

  function navigateSpoken(to: 'tasks' | 'history' | 'group' | 'settings') {
    closeVoiceSheet();
    // Already on the task list — "show my tasks" just means close this.
    if (to === 'tasks') return;
    router.push(to === 'history' ? '/history' : to === 'group' ? '/group' : '/settings');
  }

  // One final transcript, one thing done. Adding, asking and completing commit
  // straight away — a tap does each of those instantly too, and all three are
  // undoable — while destroying anything stops to ask first.
  function handleVoiceTranscript(heard: string) {
    tapLight();
    const command = parseVoiceCommand(heard, {
      now: new Date(),
      memberNames: memberOptions.map((o) => o.displayName),
    });
    switch (command.kind) {
      case 'addTask':
        commitSpokenTask(command.title, command.dueAt);
        return;
      case 'requestTask':
        commitSpokenRequest(command.assignee, command.title, command.dueAt);
        return;
      case 'completeTask':
      case 'cancelRequest':
      case 'deleteTask':
        actOnSpokenTask(command.kind, command.titleHint);
        return;
      case 'undo':
        undoSpoken();
        return;
      case 'navigate':
        navigateSpoken(command.to);
        return;
      case 'dictation':
        fallBackToCompose(command.text);
    }
  }

  const voice = useVoiceInput(handleVoiceTranscript);
  const listening = voice.status === 'starting' || voice.status === 'listening';
  const voiceSheetVisible =
    !voiceDismissed &&
    (listening || !!voice.error || !!voiceNotice || !!voiceChoice || !!voicePending);

  function handleVoicePress() {
    if (listening) {
      voice.stop();
      return;
    }
    // Say why the microphone is wanted before the system asks for it, not after.
    if (voice.needsRationale && !voiceRationaleShown) {
      setVoiceRationaleShown(true);
      setComposeError('Goodlist needs the microphone to hear a task. Tap the mic again to allow it.');
      return;
    }
    setComposeError(null);
    setVoiceNotice(null);
    setVoiceChoice(null);
    setVoicePending(null);
    setVoiceDismissed(false);
    tapLight();
    voice.start({ contextualStrings });
  }

  function handleVoiceCancel() {
    voice.cancel();
    voice.clearError();
    closeVoiceSheet();
  }

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const error = isError && !openTasks ? getErrorMessage(queryError, 'Could not load your tasks.') : null;
  // Typing and speaking report into the same slot — there is only ever one
  // thing wrong with the compose bar at a time. While the sheet is up it owns
  // the session's own errors, so they never print twice.
  const shownError = composeError ?? (voiceSheetVisible ? null : voice.error);
  const tab = groups?.length ? activeTab : 'personal';

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
    tapLight();
    setActionError(null);
    if (task.status === 'open') {
      setJustCompleted((current) => [
        ...current,
        { ...task, status: 'completed', completed_at: new Date().toISOString() },
      ]);
      completeMutation.mutate(task, {
        onError: (err) => {
          setJustCompleted((current) => current.filter((t) => t.id !== task.id));
          setActionError(getErrorMessage(err, 'Could not update this task.'));
        },
      });
    } else {
      setJustCompleted((current) => current.filter((t) => t.id !== task.id));
      reopenMutation.mutate(task, {
        onError: (err) => {
          setJustCompleted((current) => [...current, task]);
          setActionError(getErrorMessage(err, 'Could not update this task.'));
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
      setComposeError(
        groups?.some((g) => g.is_writable === false) ? READ_ONLY_MESSAGE : 'Choose who this task is for.',
      );
      return;
    }
    setComposeError(null);
    voice.clearError();
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

    tapLight();
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
  const headerTitle = groups?.length ? groups.map((g) => g.name).join(' · ') : 'Solo mode';

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: topInset + Spacing.two }]}>
        <ThemedText type="header" numberOfLines={1}>
          {headerTitle}
        </ThemedText>
        {actionError ? (
          <ThemedText type="small" themeColor="danger">
            {actionError}
          </ThemedText>
        ) : null}
      </ThemedView>

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
              // Sortable measures each row once and positions the rest off
              // those heights. Row height is token-derived (task-row.tsx pads
              // with tokens.spacing), so a theme whose spacing scale differs
              // leaves the cached heights wrong and the rows overlapping —
              // colors repaint, the layout doesn't. Keying on the theme
              // remounts the grid so it measures again.
              key={themeId}
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

        <ThemedView
          style={[
            styles.footer,
            { paddingBottom: keyboardVisible ? Spacing.two : pinnedBottomInset },
          ]}>
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
          {shownError ? (
            <ThemedText type="small" themeColor="danger">
              {shownError}
            </ThemedText>
          ) : null}
          <ComposeBar
            ref={composeInputRef}
            value={composeText}
            onChangeText={setComposeText}
            onSubmit={handleSubmitCompose}
            placeholder={tab === 'personal' ? 'I want to...' : 'Ask for...'}
            onVoicePress={voice.status === 'unavailable' ? undefined : handleVoicePress}
            voice={{ listening, starting: voice.status === 'starting', level: voice.level }}
          />
        </ThemedView>
      </KeyboardAvoidingView>

      {/* Both are absolutely positioned, and last so they paint over everything
          above — the listening sheet last of all, since it covers the screen. */}
      <OfflineBanner />
      {voiceSheetVisible ? (
        <VoiceSheet
          listening={listening}
          transcript={voice.transcript}
          level={voice.level}
          message={voiceNotice?.text ?? voice.error}
          tone={voiceNotice?.tone ?? 'danger'}
          choices={voiceChoice?.tasks.map((t) => ({ id: t.id, label: t.title }))}
          onChoose={handleVoiceChoose}
          confirm={
            voicePending
              ? {
                  prompt: `${voicePending.verb === 'deleteTask' ? 'Delete' : 'Cancel'} “${voicePending.task.title}”?`,
                  actionLabel: voicePending.verb === 'deleteTask' ? 'Delete' : 'Cancel task',
                  onConfirm: confirmVoicePending,
                }
              : undefined
          }
          onCancel={handleVoiceCancel}
        />
      ) : null}
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
    // Opaque (ThemedView paints the background), so the list scrolls *under*
    // this band. Without the top padding a task card is clipped flush against
    // the input's top edge instead of fading out with a gutter above it.
    // Matches PinnedBottomClearance below the input, so the bar sits in an
    // even gutter rather than a lopsided one once the keyboard is up.
    paddingTop: Spacing.two,
  },
});
