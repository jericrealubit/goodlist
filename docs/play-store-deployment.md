# Deploying Goodlist to Google Play — runbook

Companion to [`play-store-listing.md`](./play-store-listing.md), which holds the *copy* for the
listing. This file holds the *process*: what gates exist, what this repo still needs, and the exact
order to do things in to reach production the fastest.

Researched 2026-09-08. Policy dates below are Google's; re-check them if you read this months later.

---

## 1. The honest timeline

"ASAP" for a brand-new Google Play app is governed by two calendar gates. Neither can be shortened
by anything in this codebase:

| Gate | Duration | Applies to |
|---|---|---|
| **Developer account identity verification** | 2–5 business days | Every new personal account. As of September 2026 all new personal accounts must verify identity (name, address, email, phone) before publishing to any track. |
| **Closed testing: 12 testers × 14 continuous days** | 14 days, minimum | Personal accounts created after 13 Nov 2023. The testers must be opted in *continuously* for the 14 days, and since 2026 Google also checks they genuinely used the app. |

Realistic outcomes from a standing start:

- **App installable by your testers: ~1–2 days** (internal testing track — no 14-day wait, up to 100 testers).
- **App public on production: ~3 weeks minimum** (verification, then the 14-day closed test, then a production review of a few hours to ~7 days).

An **organization** account registered to a legal business entity is exempt from the 12-tester rule
entirely — that is the single biggest available shortcut, removing 14 days from the critical path.
It requires a D-U-N-S number, which normally takes up to 30 business days to obtain (expedited: 8
business days, ~US$229), so for most people it is *slower* than simply running the closed test.

### The organization route for this account

This account has an Australian ABN, and D&B already holds a record for it — created automatically
from the public registry, so no application was ever made. That removes the two slow steps (entity
registration, and waiting on a new D-U-N-S) and makes the organization route genuinely competitive:

| | Personal | Organization |
|---|---|---|
| Identity/org verification | 2–5 business days | 2–4 weeks |
| 12 testers × 14 days | required | **exempt** |
| **Total** | ~3 weeks | ~2–4 weeks |

Close enough that it comes down to two risks, both worth knowing before committing:

- **The record looks like a sole trader** — its legal name is a person's name with a separate trading
  name, not a `Pty Ltd`. Google's Australian document list asks for a *Certificate of Incorporation
  or Registration*, which a sole trader does not have (an ABN registration confirmation may or may
  not satisfy it). Organization acceptance is therefore not guaranteed.
- **No privacy gain here.** Organization accounts can normally publish a business address instead of
  a home one, but a sole trader's registered business address *is* the home address, so the same
  address is displayed either way. Choose the account type on the testing exemption alone.

**Getting the number.** The public D&B directory masks it behind a paid credit report — **do not buy
one**, and do not use a third-party "DUNS registration service". D&B runs a free request flow
specifically for app-store developers at
<https://www.dnb.com/en-us/smb/duns/google-developers.html>; when a record already exists it returns
that existing number rather than creating a new one. While waiting, claim the record and correct it:
Google cross-checks the legal name and address against D&B, and an auto-generated record is often
thin (unclassified industry, missing year started). Any mismatch with the ABR is a delay.

**Time-box it.** Request the number today and keep lining up testers in parallel — they cost nothing
and you need them the moment the organization route stalls. If the number has not arrived within
about five business days, register as **personal** and start the 14-day clock; the account type can
still be changed later under Developer account → About you → Change account type. What is *not*
established is whether converting mid-flight retroactively waives a closed test already under way,
so do not plan around that.

> **The one thing that matters most:** the 14-day clock does not start until 12 testers are opted
> into a closed test. Everything else — polished screenshots, listing copy, a nicer feature graphic —
> can be done *during* those 14 days. Get a build into closed testing first, then iterate on the
> listing. Do not sequence it the other way around.

---

## 2. What this repo already has right

- `eas.json` — `production` profile with `autoIncrement: true` and `appVersionSource: "remote"`, so
  EAS owns the `versionCode`. The production profile builds an `.aab` by default, which is what Play
  requires.
- EAS project is already linked (`extra.eas.projectId` in `app.json`), owner `jericrealubit`.
- `android.package` is `com.goodlist.app`. **This is permanent** — once an AAB is uploaded under it,
  it can never be changed for this listing. Confirm you're happy with it before the first upload.
- **Target API level is already compliant.** Expo SDK 57 (React Native 0.86) compiles and targets
  SDK 36. Since 31 Aug 2026 Google Play rejects new apps and updates that target below API 36, so
  this repo clears that bar with no `expo-build-properties` changes needed.
- Adaptive icon (`android-icon-foreground.png`, 1024×1024) and background colour are configured.
- `assets/images/play-store-icon.png` — 512×512, correct.
- In-app account deletion exists (Settings → Delete account), which Play's User Data policy requires.
- `docs/play-store-listing.md` already has the short/full description, category, content-rating
  answers, and a drafted Data Safety form — now including the App access and Data deletion sections.
- `src/content/legal.ts` is the single source for the Privacy Policy and Terms; `npm run legal:site`
  renders the public pages from the same text the app shows.

---

## 3. Blockers

Four of the seven are fixed in the repo. The three that remain need your Supabase project, your
Play Console account, or a device — nothing in the codebase can supply them.

### B1. Supabase keys are not available to EAS Build — **the build will produce a crashing app**

`src/lib/supabase.ts:6` reads `process.env.EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, and throws at module load if either is missing. These live in
`.env.local`, which is git-ignored (correctly — never commit it), so an EAS cloud build has neither.
`EXPO_PUBLIC_*` variables are inlined at build time, so the resulting AAB would install and then
crash on launch.

The values have to be uploaded to EAS once. With `.env.local` already in place locally, that is one
command per environment — `env:push` reads `.env.local` by default:

```bash
npx eas-cli login
npx eas-cli env:push production
npx eas-cli env:push preview
npx eas-cli env:list --environment production   # confirm both landed
```

It asks how to store each variable. `EXPO_PUBLIC_SUPABASE_URL` can be **plain text**;
`EXPO_PUBLIC_SUPABASE_ANON_KEY` should be **sensitive**, not *secret* — secret values can never be
read back, including by you, and `eas env:pull` would then no longer be able to rebuild a working
`.env.local`. The anon key is a publishable client key that ships inside every copy of the app
anyway; row-level security is what actually protects the data, so it does not need secret handling.

Each build profile in `eas.json` names the environment it draws from (`production` → `production`),
so once these are pushed the builds pick them up with no further configuration.

### B2. ~~`eas.json` `submit.production` is empty~~ — **fixed**

`eas.json` now carries the submit block, plus an explicit `environment` on each build profile so the
EAS environment variables from B1 actually resolve, and an explicit Android `buildType` on each:

```jsonc
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./credentials/play-service-account.json",
      "track": "internal",
      "releaseStatus": "draft"
    }
  }
}
```

You still have to **put the key file there**: create a Google Cloud service account with the
*Service Account User* role, grant it access in Play Console under Users and permissions, download
its JSON key, and save it as `credentials/play-service-account.json`. `.gitignore` already excludes
`*service-account*.json` and `credentials/`, so it will not be committed — but keeping it outside
the repo and using an absolute path is safer still.

`track` is `internal` and `releaseStatus` is `draft` because that is what the *first* submission
needs. Move `track` to `beta` for the closed test and `production` at the end, and drop
`releaseStatus` once the app has a live release.

### B3. ~~The privacy policy URL is stale and inconsistent~~ — **fixed, one manual step left**

The old `claude.ai/code/artifact/...` URL was both a bad host for a policy Google must fetch, and
out of date: it disclosed neither the activity timestamp nor the country/time zone that
`privacy.tsx` discloses and that the Data Safety form declares as *Approximate location*.

The copy now lives in **`src/content/legal.ts`**, and two things render from it:

- the in-app screens (`src/app/(app)/privacy.tsx`, `terms.tsx`, via `LegalDocument`), and
- the public website, built by `npm run legal:site` into `docs/legal/`.

They cannot drift, because there is only one copy of the text. Re-run `npm run legal:site` after any
edit to `legal.ts` and commit the regenerated HTML.

**Manual step — turn GitHub Pages on:** repo Settings → Pages → Source *Deploy from a branch*,
branch `main`, folder `/docs`. That publishes:

| Page | URL |
|---|---|
| Privacy Policy | `https://jericrealubit.github.io/goodlist/legal/privacy/` |
| Terms of Service | `https://jericrealubit.github.io/goodlist/legal/terms/` |
| Delete your account | `https://jericrealubit.github.io/goodlist/legal/delete-account/` |

A `docs/.nojekyll` file is included so Pages serves the generated HTML verbatim instead of running
the Markdown in `docs/` through Jekyll. Load each URL in a private window before submitting.

### B4. ~~No account-deletion web URL~~ — **fixed, same manual step**

`https://jericrealubit.github.io/goodlist/legal/delete-account/` is generated alongside the other
two. It documents the in-app path (Settings → Delete account), the email fallback for someone who
has lost their device, exactly what is deleted, the group-ownership block, and the partial-deletion
options. It goes in the required **Data deletion URL** field of the Data Safety form — see
`play-store-listing.md`, which now has that section filled in.

### B5. No reviewer credentials for a login-gated app

Goodlist shows nothing until you sign in. Under **App content → App access**, provide a working demo
account (email + password) on your Supabase project, seeded with a few tasks and ideally a group.
Reviewers who cannot get past a login screen reject the submission. Create this account now and do
not delete it.

### B6. Screenshots — **five generated**, one screen still needs a device

`npm run store:screenshots` captures them from the real app into `docs/store/screenshots/` at
1080x2160, 24-bit, no alpha — Play's phone spec exactly (320–3840px per side, long side at most twice
the short side; 1080x2160 sits on that 2:1 cap).

They are genuine renders of the shipped screens: the script serves the web export of the same Expo
Router code the Android app runs, seeds a session, and answers every Supabase call from fixtures, so
it needs no demo account and no network. Each shot asserts a string it expects on screen before it
is written.

| File | Screen |
|---|---|
| `01-my-tasks.png` | Personal task list with notes and due dates |
| `02-requested.png` | Requested tab — tasks another member asked for, with their name |
| `03-group.png` | Group card: invite code, members and roles |
| `04-history.png` | Completed and cancelled tasks with undo |
| `05-settings.png` | Profile and the theme picker |

Two platform gaps are handled so the capture matches a phone rather than a Linux browser:

- **Font.** Android resolves the app's font to `'normal'` — the system sans, Roboto. The web branch
  asks for `var(--font-rounded)`, which lists SF Pro Rounded / Hiragino / Meiryo, none of which exist
  on Linux, so Chromium substituted DejaVu Sans. DejaVu is far wider: it rendered the 48px invite
  code at 240px where Roboto gives 217px, pushing the Share button off the card and ellipsising a
  group name that fits fine on a phone. The script serves real Roboto (`@fontsource/roboto`) and
  points the custom properties at it, then refuses to run if it did not load. **There was never a
  responsive bug here** — measured under Roboto, the Share button fits at 360, 393 and 412dp.
- **Tab bar.** The web build renders its own top tab strip where Android renders a native bottom bar.
  It is measured on the signed-in Tasks screen, the viewport grown by exactly that much, then cropped
  back off — so nothing is painted in to fill the gap.

**The task edit form is still not captured.** Its due-date field is a real platform split
(`src/components/due-date-picker.web.tsx`): web renders an HTML `<input type="date">` with a browser
date picker where Android uses `@react-native-community/datetimepicker`. No font fixes that. Capture
it on a device if you want it — the release APK is already installed:

```bash
adb exec-out screencap -p > task-detail.png
```

A phone screenshot at 1080x2400 or taller is past the 2:1 cap, so crop to 1080x2160 before
uploading. The `docs/user-guide/images/*.png` are illustrations at 780x1688 (1:2.16, also past the
cap) and are not a substitute.

#### Two styling bugs found while doing this — not fixed, your call

Both are real and visible on Android, not web artifacts. They are coupled, so fixing one alone makes
things worse:

1. **`src/components/group-card.tsx` bands the card.** Its layout wrappers are `ThemedView`, which
   always applies `backgroundColor: theme[type ?? 'background']`. Inside the white card that repaints
   the beige screen background (`#F5F1E6`) over it, in horizontal bands. `docs/user-guide/images/11-invite-code.png`
   shows the intended look — an unbanded white card. The fix is to make those wrappers plain `View`.
2. **Secondary buttons are invisible on a white surface.** `PrimaryButton` with `variant="secondary"`
   fills with `theme.backgroundElement` (`#FFFFFF`) and sets no border and no shadow. On the white
   group card, Share / Rename Group / Make owner / Remove have no edge at all — they only read as
   buttons today *because* of the banding in (1). Fixing (1) without giving the secondary variant a
   border or elevation turns every one of those buttons into plain text.

The screenshot ships with the banding, because that is what the app currently looks like.

### B7. ~~The feature graphic has an alpha channel~~ — **fixed**

`assets/images/feature-graphic.png` is now a 24-bit RGB PNG with no alpha, and
`assets/images/play-store-icon.png` is now 32-bit RGBA, which is what Play Console specifies for the
listing icon. Both were regenerated by `node scripts/generate-app-icons.mjs`, which was the actual
bug: it created the feature-graphic canvas with three channels but the composited overlays promoted
the result back to RGBA, and the `.flatten()` guard had to become a second pass because sharp
applies operations in a fixed pipeline order rather than call order.

---

## 4. The fastest path, in order

**Day 0 — in parallel, do both of these**

1. **Start the account clock.** Register at [play.google.com/console](https://play.google.com/console),
   pay the one-time $25, and submit identity verification immediately. It takes 2–5 business days and
   *nothing else can be published until it clears*, so this must not wait on the code. During
   verification the account is limited: you can create the app and set up the listing, but not publish
   to any track.
2. **Do B1** (the only repo blocker left before a build), then produce a real build:

   ```bash
   npm install
   npx eas-cli login
   npx eas-cli env:push production                        # reads .env.local
   npx eas-cli env:push preview
   npx eas-cli build --platform android --profile preview  # APK — install directly, sanity-check it
   ```

   Install that APK on a physical device and confirm sign-in, task creation, and group flows work
   against production Supabase. An `.aab` cannot be installed directly, so this preview APK is your
   only pre-upload smoke test. **Do not skip it** — a crash-on-launch discovered by testers costs you
   days of the 14-day window.

**Day 1 — get the AAB into Play**

3. In Play Console, **Create app**: name Goodlist, English, App, Free.
4. Build and upload the production bundle:

   ```bash
   npx eas-cli build --platform android --profile production   # .aab
   ```

   For the *first* upload, either upload the `.aab` by hand in Play Console (simplest — it removes
   service-account setup from the critical path) or run `eas submit -p android` once the service
   account exists. Every submission after that can be `eas submit`.
5. Push it to **Internal testing** and add yourself + a few people. Internal testing has no waiting
   period and is the fastest way to confirm the signed release build actually works.

**Day 1–2 — start the 14-day clock**

6. Create a **Closed testing** track, upload the same bundle, and get **12+ testers opted in**. Each
   needs a Google account on the tester email list, and each must accept the opt-in link and actually
   open the app. Recruit more than 12 — if anyone opts out mid-window, the clock resets for them.
   *This is the step to reach first.* Everything below can happen while the 14 days run.

**During the 14 days — complete everything else**

7. Turn on GitHub Pages (Settings → Pages → `main` / `/docs`) so the privacy, terms, and
   account-deletion pages go live (B3, B4), and check all three load in a private window.
8. Fill the **Store listing**: copy from `play-store-listing.md`, `assets/images/play-store-icon.png`,
   `assets/images/feature-graphic.png`, and the new screenshots (B6).
9. Complete **App content** end to end — it all must be green before production:
   privacy policy URL · App access (B5 demo credentials) · Ads: No · Content rating questionnaire ·
   Target audience: 13+, not designed for children · Data safety (matching the policy, including the
   deletion URL) · News: No · Financial features: No · Government: No · Health: No.
10. Keep testers engaged. Push an update or two to the closed track — genuine usage is now checked.

**Day 15+**

11. On the Play Console dashboard, **apply for production access**. Google reviews the closed test;
    this itself can take up to ~7 days.
12. Once granted, promote the release to **Production** and choose a rollout percentage (start at
    20% and ramp — a staged rollout is reversible, a full one is much less so).

---

## 5. Ongoing

- Version bumps: leave `version` in `app.json` as the human-facing string and let EAS auto-increment
  `versionCode`. Never set `versionCode` by hand while `appVersionSource` is `remote`.
- There is no `expo-updates` channel configured, so **every** JS change needs a new build and a new
  Play release. If you expect to iterate quickly post-launch, adding EAS Update is worth doing before
  you have real users.
- The keystore EAS generates on your first Android build is the only thing that can sign updates to
  this listing. Back it up: `eas credentials -p android` → download keystore, and store it somewhere
  you will still have in five years. Losing it means you can never update the app again.
- Target API level rises annually — expect API 37 to become mandatory around August 2027.

---

## 6. Sources

- [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465) — the 12-tester / 14-day rule
- [Verify your developer identity information](https://support.google.com/googleplay/android-developer/answer/10841920)
- [Target API level requirements for Google Play apps](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Understanding Google Play's app account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Best practices for your store listing](https://support.google.com/googleplay/android-developer/answer/13393723)
- [Submit to the Google Play Store with EAS Submit](https://docs.expo.dev/submit/android/)
- [Manually submit an Android app to the Google Play Store](https://docs.expo.dev/submit/android-manual/)
- [Create and manage environment variables in EAS](https://docs.expo.dev/eas/environment-variables/manage/)
- [Using automatically managed credentials](https://docs.expo.dev/app-signing/managed-credentials/)
- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)
