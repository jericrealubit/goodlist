import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import type { PremiumPlan, PurchaseOutcome } from '@/lib/types';

// Web counterpart: purchases.web.ts (RevenueCat Web Billing / Stripe). Both
// files export the same functions so screens never branch on platform.

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

const packagesById = new Map<string, PurchasesPackage>();

export function purchasesAvailable(): boolean {
  return !!API_KEY;
}

export async function identifyPurchaser(userId: string): Promise<void> {
  if (!API_KEY) return;
  if (!(await Purchases.isConfigured())) {
    Purchases.configure({ apiKey: API_KEY, appUserID: userId });
    return;
  }
  if ((await Purchases.getAppUserID()) !== userId) {
    await Purchases.logIn(userId);
  }
}

export async function getPremiumPlans(): Promise<PremiumPlan[]> {
  const offerings = await Purchases.getOfferings();
  const plans: PremiumPlan[] = [];
  packagesById.clear();
  for (const pkg of offerings.current?.availablePackages ?? []) {
    const period = periodFor(pkg.identifier);
    if (!period) continue;
    packagesById.set(pkg.identifier, pkg);
    plans.push({ id: pkg.identifier, period, priceLabel: pkg.product.priceString });
  }
  return plans;
}

export async function purchasePlan(planId: string): Promise<PurchaseOutcome> {
  const pkg = packagesById.get(planId);
  if (!pkg) throw new Error('That plan is no longer available. Please try again.');
  try {
    await Purchases.purchasePackage(pkg);
    return 'purchased';
  } catch (err) {
    if (err && typeof err === 'object' && 'userCancelled' in err && err.userCancelled) {
      return 'cancelled';
    }
    throw err;
  }
}

export async function restorePurchases(): Promise<void> {
  await Purchases.restorePurchases();
}

export async function getManagementUrl(): Promise<string | null> {
  return (await Purchases.getCustomerInfo()).managementURL;
}

function periodFor(identifier: string): PremiumPlan['period'] | null {
  if (identifier === '$rc_monthly') return 'monthly';
  if (identifier === '$rc_annual') return 'yearly';
  return null;
}
