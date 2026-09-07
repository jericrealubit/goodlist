import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ShareSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type ShareBreakdownProps = {
  segments: ShareSegment[];
  total: number;
};

const BAR_HEIGHT = 14;
const END_RADIUS = 4;
// White (well, surface) does the separating — never a border drawn around a
// segment, which would add ink that isn't data.
const SURFACE_GAP = 2;
// A bucket holding a handful of users out of thousands would otherwise round
// to a sub-pixel sliver. Being fractionally wide beats being invisible; the
// exact count is on the row beneath it either way.
const MIN_SEGMENT_WIDTH = 4;

function formatShare(value: number, total: number): string {
  if (total <= 0) return '—';
  const share = (value / total) * 100;
  if (share === 0) return '0%';
  return share < 1 ? '<1%' : `${Math.round(share)}%`;
}

/**
 * Part-to-whole across a small ordered set of buckets: one horizontal stacked
 * bar, then a labelled row per bucket.
 *
 * The rows are the legend and the table view at once — every value is readable
 * without decoding a color, which is what keeps the bar itself free to stay
 * thin and unlabelled.
 */
export function ShareBreakdown({ segments, total }: ShareBreakdownProps) {
  const theme = useTheme();
  const drawn = segments.filter((segment) => segment.value > 0);

  return (
    <View style={styles.container}>
      {drawn.length ? (
        // Decorative: the rows below announce every label and value, so
        // letting a screen reader walk the bar too would just say it twice.
        <View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {drawn.map((segment, index) => (
            <View
              key={segment.key}
              style={[
                styles.segment,
                {
                  flexGrow: segment.value,
                  backgroundColor: segment.color,
                  borderTopLeftRadius: index === 0 ? END_RADIUS : 0,
                  borderBottomLeftRadius: index === 0 ? END_RADIUS : 0,
                  borderTopRightRadius: index === drawn.length - 1 ? END_RADIUS : 0,
                  borderBottomRightRadius: index === drawn.length - 1 ? END_RADIUS : 0,
                },
              ]}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.bar, styles.emptyTrack, { backgroundColor: theme.backgroundSelected }]} />
      )}

      <View style={styles.rows}>
        {segments.map((segment) => (
          <View key={segment.key} style={styles.row}>
            <View style={styles.rowLabel}>
              <View style={[styles.dot, { backgroundColor: segment.color }]} />
              <ThemedText numberOfLines={1} style={styles.labelText}>
                {segment.label}
              </ThemedText>
            </View>
            {/* A column of numbers that has to line up vertically — the one
                place tabular figures belong. */}
            <View style={styles.rowValue}>
              <ThemedText type="smallBold" style={styles.number}>
                {segment.value.toLocaleString()}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={[styles.number, styles.share]}>
                {formatShare(segment.value, total)}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  bar: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    gap: SURFACE_GAP,
  },
  segment: {
    flexBasis: 0,
    minWidth: MIN_SEGMENT_WIDTH,
  },
  emptyTrack: {
    borderRadius: END_RADIUS,
  },
  rows: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  labelText: {
    flexShrink: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  number: {
    fontVariant: ['tabular-nums'],
  },
  share: {
    minWidth: 40,
    textAlign: 'right',
  },
});
