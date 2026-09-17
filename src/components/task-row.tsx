import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, type AccessibilityState, type StyleProp, type ViewStyle } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Sortable from 'react-native-sortables';

import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionIcons } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import type { Task } from '@/lib/types';
import { extractUrl, urlHost } from '@/lib/url';

function formatDueDate(dueAt: string) {
  return new Date(dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatCompletedAt(completedAt: string) {
  const date = new Date(completedAt);
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

type RowTouchableProps = {
  onPress: () => void;
  accessibilityRole: 'button' | 'checkbox' | 'link';
  accessibilityLabel: string;
  accessibilityState?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  draggable?: boolean;
};

/**
 * One tap target inside a row. In the draggable list the row already owns a
 * drag gesture, and only Sortable.Touchable composes with it — a short tap
 * still fires while a long-press-and-move still drags the row. Everywhere else
 * a plain Pressable keeps the platform's own press handling.
 */
function RowTouchable({ draggable, onPress, ...rest }: RowTouchableProps) {
  return draggable ? (
    <Sortable.Touchable onTap={onPress} hitSlop={8} {...rest} />
  ) : (
    <Pressable onPress={onPress} hitSlop={8} {...rest} />
  );
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
  // Non-gesture alternative to drag-to-reorder, for screen readers. Provided
  // only for draggable rows, and omitted at the first/last position so no
  // dead action is announced.
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export function TaskRow({
  task,
  onToggleComplete,
  onPress,
  subtitle,
  showCheckbox = true,
  trailingActions,
  draggable,
  onMoveUp,
  onMoveDown,
}: TaskRowProps) {
  const theme = useTheme();
  const tokens = useTokens();
  const isCompleted = task.status === 'completed';

  const moveActions = draggable
    ? [
        ...(onMoveUp ? [{ name: 'moveUp', label: 'Move up' }] : []),
        ...(onMoveDown ? [{ name: 'moveDown', label: 'Move down' }] : []),
      ]
    : [];

  function handleAccessibilityAction(event: { nativeEvent: { actionName: string } }) {
    if (event.nativeEvent.actionName === 'moveUp') onMoveUp?.();
    else if (event.nativeEvent.actionName === 'moveDown') onMoveDown?.();
  }

  const accessibilityMoveProps = moveActions.length
    ? { accessibilityActions: moveActions, onAccessibilityAction: handleAccessibilityAction }
    : {};

  const checkboxStyle = [
    styles.checkbox,
    {
      borderRadius: tokens.radii.pill,
      borderColor: isCompleted ? theme.accent : theme.textSecondary,
      backgroundColor: isCompleted ? theme.accent : 'transparent',
    },
  ];

  const checkbox = showCheckbox ? (
    <RowTouchable
      draggable={draggable}
      onPress={onToggleComplete}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isCompleted }}
      accessibilityLabel={`Mark "${task.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
      style={checkboxStyle}>
      {isCompleted && <Ionicons name={ActionIcons.confirm} size={16} color="#ffffff" />}
    </RowTouchable>
  ) : null;

  // A task that is a pasted link — or whose notes carry one — gets a button of
  // its own. Tapping the row opens the task for editing, which is the right
  // default for every other task, so following the link needs a target the row
  // press can't swallow.
  const linkUrl = extractUrl(task.title) ?? extractUrl(task.notes);

  function handleOpenLink() {
    if (!linkUrl) return;
    // An in-app browser on Android/iOS, a new tab on web. Linking is the
    // fallback for a device where that module has nothing to drive; a link
    // that won't open is never worth crashing the list over.
    WebBrowser.openBrowserAsync(linkUrl).catch(() => {
      Linking.openURL(linkUrl).catch(() => {});
    });
  }

  const openLinkButton = linkUrl ? (
    <RowTouchable
      draggable={draggable}
      onPress={handleOpenLink}
      accessibilityRole="link"
      accessibilityLabel={`Open ${urlHost(linkUrl)}`}
      style={[
        styles.linkButton,
        {
          borderRadius: tokens.radii.pill,
          borderColor: theme.border,
          backgroundColor: theme.background,
        },
      ]}>
      <Ionicons name={ActionIcons.openLink} size={16} color={theme.primary} />
    </RowTouchable>
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
      {isCompleted && task.completed_at ? (
        <ThemedText type="small" themeColor="textSecondary">
          Completed {formatCompletedAt(task.completed_at)}
        </ThemedText>
      ) : null}
      {subtitle ? (
        <ThemedText type="small" themeColor="textSecondary">
          {subtitle}
        </ThemedText>
      ) : null}
    </ThemedView>
  );

  const rowSpacing = { gap: tokens.spacing.three, padding: tokens.spacing.three };
  const contentSpacing = { gap: tokens.spacing.three };

  const rowContent = (
    <>
      {draggable ? (
        <Sortable.Touchable
          onTap={onPress}
          accessibilityRole="button"
          accessibilityLabel={task.title}
          style={[styles.pressableContent, contentSpacing]}>
          {checkbox}
          {textColumn}
        </Sortable.Touchable>
      ) : (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={task.title}
          style={({ pressed }) => [styles.pressableContent, contentSpacing, pressed && styles.pressed]}>
          {checkbox}
          {textColumn}
        </Pressable>
      )}

      {openLinkButton}
      {trailingActions}
    </>
  );

  // Swipeable exactly when the row is both completable by the viewer
  // (showCheckbox) and in the open/draggable list (draggable is false for
  // the completed section and for history.tsx) — the same eligibility the
  // checkbox already uses, so swipe is just a second way to trigger the
  // same onToggleComplete callback.
  const swipeToCompleteEnabled = draggable && showCheckbox;

  if (!swipeToCompleteEnabled) {
    return (
      <Surface style={[styles.row, rowSpacing]} {...accessibilityMoveProps}>
        {rowContent}
      </Surface>
    );
  }

  return (
    <Surface style={[styles.row, styles.clip]} {...accessibilityMoveProps}>
      <Swipeable
        containerStyle={styles.swipeable}
        onSwipeableOpen={onToggleComplete}
        renderLeftActions={() => (
          <ThemedView style={[styles.doneAction, { backgroundColor: theme.accent }]}>
            <Ionicons name={ActionIcons.complete} size={18} color="#ffffff" />
            <ThemedText style={styles.doneLabel}>Done</ThemedText>
          </ThemedView>
        )}>
        <ThemedView style={[styles.row, rowSpacing, { backgroundColor: theme.backgroundElement }]}>
          {rowContent}
        </ThemedView>
      </Swipeable>
    </Surface>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  clip: {
    overflow: 'hidden',
  },
  swipeable: {
    overflow: 'visible',
    width: '100%',
  },
  doneAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  doneLabel: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pressableContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
