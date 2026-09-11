// Copies a user's RevenueCat "premium" entitlement into public.entitlements
// (premium_until + source), which is what the database's Premium checks read.
//
// Two callers, told apart by the Authorization header:
//   - RevenueCat webhook: header equals REVENUECAT_WEBHOOK_AUTH. Syncs every
//     Supabase user id named in the event.
//   - The app, right after a purchase/restore: a Supabase user JWT. Syncs
//     only that user.
// Either way the state is re-read from RevenueCat's API rather than trusted
// from the event body, so out-of-order or replayed webhooks are harmless.
//
// Deploy with --no-verify-jwt: webhooks carry no Supabase JWT, so this
// function checks auth itself.

import { createClient } from 'npm:@supabase/supabase-js@2';

const RC_SECRET_KEY = Deno.env.get('REVENUECAT_SECRET_KEY') ?? '';
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';
const ENTITLEMENT_ID = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') ?? 'premium';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function sourceFor(store: string | undefined): 'play' | 'stripe' | null {
  if (store === 'play_store') return 'play';
  if (store === 'stripe' || store === 'rc_billing') return 'stripe';
  return null;
}

async function syncUser(userId: string): Promise<string | null> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${RC_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`RevenueCat responded ${res.status}`);
  const { subscriber } = await res.json();

  const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID];
  let premiumUntil: string | null = null;
  let source: 'play' | 'stripe' | null = null;
  if (entitlement) {
    // A null expiry is a lifetime (non-expiring) grant.
    premiumUntil = entitlement.expires_date ?? 'infinity';
    const grace = entitlement.grace_period_expires_date;
    if (grace && premiumUntil !== 'infinity' && Date.parse(grace) > Date.parse(premiumUntil)) {
      premiumUntil = grace;
    }
    source = sourceFor(subscriber?.subscriptions?.[entitlement.product_identifier]?.store);
  }

  // Leaves trial_started_at / trial_ends_at untouched.
  const { error } = await admin
    .from('entitlements')
    .upsert({ user_id: userId, premium_until: premiumUntil, ...(source ? { source } : {}) }, { onConflict: 'user_id' });
  if (error) throw error;
  return premiumUntil;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!RC_SECRET_KEY) return json({ error: 'REVENUECAT_SECRET_KEY is not set' }, 500);

  const auth = req.headers.get('Authorization') ?? '';

  if (WEBHOOK_AUTH && safeEqual(auth, WEBHOOK_AUTH)) {
    const body = await req.json().catch(() => null);
    const event = body?.event ?? {};
    const ids = new Set<string>(
      [
        event.app_user_id,
        event.original_app_user_id,
        ...(event.aliases ?? []),
        ...(event.transferred_from ?? []),
        ...(event.transferred_to ?? []),
      ].filter((id): id is string => typeof id === 'string' && UUID.test(id)),
    );
    let failed = 0;
    for (const id of ids) {
      try {
        await syncUser(id);
      } catch (err) {
        // 23503 = no such auth user (e.g. RevenueCat's "send test event").
        // Retrying can't fix that, so don't count it as a failure.
        if ((err as { code?: string })?.code === '23503') continue;
        failed++;
        console.error(`sync failed for ${id}`, err);
      }
    }
    // A non-2xx makes RevenueCat retry the webhook later.
    return json({ synced: ids.size - failed, failed }, failed ? 500 : 200);
  }

  const token = auth.replace(/^Bearer\s+/i, '');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Unauthorized' }, 401);

  try {
    return json({ premium_until: await syncUser(data.user.id) });
  } catch (err) {
    console.error(err);
    return json({ error: 'Sync failed' }, 500);
  }
});
