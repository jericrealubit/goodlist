import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, WebTopNavInset } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useRealtimeTasks } from '@/hooks/use-realtime-tasks';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';
import { deleteAllHistory, deleteTask, reopenTask } from '@/lib/mutations/tasks';
import { listHistory } from '@/lib/queries/tasks';
import type { Task } from '@/lib/types';

function RowIconButton({
  glyph,
  color,
  onPress,
  accessibilityLabel,
}: {
  glyph: string;
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
      <ThemedText style={[styles.iconGlyph, { color }]}>{glyph}</ThemedText>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useSession();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTasks(await listHistory());
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your history.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useRealtimeTasks(load);

  async function handleUndo(task: Task) {
    setTasks((current) => current?.filter((t) => t.id !== task.id) ?? current);
    try {
      await reopenTask(task.id);
    } catch (err) {
      setTasks((current) => (current ? [task, ...current] : [task]));
      setError(getErrorMessage(err, 'Could not undo this task.'));
    }
  }

  async function handleDelete(task: Task) {
    setTasks((current) => current?.filter((t) => t.id !== task.id) ?? current);
    try {
      await deleteTask(task.id);
    } catch (err) {
      setTasks((current) => (current ? [task, ...current] : [task]));
      setError(getErrorMessage(err, 'Could not delete this task.'));
    }
  }

  async function handleDeleteAll() {
    setDeleteAllError(null);
    setDeletingAll(true);
    try {
      await deleteAllHistory();
      setConfirmingDeleteAll(false);
      await load();
    } catch (err) {
      setDeleteAllError(getErrorMessage(err, 'Could not delete your history.'));
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + WebTopNavInset + Spacing.three }]}>
        <ThemedText type="title">History</ThemedText>
        <ThemedText themeColor="textSecondary">Completed and cancelled tasks</ThemedText>
      </ThemedView>

      {tasks && tasks.length > 0 ? (
        <ThemedView style={styles.deleteAllZone}>
          {deleteAllError ? (
            <ThemedText type="small" themeColor="danger">
              {deleteAllError}
            </ThemedText>
          ) : null}
          {confirmingDeleteAll ? (
            <ThemedView style={styles.deleteAllConfirm}>
              <ThemedText type="small" themeColor="danger">
                This permanently deletes everything in your history. Tasks someone else requested from you
                won't be removed — only what you can delete.
              </ThemedText>
              <ThemedView style={styles.deleteAllButtons}>
                <PrimaryButton
                  title="Yes, delete all"
                  onPress={handleDeleteAll}
                  loading={deletingAll}
                  variant="danger"
                  style={styles.deleteAllButton}
                />
                <PrimaryButton
                  title="Cancel"
                  onPress={() => setConfirmingDeleteAll(false)}
                  disabled={deletingAll}
                  variant="secondary"
                  style={styles.deleteAllButton}
                />
              </ThemedView>
            </ThemedView>
          ) : (
            <PrimaryButton title="Delete all" onPress={() => setConfirmingDeleteAll(true)} variant="secondary" />
          )}
        </ThemedView>
      ) : null}

      {tasks === null ? (
        <LoadingState />
      ) : error ? (
        <EmptyState title="Something went wrong" message={error} actionLabel="Retry" onAction={load} />
      ) : tasks.length === 0 ? (
        <EmptyState title="No history yet" message="Tasks you complete will show up here." />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(task) => task.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
          ]}
          renderItem={({ item }) => {
            const subtitle =
              item.origin === 'requested'
                ? item.assignee_id === user?.id
                  ? `From ${item.creator?.display_name || 'Unnamed'}`
                  : `To ${item.assignee?.display_name || 'Unnamed'}`
                : undefined;
            const canDelete = item.creator_id === user?.id;
            return (
              <TaskRow
                task={item}
                subtitle={subtitle}
                showCheckbox={item.origin !== 'requested'}
                onToggleComplete={() => {}}
                onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
                trailingActions={
                  <ThemedView style={styles.trailingActions}>
                    <RowIconButton
                      glyph="↺"
                      color={theme.text}
                      onPress={() => handleUndo(item)}
                      accessibilityLabel={`Undo "${item.title}"`}
                    />
                    {canDelete ? (
                      <RowIconButton
                        glyph="🗑"
                        color={theme.danger}
                        onPress={() => handleDelete(item)}
                        accessibilityLabel={`Delete "${item.title}"`}
                      />
                    ) : null}
                  </ThemedView>
                }
              />
            );
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  deleteAllZone: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  deleteAllConfirm: {
    gap: Spacing.two,
  },
  deleteAllButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  deleteAllButton: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
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
  iconGlyph: {
    fontSize: 15,
  },
});
