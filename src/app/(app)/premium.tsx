import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { useSurfaceStyle } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionIcons } from '@/constants/icons';
import { PREMIUM_PRICES, TRIAL_DAYS } from '@/constants/premium';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { usePremiumStatus } from '@/hooks/use-premium-query';
import { useTheme } from '@/hooks/use-theme';

const FEATURES = [
  'Own a second group — say, one for family and one for a team.',
  'Keep every group you own fully editable: requests, renames and new members.',
  'Your group members never pay. Premium is per owner, not per person.',
];

export default function PremiumScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const cardStyle = useSurfaceStyle();
  const { status } = usePremiumStatus();

  const statusLine = status.isPaid
    ? 'You have Goodlist Premium.'
    : status.inTrial
      ? `Premium trial: ${status.trialDaysLeft} ${status.trialDaysLeft === 1 ? 'day' : 'days'} left.`
      : status.trialUsed
        ? 'Your free trial has ended. Your extra group is read-only until you subscribe.'
        : `Try it free for ${TRIAL_DAYS} days. No card needed. The trial starts when you create your second group.`;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.six }]}>
        <ThemedView style={styles.top}>
          <ThemedText type="title">Goodlist Premium</ThemedText>
          <ThemedText themeColor="textSecondary">{statusLine}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.featureList}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={[styles.bullet, { backgroundColor: theme.accent }]} />
              <ThemedText style={styles.featureText}>{feature}</ThemedText>
            </View>
          ))}
        </ThemedView>

        <View style={styles.priceRow}>
          <ThemedView style={[cardStyle, styles.priceCard]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Monthly
            </ThemedText>
            <ThemedText type="subtitle">{PREMIUM_PRICES.monthly}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              per month
            </ThemedText>
          </ThemedView>
          <ThemedView style={[cardStyle, styles.priceCard]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Yearly
            </ThemedText>
            <ThemedText type="subtitle">{PREMIUM_PRICES.yearly}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              per year · save 37%
            </ThemedText>
          </ThemedView>
        </View>

        {status.isPaid ? null : (
          <ThemedView style={styles.section}>
            <PrimaryButton title="Subscribe — coming soon" icon={ActionIcons.premium} onPress={() => {}} disabled />
            <ThemedText type="small" themeColor="textSecondary">
              Subscriptions are opening soon. Until then, your groups stay exactly as they are.
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
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
    gap: Spacing.five,
  },
  top: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  featureList: {
    gap: Spacing.three,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  featureText: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  priceCard: {
    flexGrow: 1,
    flexBasis: 140,
    padding: Spacing.four,
    gap: Spacing.one,
  },
});
