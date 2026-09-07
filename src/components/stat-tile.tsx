import { StyleSheet, View } from 'react-native';

import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * Compacts large counts so a tile's value never wraps: 1,284 / 12.9K / 4.2M.
 * Left exact below 10,000, where the precise number is still readable and
 * still interesting.
 */
export function formatCount(value: number): string {
  if (value < 10_000) return value.toLocaleString();
  const thousands = value / 1_000;
  // Roll over before the K form would round to "1000K".
  if (thousands < 999.95) return `${trimZero(thousands)}K`;
  return `${trimZero(value / 1_000_000)}M`;
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

type StatTileProps = {
  label: string;
  value: number;
  caption?: string;
  /**
   * Renders the value at display size. Exactly one hero figure per screen —
   * it's the number the view leads with.
   */
  hero?: boolean;
  /**
   * A small colored dot beside the label. Identity and status ride the mark,
   * never the text color, so the label stays legible in every theme.
   */
  dotColor?: string;
};

export function StatTile({ label, value, caption, hero, dotColor }: StatTileProps) {
  return (
    <Surface style={styles.tile}>
      <View style={styles.labelRow}>
        {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
      {/* Proportional (not tabular) figures: at display sizes equal-width
          digits make a number like 121 read loose. */}
      <ThemedText type={hero ? 'title' : 'subtitle'} accessibilityLabel={`${value.toLocaleString()} ${label}`}>
        {formatCount(value)}
      </ThemedText>
      {caption ? (
        <ThemedText type="small" themeColor="textSecondary">
          {caption}
        </ThemedText>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.half,
    justifyContent: 'flex-start',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
