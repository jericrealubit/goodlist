import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, WebTopNavInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listOpenTasks } from '@/lib/queries/tasks';
import { completeTask, reopenTask } from '@/lib/mutations/tasks';
import type { Task } from '@/lib/types';

export default function TasksScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listOpenTasks();
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your tasks.');
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

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + WebTopNavInset + Spacing.three }]}>
        <ThemedText type="title">Goodlist</ThemedText>
        <ThemedText themeColor="textSecondary">Solo mode · Personal</ThemedText>
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
        <FlatList
          data={tasks}
          keyExtractor={(task) => task.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + BottomTabInset + Spacing.six },
          ]}
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              onToggleComplete={() => handleToggle(item)}
              onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
            />
          )}
        />
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
        <Link href="/household" style={styles.hintLink}>
          <ThemedText type="link" themeColor="textSecondary">
            Add household later
          </ThemedText>
        </Link>
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
