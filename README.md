# Goodlist

A cross-platform task app for your own to-dos and for sharing tasks with a small group — family or
team. Built with [Expo](https://expo.dev) + [Expo Router](https://docs.expo.dev/router/introduction)
and a realtime [Supabase](https://supabase.com) backend. It runs on Android and on the web at
<https://goodlist.expo.app>.

<p align="center">
  <img src="docs/screenshots/05-my-list.png" width="195" alt="The Tasks screen in Solo mode, showing four task cards">
  <img src="docs/screenshots/16-their-inbox.png" width="195" alt="The Requested tab showing two tasks a group member asked for, with an unread badge on Tasks">
  <img src="docs/screenshots/11-invite-code.png" width="195" alt="A group card showing the group name, invite code and member list">
  <img src="docs/screenshots/17-settings.png" width="195" alt="Settings, showing the display name field and the theme picker">
</p>
<p align="center">
  <sub>Your own list · What your group asked of you · Invite code · Nine themes</sub>
</p>

## Using the app

New to Goodlist, or handing it to someone who is? There's a plain-language, picture-by-picture
walkthrough — making an account, adding your first task, and going from solo to a shared family or
team group. No technical knowledge assumed. It's in three places, all rendered from the same
`src/content/guide.ts`, so they can't drift apart:

- **In the app** — Settings → Help → *How to use Goodlist*. Screenshots are bundled, so it works
  with no connection: someone who is stuck and offline is exactly who needs it.
- **On the web** — <https://jericrealubit.github.io/goodlist/guide/>, for sending to someone who
  doesn't use GitHub.
- **On GitHub** — [docs/user-guide](docs/user-guide/) renders the same walkthrough as Markdown.

## Features

- **Personal tasks** — a to-do list that's yours alone: add, edit, complete, reopen, delete, add notes
  and due dates, and drag to reorder.
- **Groups** — create or join up to two groups per account, in Family mode (roles: father, mother,
  guardian, child, other) or Team mode (roles: leader, member). Join with an invite code; the owner can
  rename the group, remove members, or transfer ownership.
- **Premium** — owning one group is free; owning a second one needs Premium ($1.99/month or
  $14.99/year). Creating that second group starts a 90-day free trial with no card needed. When the
  trial or subscription lapses, the owner's oldest group stays fully usable and any other group they
  own goes read-only (visible, not editable) until they subscribe again. These rules are enforced in
  the database (`supabase/schema.sql`, "Premium" section), not just in the UI. Purchases run through
  [RevenueCat](https://www.revenuecat.com): Google Play Billing on Android, RevenueCat Web Billing
  (Stripe) on the web.
- **Web version** — the same app, exported as a single-page web app and hosted on EAS Hosting at
  <https://goodlist.expo.app>. Same account, same data.
- **Requested tasks** — ask a group member to do something and track it until it's done. The requester
  can cancel an open request; the assignee can mark it complete or reopen it. Either side can jump
  straight from the task to its group.
- **History** — every completed or cancelled task, timestamped with when it was finished, with one-tap
  undo and delete (individually or all at once).
- **Notifications** — an in-app unread badge that updates live (via Supabase Realtime) whenever someone
  requests a task from you.
- **Realtime sync** — task and notification changes made by any group member appear immediately on
  everyone else's device.
- **Offline-first** — the app works without a connection: reads come from a persisted local cache
  (`@tanstack/react-query` + AsyncStorage), and queued writes replay automatically once you're back
  online. An offline banner shows connection and sync status.
- **Appearance** — nine built-in color themes, each with light/dark variants.
- **Community stats** — an anonymous, aggregate view of how many accounts exist, how many are active
  right now, and how many people use Goodlist solo vs. in a group. An admin-only screen additionally
  breaks this down by country/region, derived from device time zone (never GPS or IP).
- **Account & privacy controls** — edit your display name, toggle whether your country/time zone is
  counted in community stats, and permanently delete your account (blocked while you still own a group
  with other members in it, to protect them).
- **Built-in guide** — an illustrated, 15-step walkthrough under Settings → Help, bundled with the
  app so it works offline. Its copy lives once in `src/content/guide.ts` and also renders as a
  public web page (`npm run guide:site`).
- **Legal** — in-app About, Privacy Policy, and Terms of Service screens (`src/app/(app)/about.tsx`,
  `privacy.tsx`, `terms.tsx`). The policy text lives once in `src/content/legal.ts`; the in-app
  screens and the public pages Google Play links to (`npm run legal:site` → `docs/legal/`) both
  render from it, so they can't drift apart.

## Tech stack

React Native · Expo · Expo Router · TypeScript · Supabase (Postgres, Auth, Realtime, RLS, Edge
Functions) · TanStack Query (with an AsyncStorage persister for offline/local-first caching) ·
Reanimated · `react-native-sortables` (drag-to-reorder) · `react-native-gesture-handler` (swipe
actions) · RevenueCat (`react-native-purchases` on Android, `@revenuecat/purchases-js` on the web) ·
EAS Build and EAS Hosting.

## Project structure

```
src/
  app/            Expo Router screens (file-based routing)
    (auth)/        Sign in, sign up, forgot/reset password
    (app)/
      (tabs)/       Tasks, Group, History, Settings
      group/        Create / join a group
      task/[id]     Task detail / edit
      about, guide, premium, privacy, terms, stats, distribution
  components/     Shared UI (TaskRow, ComposeBar, GroupCard, legal-document,
                  guide-document, ...)
  hooks/          Data-fetching and mutation hooks (React Query)
  lib/            Supabase client, queries, mutations, types, validation;
                  purchases.ts / purchases.web.ts — RevenueCat on Android / web,
                  same exports, picked by Metro's platform extensions
  constants/      Theme definitions, group role/mode options, Premium prices
  content/        legal.ts, guide.ts — copy shared by the in-app screens and the
                  published web pages, as plain data with no React imports
assets/
  images/guide/   Guide screenshots bundled into the app (npm run guide:screens)
docs/
  index.html      The published site, built by `npm run site` and served by GitHub
  guide/          Pages from main /docs at https://jericrealubit.github.io/goodlist/
  legal/
  user-guide/     The same walkthrough as Markdown, for reading on GitHub
  screenshots/    Callout-free product shots used by this README
scripts/
  lib/            site-shell.mjs (shared site chrome), distribution-report.mjs
supabase/
  schema.sql      Full database schema, RLS policies, and RPC functions —
                  hand-applied via the Supabase SQL editor (no migrations in this repo)
  functions/
    revenuecat-sync/  Edge function: copies RevenueCat subscription status into
                      `entitlements` (from webhooks, and from the app after a purchase)
```

## Get started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` with your Supabase project's public keys:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

   # Optional. RevenueCat *public* SDK keys. Without them the app runs normally and the
   # Premium screen's Subscribe button just says "coming soon".
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
   EXPO_PUBLIC_REVENUECAT_WEB_KEY=rcb_...
   ```

   Then set up the database by running `supabase/schema.sql` once in that project's SQL editor.
   EAS builds don't read `.env.local`: the same variables live in the EAS `production` environment
   (`eas env:list`).

3. Start the app:

   ```bash
   npm start
   ```

   From there, open it on an Android emulator/device (`npm run android`), iOS simulator/device
   (`npm run ios`), the web (`npm run web`), or scan the QR code with
   [Expo Go](https://expo.dev/go).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm start` | Start the Metro/Expo dev server |
| `npm run android` / `ios` / `web` | Start the dev server targeting a specific platform |
| `npm run build:web` | Export the web version into `dist/` |
| `npm run deploy:web` | Export the web version and publish it to production on EAS Hosting (<https://goodlist.expo.app>) |
| `npm run lint` | Run `expo lint` |
| `npm run reset-project` | Move the starter code aside and scaffold a blank `app/` directory |
| `npm run report:distribution` | Generate a user-distribution report from Supabase data (admin tooling) |
| `npm run guide:screens` | Re-render the guide screenshots — `docs/user-guide/images/`, the copies bundled into the app, and this README's product shots |
| `npm run site` | Build the whole published site into `docs/` (index + legal + guide) |
| `npm run index:site` / `legal:site` / `guide:site` | Build one section of that site on its own |

## Deployment

Builds are produced with [EAS Build](https://docs.expo.dev/build/introduction/) (`eas.json` defines
`development`, `preview`, and `production` profiles). For example:

```bash
npx eas-cli@24.1.2 build --platform android --profile preview
```

(The CLI version is pinned because an unpinned `npx eas-cli` once resolved to a release that
wasn't published yet and failed to install.)

`preview` produces a directly installable APK; `production` produces a Play Store-ready `.aab` with an
auto-incrementing version code. There is no OTA/EAS Update channel configured yet — JS changes require a
new build to reach devices outside of Expo Go.

For Google Play specifically, three docs split the work:

| Doc | Holds |
| --- | --- |
| [docs/play-store-deployment.md](docs/play-store-deployment.md) | The step-by-step runbook — the account and closed-testing gates that set the timeline, the repo changes needed before the first build, and the order to do everything in |
| [docs/play-store-testing.md](docs/play-store-testing.md) | The internal- and closed-testing tracks in detail — which track counts toward the 12-testers/14-days rule, the tester opt-in mechanics, shipping updates to each track, and troubleshooting |
| [docs/play-store-listing.md](docs/play-store-listing.md) | The listing copy and the Data Safety answers |

### The web version

`app.json` sets `web.output: "single"`, so `npm run build:web` produces a single-page app in
`dist/`. `npm run deploy:web` publishes it to [EAS Hosting](https://docs.expo.dev/eas/hosting/get-started/)
at <https://goodlist.expo.app>, which serves `index.html` for every route, so direct links like
`/premium` work. Plain `eas deploy` (no `--prod`) gives a one-off preview URL to check first.

Password reset on the web sends users back to `https://goodlist.expo.app/reset-password`, so that
address must stay listed under Supabase → Auth → Redirect URLs.

### Premium & RevenueCat

Subscription state flows one way: **Google Play / Stripe → RevenueCat → `revenuecat-sync` →
`public.entitlements`**. The database's Premium checks only ever read `entitlements`, so the app
can't grant itself Premium.

- **RevenueCat project:** an Android app (package `com.goodlist.app`) and a Web Billing app
  (connected to Stripe). One entitlement, `premium`. One `default` offering with the standard
  `$rc_monthly` and `$rc_annual` packages; each holds the Play product and the Web Billing product.
- **Google Play:** one subscription with a monthly and a yearly base plan. No free-trial offer —
  the 90-day trial is Goodlist's own (no card), not a store trial.
- **App ↔ RevenueCat identity:** the app calls `logIn` / `changeUser` with the Supabase user id
  (`src/hooks/use-purchases-identity.ts`), so RevenueCat customers map one-to-one to Supabase users.
- **`revenuecat-sync`:** deployed with JWT verification off, because RevenueCat's webhook doesn't
  send a Supabase token; the function checks auth itself. Deploy and configure it with:

  ```bash
  npx supabase functions deploy revenuecat-sync --project-ref <project-ref> --no-verify-jwt
  npx supabase secrets set --project-ref <project-ref> \
    REVENUECAT_SECRET_KEY=<RevenueCat secret API key> \
    REVENUECAT_WEBHOOK_AUTH="Bearer <long random string>"
  ```

  Then in RevenueCat → Integrations → Webhooks, set the URL to
  `https://<project-ref>.supabase.co/functions/v1/revenuecat-sync` and the Authorization header to
  the same `Bearer <long random string>`.

### The published site

`docs/` is served by GitHub Pages (Settings → Pages → `main` `/docs`) at
<https://jericrealubit.github.io/goodlist/>:

| Page | Used for |
| --- | --- |
| [`/guide/`](https://jericrealubit.github.io/goodlist/guide/) | The user guide — the Play listing's Website / Support URL |
| [`/legal/privacy/`](https://jericrealubit.github.io/goodlist/legal/privacy/) | Required by Google Play, and linked from the Data Safety form |
| [`/legal/terms/`](https://jericrealubit.github.io/goodlist/legal/terms/) | Terms of Service |
| [`/legal/delete-account/`](https://jericrealubit.github.io/goodlist/legal/delete-account/) | Required: deleting an account without installing the app |

Every page is generated — `npm run site` — from the same `src/content/` modules the in-app screens
render from, so the text Google reviews and the text the app ships are the same by construction.
Re-run it after editing anything in `src/content/`, and commit the regenerated `docs/`.
