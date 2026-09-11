import { ErrorCode, Purchases, PurchasesError, type Package } from '@revenuecat/purchases-js';

import type { PremiumPlan, PurchaseOutcome } from '@/lib/types';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY;

const packagesById = new Map<string, Package>();

export function purchasesAvailable(): boolean {
  return !!API_KEY;
}

export async function identifyPurchaser(userId: string): Promise<void> {
  if (!API_KEY) return;
  if (!Purchases.isConfigured()) {
    Purchases.configure({ apiKey: API_KEY, appUserId: userId });
    return;
  }
  const purchases = Purchases.getSharedInstance();
  if (purchases.getAppUserId() !== userId) {
    await purchases.changeUser(userId);
  }
}

export async function getPremiumPlans(): Promise<PremiumPlan[]> {
  const offerings = await Purchases.getSharedInstance().getOfferings();
  const plans: PremiumPlan[] = [];
  packagesById.clear();
  for (const pkg of offerings.current?.availablePackages ?? []) {
    const period = periodFor(pkg.identifier);
    if (!period) continue;
    packagesById.set(pkg.identifier, pkg);
    plans.push({ id: pkg.identifier, period, priceLabel: pkg.webBillingProduct.currentPrice.formattedPrice });
  }
  return plans;
}

export async function purchasePlan(planId: string): Promise<PurchaseOutcome> {
  const pkg = packagesById.get(planId);
  if (!pkg) throw new Error('That plan is no longer available. Please try again.');
  try {
    await Purchases.getSharedInstance().purchase({ rcPackage: pkg });
    return 'purchased';
  } catch (err) {
    if (err instanceof PurchasesError && err.errorCode === ErrorCode.UserCancelledError) {
      return 'cancelled';
    }
    throw err;
  }
}

// Web Billing purchases are tied to the signed-in user id, so there is
// nothing to restore from a store — a server sync is all it takes.
export async function restorePurchases(): Promise<void> {}

export async function getManagementUrl(): Promise<string | null> {
  return (await Purchases.getSharedInstance().getCustomerInfo()).managementURL;
}

function periodFor(identifier: string): PremiumPlan['period'] | null {
  if (identifier === '$rc_monthly') return 'monthly';
  if (identifier === '$rc_annual') return 'yearly';
  return null;
}
