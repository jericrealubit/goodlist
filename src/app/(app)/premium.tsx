import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { useSurfaceStyle } from '@/components/surface';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionIcons } from '@/constants/icons';
import { PREMIUM_PRICES, TRIAL_DAYS } from '@/constants/premium';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { usePremiumStatus } from '@/hooks/use-premium-query';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';
import { syncPremium } from '@/lib/mutations/premium';
import {
  getManagementUrl,
  getPremiumPlans,
  identifyPurchaser,
  purchasePlan,
  purchasesAvailable,
  restorePurchases,
} from '@/lib/purchases';
import { groupKeys, premiumKeys } from '@/lib/query-client';
import type { PremiumPlan } from '@/lib/types';

const FEATURES = [
  'Own a second group — say, one for family and one for a team.',
  'Keep every group you own fully editable: requests, renames and new members.',
  'Your group members never pay. Premium is per owner, not per person.',
];

const FALLBACK_PLANS: PremiumPlan[] = [
  { id: 'monthly', period: 'monthly', priceLabel: PREMIUM_PRICES.monthly },
  { id: 'yearly', period: 'yearly', priceLabel: PREMIUM_PRICES.yearly },
];

export default function PremiumScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const cardStyle = useSurfaceStyle();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const { user } = useSession();
  const { status } = usePremiumStatus();
  const canPurchase = purchasesAvailable();

  const plansQuery = useQuery({
    queryKey: premiumKeys.plans,
    enabled: canPurchase && !!user,
    // Identify first: the layout's identify effect can run after this screen's
    // first query, and RevenueCat must know the user before listing offerings.
    queryFn: async () => {
      await identifyPurchaser(user!.id);
      return getPremiumPlans();
    },
    gcTime: 0,
  });
  const livePlans = plansQuery.data?.length ? plansQuery.data : null;
  const plans = livePlans ?? FALLBACK_PLANS;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = plans.find((p) => p.id === selectedId) ?? plans.find((p) => p.period === 'yearly') ?? plans[0];
  const [busy, setBusy] = useState<'purchase' | 'restore' | 'manage' | null>(null);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function refreshEntitlement() {
    try {
      await syncPremium();
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: premiumKeys.mine }),
        queryClient.invalidateQueries({ queryKey: groupKeys.mine }),
      ]);
    }
  }

  async function handleSubscribe() {
    if (!livePlans || !selected) return;
    setMessage(null);
    setBusy('purchase');
    try {
      const outcome = await purchasePlan(selected.id);
      if (outcome === 'cancelled') return;
      try {
        await refreshEntitlement();
        setMessage({ text: 'Thanks for subscribing! Premium is active.', isError: false });
      } catch {
        setMessage({ text: 'Purchase complete. Premium may take a minute to show up.', isError: false });
      }
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'Could not complete the purchase.'), isError: true });
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    setMessage(null);
    setBusy('restore');
    try {
      await restorePurchases();
      await refreshEntitlement();
      setMessage({ text: 'Purchases restored.', isError: false });
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'Could not restore purchases.'), isError: true });
    } finally {
      setBusy(null);
    }
  }

  async function handleManage() {
    setMessage(null);
    setBusy('manage');
    try {
      const url = await getManagementUrl();
      if (!url) throw new Error('No subscription to manage on this device.');
      await Linking.openURL(url);
    } catch (err) {
      setMessage({ text: getErrorMessage(err, 'Could not open subscription settings.'), isError: true });
    } finally {
      setBusy(null);
    }
  }

  const statusLine = status.isPaid
    ? 'You have Goodlist Premium. Thank you!'
    : status.inTrial
      ? `Premium trial: ${status.trialDaysLeft} ${status.trialDaysLeft === 1 ? 'day' : 'days'} left. Subscribe any time to keep it after that.`
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

        {status.isPaid ? (
          <PrimaryButton
            title="Manage subscription"
            icon={ActionIcons.premium}
            variant="secondary"
            onPress={handleManage}
            loading={busy === 'manage'}
            disabled={!canPurchase || !isOnline}
          />
        ) : (
          <>
            <View style={styles.priceRow}>
              {plans.map((plan) => {
                const isSelected = plan.id === selected?.id;
                return (
                  <Pressable
                    key={plan.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelectedId(plan.id)}
                    style={styles.pricePressable}>
                    <ThemedView
                      style={[
                        cardStyle,
                        styles.priceCard,
                        isSelected ? { borderColor: theme.accent, borderWidth: 2 } : null,
                      ]}>
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        {plan.period === 'monthly' ? 'Monthly' : 'Yearly'}
                      </ThemedText>
                      <ThemedText type="subtitle">{plan.priceLabel}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {plan.period === 'monthly' ? 'per month' : 'per year · best value'}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                );
              })}
            </View>

            <ThemedView style={styles.section}>
              <PrimaryButton
                title={canPurchase ? 'Subscribe' : 'Subscribe — coming soon'}
                icon={ActionIcons.premium}
                onPress={handleSubscribe}
                loading={busy === 'purchase'}
                disabled={!livePlans || !isOnline || busy !== null}
              />
              {Platform.OS !== 'web' && canPurchase ? (
                <PrimaryButton
                  title="Restore purchases"
                  icon={ActionIcons.reopen}
                  variant="secondary"
                  onPress={handleRestore}
                  loading={busy === 'restore'}
                  disabled={!isOnline || busy !== null}
                />
              ) : null}
              {canPurchase && plansQuery.isError ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Couldn&apos;t load plans right now. Check your connection and try again.
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                Renews automatically until you cancel. Cancel any time
                {Platform.OS === 'android' ? ' in Google Play' : ''}.
              </ThemedText>
            </ThemedView>
          </>
        )}

        {message ? (
          <ThemedText type="small" themeColor={message.isError ? 'danger' : 'textSecondary'}>
            {message.text}
          </ThemedText>
        ) : null}
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
  pricePressable: {
    flexGrow: 1,
    flexBasis: 140,
  },
  priceCard: {
    padding: Spacing.four,
    gap: Spacing.one,
  },
});
