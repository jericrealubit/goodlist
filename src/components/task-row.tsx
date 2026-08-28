import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Task } from '@/lib/types';

function formatDueDate(dueAt: string) {
  return new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type TaskRowProps = {
  task: Task;
  onToggleComplete: () => void;
  onPress: () => void;
  subtitle?: string;
  showCheckbox?: boolean;
};

export function TaskRow({ task, onToggleComplete, onPress, subtitle, showCheckbox = true }: TaskRowProps) {
  const theme = useTheme();
  const isCompleted = task.status === 'completed';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={task.title}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        {showCheckbox ? (
          <Pressable
            onPress={onToggleComplete}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isCompleted }}
            accessibilityLabel={`Mark "${task.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
            style={[
              styles.checkbox,
              {
                borderColor: isCompleted ? theme.accent : theme.border,
                backgroundColor: isCompleted ? theme.accent : 'transparent',
              },
            ]}>
            {isCompleted && <ThemedText style={styles.checkmark}>✓</ThemedText>}
          </Pressable>
        ) : null}

        <ThemedView style={styles.textColumn}>
          <ThemedText
            type="default"
            style={isCompleted ? styles.strikethrough : undefined}
            numberOfLines={1}>
            {task.title}
          </ThemedText>
          {task.notes ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {task.notes}
            </ThemedText>
          ) : null}
          {task.due_at ? (
            <ThemedText type="small" themeColor="textSecondary">
              Due {formatDueDate(task.due_at)}
            </ThemedText>
          ) : null}
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  textColumn: {
    flex: 1,
    gap: 2,
    backgroundColor: 'transparent',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
});
