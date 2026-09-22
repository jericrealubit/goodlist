import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionIcons, type IconName } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import type { DayKey } from '@/lib/calendar/day';
import { describeDaySummary, type DaySummary, type DayVerdict } from '@/lib/medications/day-summary';
import type { MonthCell, MonthGrid as MonthGridShape } from '@/lib/calendar/month';

/** What a day has on it, reduced to the two things a cell can show. */
export type DayState = {
  count: number;
  hasOverdue: boolean;
};

type MonthGridProps = {
  grid: MonthGridShape;
  stateByDay: Map<DayKey, DayState>;
  selectedKey: DayKey | null;
  todayKey: DayKey;
  onSelectDay: (key: DayKey) => void;
  /**
   * Appended to every day's spoken label. The screen uses it to say "tap to
   * move here" while a task is waiting for a day, so a screen reader hears what
   * the grid has become rather than only what it is.
   */
  labelSuffix?: string;
  /**
   * One medicine verdict per day, drawn as a corner mark. Absent days get none.
   * A glyph rather than a dot on purpose: on a past day a task dot means
   * overdue (bad) while a check means taken (good), so the two must never be
   * mistaken for each other.
   */
  medsByDay?: Map<DayKey, DaySummary>;
};

/** Shape carries the verdict, colour only reinforces it. */
const VERDICT_GLYPH: Record<DayVerdict, IconName> = {
  taken: ActionIcons.doseTaken,
  missed: ActionIcons.doseMissed,
  skipped: ActionIcons.doseSkipped,
};

const COLUMNS = 7;

/** Three is the cap: a fourth dot, or a "+2", crowds a 44dp cell. */
const MAX_DOTS = 3;

/**
 * The widest the grid is allowed to get. The screen permits MaxContentWidth
 * (800), and a square seventh of that would be a 640px-tall grid on the web.
 */
const MAX_GRID_WIDTH = 420;

function cellLabel(date: Date, state: DayState | undefined, meds: DaySummary | undefined, suffix?: string): string {
  const day = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const tasks =
    !state || state.count === 0
      ? 'nothing due'
      : `${state.count} ${state.count === 1 ? 'task' : 'tasks'}${state.hasOverdue ? ', overdue' : ''}`;
  return [day, tasks, meds ? describeDaySummary(meds) : null, suffix].filter(Boolean).join(', ');
}

/**
 * A month as six rows of seven.
 *
 * Every cell declares its height with `aspectRatio` rather than measuring one,
 * which is why this needs no `key={themeId}` remount: a token change repaints
 * and re-flows in the same pass. (The Sortable grid on the Tasks screen does
 * need that remount, because it measures a row once and caches the height. If
 * anything here ever starts caching a measured size, it inherits that
 * requirement.)
 *
 * State rides a mark, never the numeral's colour — the rule from stat-tile.tsx —
 * so a day stays legible in all nine themes.
 */
export function MonthGrid({
  grid,
  stateByDay,
  selectedKey,
  todayKey,
  onSelectDay,
  labelSuffix,
  medsByDay,
}: MonthGridProps) {
  const theme = useTheme();
  const tokens = useTokens();

  const rows: MonthCell[][] = [];
  for (let i = 0; i < grid.cells.length; i += COLUMNS) {
    rows.push(grid.cells.slice(i, i + COLUMNS));
  }

  const dotSize = Math.max(tokens.spacing.one, 4);
  const glyphSize = dotSize * 2.5;
  const verdictColor: Record<DayVerdict, string> = {
    taken: theme.primary,
    missed: theme.danger,
    skipped: theme.textSecondary,
  };

  return (
    <View style={[styles.grid, { gap: tokens.spacing.one }]}>
      <View
        style={[styles.row, { gap: tokens.spacing.one }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {grid.weekdayLabels.map((label, index) => (
          <ThemedText
            key={index}
            type="small"
            themeColor="textSecondary"
            style={styles.weekdayLabel}
            numberOfLines={1}>
            {label}
          </ThemedText>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, { gap: tokens.spacing.one }]}>
          {row.map((cell) => {
            const state = stateByDay.get(cell.key);
            const isToday = cell.key === todayKey;
            const isSelected = cell.key === selectedKey;
            const dots = Math.min(state?.count ?? 0, MAX_DOTS);
            const meds = medsByDay?.get(cell.key);

            return (
              <Pressable
                key={cell.key}
                onPress={() => onSelectDay(cell.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={cellLabel(cell.date, state, meds, labelSuffix)}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    borderRadius: tokens.radii.sm,
                    // The max is what gives a zero-border theme a visible ring
                    // while letting brutalist keep its 3px character.
                    borderWidth: isToday ? Math.max(tokens.cardBorderWidth, 2) : 0,
                    borderColor: theme.primary,
                    backgroundColor: isSelected ? theme.backgroundSelected : 'transparent',
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}>
                {meds ? (
                  <View
                    style={[styles.verdict, { top: tokens.spacing.half, right: tokens.spacing.half }]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants">
                    <Ionicons name={VERDICT_GLYPH[meds.verdict]} size={glyphSize} color={verdictColor[meds.verdict]} />
                  </View>
                ) : null}

                <ThemedText
                  type="small"
                  themeColor={cell.inMonth ? 'text' : 'textSecondary'}
                  style={styles.dayNumber}>
                  {cell.date.getDate()}
                </ThemedText>

                <View
                  style={[styles.dotRow, { gap: dotSize / 2, height: dotSize }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants">
                  {Array.from({ length: dots }, (_unused, index) => (
                    <View
                      key={index}
                      style={{
                        width: dotSize,
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        backgroundColor:
                          index === 0 && state?.hasOverdue ? theme.danger : theme.primary,
                      }}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    maxWidth: MAX_GRID_WIDTH,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    // Deliberately not flexWrap: it rounds inconsistently between React Native
    // and react-native-web at seven columns.
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
  },
  cell: {
    flex: 1,
    // Declared, never measured — see the note on the component.
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // In the corner, clear of the numeral and the task dots below it.
  verdict: {
    position: 'absolute',
  },
  dayNumber: {
    textAlign: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
