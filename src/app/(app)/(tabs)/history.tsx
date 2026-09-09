import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionIcons, type IconName } from '@/constants/icons';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useRealtimeTasks } from '@/hooks/use-realtime-tasks';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';
import { useTheme } from '@/hooks/use-theme';
import { useDeleteAllHistoryMutation, useDeleteTaskMutation, useReopenTaskMutation } from '@/hooks/use-task-mutations';
import { useHistoryQuery } from '@/hooks/use-tasks-query';
import { getErrorMessage } from '@/lib/errors';
import type { Task } from '@/lib/types';

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

export default function HistoryScreen() {
  const router = useRouter();
  const { topInset, bottomInset } = useTabScreenInsets();
  const theme = useTheme();
  const { user } = useSession();
  const { data, isLoading, isError, error: queryError, refetch } = useHistoryQuery();
  const tasks = data ?? [];
  const reopenMutation = useReopenTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const deleteAllMutation = useDeleteAllHistoryMutation();
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const error = isError && !data ? getErrorMessage(queryError, 'Could not load your history.') : null;

  useRealtimeTasks();

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function handleUndo(task: Task) {
    reopenMutation.mutate(task, { onError: () => setActionError('Could not undo this task.') });
  }

  function handleDelete(task: Task) {
    setConfirmingDeleteId(null);
    deleteMutation.mutate(task, { onError: () => setActionError('Could not delete this task.') });
  }

  function handleDeleteAll() {
    if (!user) return;
    setActionError(null);
    deleteAllMutation.mutate(
      { userId: user.id },
      { onError: () => setActionError('Could not delete your history.') },
    );
    setConfirmingDeleteAll(false);
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: topInset + Spacing.two }]}>
        <ThemedText type="header">Completed tasks</ThemedText>
      </ThemedView>

      {tasks && tasks.length > 0 ? (
        <ThemedView style={styles.deleteAllZone}>
          {actionError ? (
            <ThemedText type="small" themeColor="danger">
              {actionError}
            </ThemedText>
          ) : null}
          {confirmingDeleteAll ? (
            <ThemedView style={styles.deleteAllConfirm}>
              <ThemedText type="small" themeColor="danger">
                This permanently deletes everything in your history. Tasks someone else requested from you
                won&apos;t be removed — only what you can delete.
              </ThemedText>
              <ThemedView style={styles.deleteAllButtons}>
                <PrimaryButton
                  title="Yes, delete all"
                  icon={ActionIcons.delete}
                  onPress={handleDeleteAll}
                  variant="danger"
                  style={styles.deleteAllButton}
                />
                <PrimaryButton
                  title="Cancel"
                  icon={ActionIcons.cancel}
                  onPress={() => setConfirmingDeleteAll(false)}
                  variant="secondary"
                  style={styles.deleteAllButton}
                />
              </ThemedView>
            </ThemedView>
          ) : (
            <PrimaryButton
              title="Delete all"
              icon={ActionIcons.delete}
              onPress={() => setConfirmingDeleteAll(true)}
              variant="secondary"
            />
          )}
        </ThemedView>
      ) : null}

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <EmptyState title="Something went wrong" message={error} actionLabel="Retry" onAction={refetch} />
      ) : tasks.length === 0 ? (
        <EmptyState title="No history yet" message="Tasks you complete will show up here." />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(task) => task.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomInset + Spacing.four },
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
                      icon={ActionIcons.undo}
                      color={theme.text}
                      onPress={() => handleUndo(item)}
                      accessibilityLabel={`Undo "${item.title}"`}
                    />
                    {canDelete ? (
                      confirmingDeleteId === item.id ? (
                        <>
                          <RowIconButton
                            icon={ActionIcons.confirm}
                            color={theme.danger}
                            onPress={() => handleDelete(item)}
                            accessibilityLabel={`Confirm delete "${item.title}"`}
                          />
                          <RowIconButton
                            icon={ActionIcons.cancel}
                            color={theme.textSecondary}
                            onPress={() => setConfirmingDeleteId(null)}
                            accessibilityLabel={`Cancel delete "${item.title}"`}
                          />
                        </>
                      ) : (
                        <RowIconButton
                          icon={ActionIcons.delete}
                          color={theme.danger}
                          onPress={() => setConfirmingDeleteId(item.id)}
                          accessibilityLabel={`Delete "${item.title}"`}
                        />
                      )
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
    paddingBottom: Spacing.two,
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
});
