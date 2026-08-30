import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Sortable from 'react-native-sortables';

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
  trailingActions?: ReactNode;
  // When true, renders inside a react-native-sortables item: the tap targets
  // below use Sortable.Touchable (which composes correctly with the item's
  // own drag gesture) instead of a plain Pressable, so a short tap still
  // opens/toggles while a long-press-and-move still drags the row.
  draggable?: boolean;
};

export function TaskRow({
  task,
  onToggleComplete,
  onPress,
  subtitle,
  showCheckbox = true,
  trailingActions,
  draggable,
}: TaskRowProps) {
  const theme = useTheme();
  const isCompleted = task.status === 'completed';

  const checkbox = showCheckbox ? (
    draggable ? (
      <Sortable.Touchable
        onTap={onToggleComplete}
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
      </Sortable.Touchable>
    ) : (
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
    )
  ) : null;

  const textColumn = (
    <ThemedView style={styles.textColumn}>
      <ThemedText type="default" style={isCompleted ? styles.strikethrough : undefined} numberOfLines={1}>
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
  );

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      {draggable ? (
        <Sortable.Touchable
          onTap={onPress}
          accessibilityRole="button"
          accessibilityLabel={task.title}
          style={styles.pressableContent}>
          {checkbox}
          {textColumn}
        </Sortable.Touchable>
      ) : (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={task.title}
          style={({ pressed }) => [styles.pressableContent, pressed && styles.pressed]}>
          {checkbox}
          {textColumn}
        </Pressable>
      )}

      {trailingActions}
    </ThemedView>
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
  pressableContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
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
