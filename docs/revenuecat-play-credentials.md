# Connecting RevenueCat to Google Play — service account credentials

This is the runbook for the one red warning on the RevenueCat app page:

> ⚠️ Upload your service account credentials file and save in order to connect to Google.

Companion to [`play-store-deployment.md`](./play-store-deployment.md) (the release process) and
[`play-store-testing.md`](./play-store-testing.md) (the tester workflow). Written 2026-09-19 against
the current RevenueCat dashboard and Play Console; both UIs get renamed often, so match on meaning
rather than on the exact label if something has moved.

---

## 1. What the warning is actually asking for

RevenueCat talks to Google on your behalf, and Google only accepts a **service account** — a robot
Google identity that belongs to a Google Cloud project and is invited into your Play Console account
like a team member. Without it:

- **purchases cannot be validated.** `Purchases.purchasePackage()` in `src/lib/purchases.ts` returns a
  receipt that RevenueCat must verify against the Google Play Developer API. No credentials, no
  verification, no `premium` entitlement — so `revenuecat-sync` never writes `entitlements`, and the
  app's Premium checks stay false even after a real payment.
- **subscription state goes stale.** Renewals, cancellations, refunds, billing-grace and
  billing-retry all happen on Google's side, outside the app. RevenueCat learns about them through
  Google's real-time developer notifications (Cloud Pub/Sub), which also runs on this identity.

So it is one file, but it gates all of Android monetisation.

## 2. Two service accounts, not one

The repo already talks about a Play service account in
[`play-store-deployment.md` §B2](./play-store-deployment.md#b2-easjson-submitproduction-is-empty--fixed)
— that is a *different* one, for `eas submit`. Do not reuse it here. They need almost disjoint
permissions, and one leaked key should not be able to both publish releases and read revenue.

| | `eas submit` (uploads builds) | RevenueCat (validates purchases) |
|---|---|---|
| Key file | `credentials/play-service-account.json` | anywhere outside the repo — RevenueCat stores it, you do not |
| Play permissions | release to testing tracks, manage production releases | view app info, view financial data, manage orders and subscriptions |
| Google Cloud roles | none needed | Pub/Sub Editor, Monitoring Viewer |
| Used by | `eas.json` → `submit.*.android.serviceAccountKeyPath` | RevenueCat servers only |

A single account with the union of both permission sets does work, if you would rather manage one.
It is just a worse blast radius.

## 3. Link a Google Cloud project to Play Console

Play Console → **Setup → API access**. If no Cloud project is linked yet, link an existing one or let
the page create one. A Play developer account links exactly one Cloud project, and every service
account you use with Play must live in it, so do this before creating anything.

Note the project id — it shows up again in the Pub/Sub topic name in §7. **Start from this page
rather than typing a project id into a Cloud Console URL.** Project ids are globally unique across
all of Google Cloud, and short generic ones like `goodlist` were claimed years ago by strangers, so
`console.cloud.google.com/...?project=goodlist` lands on somebody else's project and answers with:

> You need additional access to the project: goodlist — `resourcemanager.projects.get` (Missing)

That is not a permission you are missing on your own project; Owner already includes it. It means
you are looking at a project that isn't yours, or you are signed into Cloud Console as a different
Google account than the one that owns the Play developer account. **Do not submit the "Request
access" form** it offers — that mails an administrator you have no relationship with. Close it,
click *Select a project* → *All*, and check what the signed-in account actually owns.

Your project's real id carries a numeric suffix — `goodlist-473921` — because the bare word was
taken. Accept the generated id; it is invisible to users, and it cannot be changed after creation.
If Cloud Console asks for a billing account when you enable Pub/Sub, attach one: developer
notifications for an app this size stay inside the free tier.

## 4. Enable the APIs

In [console.cloud.google.com](https://console.cloud.google.com) with that project selected, go to
**APIs & Services → Library** and enable all three:

- **Google Play Android Developer API** — purchase and subscription validation.
- **Google Play Developer Reporting API** — the metrics RevenueCat's charts read.
- **Cloud Pub/Sub API** — real-time developer notifications.

Enabling is idempotent; a project created by Play Console often has the first one on already.

## 5. Create the service account

**IAM & Admin → Service Accounts → Create service account**.

1. Name it something you will recognise in two years — `revenuecat-goodlist`.
2. On *Grant this service account access to project*, add two roles:
   - **Pub/Sub Editor** — lets RevenueCat create and subscribe to the notifications topic.
   - **Monitoring Viewer** — lets it watch that topic's queue depth and warn you when Google stops
     delivering.
3. Skip the "grant users access" step. Create.

Copy the account's email — `revenuecat-goodlist@<project-id>.iam.gserviceaccount.com`. You need it in
§6, and it is the only identifier Play Console will accept.

## 6. Invite it into Play Console

Play Console → **Users and permissions → Invite new user**, paste the service account email.

- **App permissions:** add Goodlist (`com.goodlist.app`) only. There is no reason to scope this to the
  whole account.
- **Account permissions:** tick
  - *View app information and download bulk reports (read-only)*
  - *View financial data, orders, and cancellation survey responses*
  - *Manage orders and subscriptions* — required for refunds and for granting/revoking entitlements
    from the RevenueCat dashboard. Omit it and everything still validates, but refunds issued in
    RevenueCat will fail.

**Invite user.** A service account has no inbox and nothing to accept — the permission is live
immediately.

## 7. Create the JSON key and upload it

Back in Google Cloud, open the service account → **Keys → Add key → Create new key → JSON**. The file
downloads once and Google keeps no copy; lose it and you create a new key rather than recover it.

Then, on the page in the screenshot — RevenueCat → **Apps → goodlist (Play Store)** → *Service Account
Credentials JSON* — drop the file in and press **Save**. The warning clears once RevenueCat has stored
and parsed it.

Treat the file exactly like a password:

- Never commit it. `.gitignore` already blocks `*service-account*.json` and `credentials/`, but the
  safest place is outside the repo entirely (`~/.secrets/`, `chmod 600`).
- Never paste it into an issue, a PR, or a chat. Anyone holding it can read your revenue and issue
  refunds against your account.
- To rotate: create a second key, upload it to RevenueCat, confirm the app page is still green, then
  delete the old key in Google Cloud. Keys are independent, so there is no downtime.

## 8. Google developer notifications

This is the second half of the warning — the *Google developer notifications* section on the same
page unlocks only after credentials are saved.

1. RevenueCat shows a Pub/Sub topic id, `projects/<project-id>/topics/<something>`. Copy it.
2. Play Console → **Monetize → Monetization setup → Real-time developer notifications**, paste it into
   **Topic name**, save.
3. Press **Send test notification**. A success there means Google can publish and RevenueCat is
   subscribed.

If Google rejects the topic with a permissions error, grant
`google-play-developer-notifications@system.gserviceaccount.com` the **Pub/Sub Publisher** role on
that topic (Cloud Console → Pub/Sub → the topic → Permissions), then test again.

This is not optional polish. Without it, RevenueCat only learns about a cancellation the next time it
polls — so `entitlements.premium_until` in Supabase can be hours stale, and a user who cancels keeps
Premium longer than they should.

## 9. Then wait — up to 36 hours

New service credentials take **up to 24–36 hours** to propagate before the Google Play Developer API
accepts them. Until then RevenueCat may show *Invalid Play Store credentials* or *credentials need
attention*, and test purchases fail with a validation error.

This is normal and is the single most common false alarm in this setup. Do not delete the account and
start over — that resets the clock. Re-check the next day.

## 10. Verify it worked

1. RevenueCat's app page shows no warning, and *Google developer notifications* reports connected.
2. Add your own Google account under Play Console → Setup → **License testing** so purchases are free
   and renew in minutes instead of months.
3. Install an **internal testing** build (not a local dev build — Play Billing only works for an app
   installed by Play, signed with the upload key) and buy the monthly plan.
4. RevenueCat → Customers → your Supabase user id: the transaction and an active `premium`
   entitlement appear.
5. Supabase: `select * from entitlements where user_id = '<id>'` — `premium_until` is set and
   `source` is `play`. That is `supabase/functions/revenuecat-sync` having done its job.

## 11. What this still does not connect

Credentials alone do not make a purchase possible. Also required, and tracked elsewhere:

- **Products in Play Console** (Monetize → Subscriptions) and an **Offering** in RevenueCat whose
  packages are `$rc_monthly` and `$rc_annual` — `periodFor()` in `src/lib/purchases.ts` ignores any
  other identifier, so a mismatched id shows the user an empty plan list.
- An entitlement named **`premium`**, matching `REVENUECAT_ENTITLEMENT_ID` in the edge function.
- **`EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`** (the Android *public* SDK key, `goog_…`) pushed to EAS —
  `purchasesAvailable()` is false without it and the app hides Premium entirely.
- The **webhook** → `https://<project-ref>.supabase.co/functions/v1/revenuecat-sync` with the
  Authorization header matching `REVENUECAT_WEBHOOK_AUTH`, per the README's Edge functions section.

## 12. Troubleshooting

| Symptom | Cause |
|---|---|
| *Invalid Play Store credentials* right after upload | Propagation. Wait 36 h (§9). |
| *You need additional access to the project* / missing `resourcemanager.projects.get` | You are on a project that isn't yours (a guessed project id) or signed in as the wrong Google account. Don't request access — §3. |
| Still invalid after 36 h | The service account was never invited in Play Console, or was invited on a different Play account than the one owning `com.goodlist.app`. |
| *Permission denied* validating purchases | Missing *View financial data* on the account permissions. |
| Refunds from the RevenueCat dashboard fail | Missing *Manage orders and subscriptions*. |
| Test notification fails in Play Console | `google-play-developer-notifications@system.gserviceaccount.com` lacks Pub/Sub Publisher on the topic (§8). |
| Purchases validate, but cancellations show up late | Notifications topic not configured — §8 was skipped. |
| `getOfferings()` returns nothing in the app | Not a credentials problem: products aren't active in Play, or the build isn't installed via a Play track. |

## 13. Sources

- [Google Play Service Credentials — RevenueCat](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials)
- [Google Play Checklists — RevenueCat](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials/google-play-checklists)
- [Google Real-Time Developer Notifications — RevenueCat](https://www.revenuecat.com/docs/platform-resources/server-notifications/google-server-notifications)
- [Real Time Developer Notifications (RTDN) — RevenueCat guides](https://www.revenuecat.com/guides/google-play-billing/real-time-developer-notifications-rtdn)
- [Google Play Billing Setup: Complete Developer Guide (2026) — RevenueCat Codelabs](https://revenuecat.github.io/codelabs/google-play.html)
- [Add developer account users and manage permissions — Play Console Help](https://support.google.com/googleplay/android-developer/answer/9844686)
- [Use the Google Play Developer API — Android Developers](https://developers.google.com/android-publisher/getting_started)
- [Real-time developer notifications — Android Developers](https://developer.android.com/google/play/billing/getting-ready#configure-rtdn)
