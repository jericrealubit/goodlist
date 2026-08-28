import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, WebTopNavInset } from '@/constants/theme';
import { useHousehold } from '@/contexts/household-context';
import { useSession } from '@/contexts/session-context';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';
import { listOpenTasks } from '@/lib/queries/tasks';
import { completeTask, reopenTask } from '@/lib/mutations/tasks';
import type { Task } from '@/lib/types';

export default function TasksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { household } = useHousehold();
  const { user } = useSession();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listOpenTasks();
      setTasks(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load your tasks.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleToggle(task: Task) {
    setTasks((current) => current?.filter((t) => t.id !== task.id) ?? current);
    try {
      if (task.status === 'open') {
        await completeTask(task.id);
      } else {
        await reopenTask(task.id);
      }
    } catch {
      load();
    }
  }

  const personalTasks = tasks?.filter((t) => t.origin === 'personal') ?? [];
  const requestedTasks = tasks?.filter((t) => t.origin === 'requested') ?? [];

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + WebTopNavInset + Spacing.three }]}>
        <ThemedText type="title">Goodlist</ThemedText>
        <ThemedText themeColor="textSecondary">
          {household ? `${household.family.name} · Personal` : 'Solo mode · Personal'}
        </ThemedText>
      </ThemedView>

      {tasks === null ? (
        <LoadingState />
      ) : error ? (
        <EmptyState title="Something went wrong" message={error} />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="Nothing on your list yet"
          message="Tap + Add task to create your first Personal task."
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + BottomTabInset + Spacing.six },
          ]}>
          {personalTasks.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Personal
              </ThemedText>
              {personalTasks.map((item) => (
                <TaskRow
                  key={item.id}
                  task={item}
                  onToggleComplete={() => handleToggle(item)}
                  onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
                />
              ))}
            </ThemedView>
          )}

          {requestedTasks.length > 0 && (
            <ThemedView style={styles.section}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Requested
              </ThemedText>
              {requestedTasks.map((item) => {
                const isAssignee = item.assignee_id === user?.id;
                const subtitle = isAssignee
                  ? `From ${item.creator?.display_name || 'Unnamed'}`
                  : `To ${item.assignee?.display_name || 'Unnamed'}`;
                return (
                  <TaskRow
                    key={item.id}
                    task={item}
                    subtitle={subtitle}
                    showCheckbox={isAssignee}
                    onToggleComplete={() => handleToggle(item)}
                    onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
                  />
                );
              })}
            </ThemedView>
          )}
        </ScrollView>
      )}

      <ThemedView
        style={[styles.footer, { paddingBottom: insets.bottom + BottomTabInset + Spacing.two }]}>
        <Pressable
          onPress={() => router.push('/task/new')}
          style={({ pressed }) => [styles.addButton, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}>
          <ThemedText type="smallBold" style={styles.addButtonText}>
            + Add task
          </ThemedText>
        </Pressable>
        {household ? (
          <Pressable
            onPress={() => router.push('/task/request')}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 },
            ]}>
            <ThemedText type="smallBold">+ Request</ThemedText>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/household')} style={styles.hintLink}>
            <ThemedText type="link" themeColor="textSecondary">
              Add household later
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
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
  listContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  section: {
    gap: Spacing.two,
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
  addButton: {
    alignSelf: 'stretch',
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  addButtonText: {
    color: '#ffffff',
  },
  hintLink: {
    alignSelf: 'center',
  },
});
