import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, WebTopNavInset } from '@/constants/theme';
import { listHistory } from '@/lib/queries/tasks';
import type { Task } from '@/lib/types';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTasks(await listHistory());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your history.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + WebTopNavInset + Spacing.three }]}>
        <ThemedText type="title">History</ThemedText>
        <ThemedText themeColor="textSecondary">Completed and cancelled tasks</ThemedText>
      </ThemedView>

      {tasks === null ? (
        <LoadingState />
      ) : error ? (
        <EmptyState title="Something went wrong" message={error} />
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
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              onToggleComplete={() => {}}
              onPress={() => router.push({ pathname: '/task/[id]', params: { id: item.id } })}
            />
          )}
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
  listContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
