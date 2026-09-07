import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { Surface } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useDistributionQuery, useIsAdminQuery } from '@/hooks/use-distribution-query';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { buildDistribution, type CountryNode } from '@/lib/geo/distribution';

export default function DistributionScreen() {
  const theme = useTheme();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdminQuery();
  const { data: rows, isLoading, error } = useDistributionQuery(isAdmin === true);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (adminLoading || (isAdmin === true && isLoading)) return <LoadingState />;

  // The RPC is the real gate — this screen is reachable by a direct link even
  // when the Settings entry is hidden, so it must degrade rather than crash.
  if (isAdmin !== true || error) {
    return (
      <EmptyState
        title="Not available"
        message="This report is only available to Goodlist administrators."
      />
    );
  }

  const distribution = buildDistribution(rows ?? []);

  if (distribution.totalUsers === 0) {
    return <EmptyState title="No data yet" message="No accounts have been created yet." />;
  }

  const { totalUsers, sharedUsers, notSharedUsers, coverage, countries } = distribution;
  const maxCount = countries[0]?.userCount ?? 1;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.summaryRow}>
          <Stat label="Users" value={String(totalUsers)} />
          <Stat label="Countries" value={String(countries.length)} />
          <Stat label="Located" value={`${Math.round(coverage * 100)}%`} />
        </ThemedView>

        {countries.length === 0 ? (
          <ThemedText themeColor="textSecondary">
            No one has shared a region yet.
          </ThemedText>
        ) : null}

        {countries.map((country) => (
          <CountryCard
            key={country.code}
            country={country}
            maxCount={maxCount}
            expanded={expanded === country.code}
            onToggle={() => setExpanded(expanded === country.code ? null : country.code)}
          />
        ))}

        {notSharedUsers > 0 ? (
          <Surface style={styles.card}>
            <ThemedText type="smallBold">Not shared</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {notSharedUsers} {notSharedUsers === 1 ? 'account has' : 'accounts have'} turned
              sharing off or not reported yet. Counted, never located.
            </ThemedText>
          </Surface>
        ) : null}

        <ThemedView style={[styles.methodology, { borderTopColor: theme.border }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            How to read this
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            <ThemedText type="smallBold" themeColor="textSecondary">
              Country is exact
            </ThemedText>
            {' — it comes from the Region setting on the device, not from GPS or an IP lookup.'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            <ThemedText type="smallBold" themeColor="textSecondary">
              State and city are approximate.
            </ThemedText>
            {' They are inferred from the device time zone, which is the only sub-national signal available without asking for location permission. A zone like America/Los_Angeles spans several states, so a state is shown only where the zone narrows it down, and a city only where the zone is itself a single city. Everything else falls back to the raw time zone, which is factual.'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {`Located covers ${sharedUsers} of ${totalUsers} accounts.`}
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Surface style={styles.stat}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Surface>
  );
}

type CountryCardProps = {
  country: CountryNode;
  maxCount: number;
  expanded: boolean;
  onToggle: () => void;
};

function CountryCard({ country, maxCount, expanded, onToggle }: CountryCardProps) {
  const theme = useTheme();
  const tokens = useTokens();
  // Bars are proportional to the largest country, not to the total, so smaller
  // entries stay readable instead of collapsing to a sliver.
  const widthPercent = Math.max(2, (country.userCount / maxCount) * 100);

  return (
    <Surface style={styles.card}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${country.name}, ${country.userCount} users`}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <ThemedView style={styles.cardHeader}>
          <ThemedText type="smallBold" style={styles.flexText} numberOfLines={1}>
            {country.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {country.userCount}
          </ThemedText>
        </ThemedView>
        <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected, borderRadius: tokens.radii.pill }]}>
          <View
            style={[
              styles.barFill,
              { width: `${widthPercent}%`, backgroundColor: theme.primary, borderRadius: tokens.radii.pill },
            ]}
          />
        </View>
      </Pressable>

      {expanded ? (
        <ThemedView style={styles.breakdown}>
          {country.regions.map((region) => (
            <ThemedView key={region.label} style={styles.region}>
              <ThemedView style={styles.cardHeader}>
                <ThemedText type="small" style={styles.flexText}>
                  {region.label}
                  {region.approximate ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {'  approx.'}
                    </ThemedText>
                  ) : null}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {region.userCount}
                </ThemedText>
              </ThemedView>

              {region.cities.map((city) => (
                <ThemedView key={city.label} style={styles.cityRow}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.flexText} numberOfLines={1}>
                    {city.label}
                    {city.kind === 'timezone' ? '  (time zone)' : null}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {city.userCount}
                  </ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          ))}
        </ThemedView>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  flexText: {
    flexShrink: 1,
  },
  barTrack: {
    height: 6,
    marginTop: Spacing.one,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  breakdown: {
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  region: {
    gap: Spacing.one,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
  },
  methodology: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
