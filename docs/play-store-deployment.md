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
entirely. If you have (or can register) a business entity, that is the single biggest available
shortcut — it removes 14 days from the critical path. It requires a D-U-N-S number, which itself
takes time to obtain, so it is only a win if you already have one.

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
  answers, and a drafted Data Safety form.

---

## 3. Blockers — fix these before or during the first build

### B1. Supabase keys are not available to EAS Build — **the build will produce a crashing app**

`src/lib/supabase.ts:6` reads `process.env.EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, and throws at module load if either is missing. These live in
`.env.local`, which is git-ignored, so an EAS cloud build has neither. `EXPO_PUBLIC_*` variables are
inlined at build time, so the resulting AAB would install and then crash on launch.

```bash
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://<project>.supabase.co" --environment production --environment preview \
  --visibility plaintext

eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "<anon-key>" --environment production --environment preview \
  --visibility sensitive
```

Verify with `eas env:list --environment production` before building. The anon key is a public
client key by design (RLS is what protects the data), so `sensitive` rather than `secret` is correct —
`secret` values can never be read back, including by you.

### B2. `eas.json` `submit.production` is empty

It is `{}`. For `eas submit` to work unattended it needs the Google service-account key and a target
track:

```jsonc
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "../credentials/play-service-account.json",
      "track": "internal",          // then "beta" for closed testing, "production" at the end
      "releaseStatus": "draft"      // "draft" is required for the very first upload
    }
  }
}
```

`.gitignore` already excludes `*service-account*.json` and `credentials/`. Keep the key outside the
repo entirely if you can, and reference it by absolute path.

### B3. The privacy policy URL is stale and inconsistent with the Data Safety form

`play-store-listing.md` points at a `claude.ai/code/artifact/...` URL. Two problems:

1. **It is out of date.** The published version's "What we collect" section lists only account info
   and task content. The in-app policy (`src/app/(app)/privacy.tsx:26-49`) additionally discloses the
   **activity timestamp** and the **country + time zone**. Meanwhile the drafted Data Safety form
   declares *Approximate location*. Google requires the Data Safety declaration and the privacy
   policy to agree — a mismatch is one of the most common rejection reasons, and here the public
   policy fails to disclose a category you are declaring.
2. **The host is a poor choice.** Play requires the policy at a secure, publicly accessible,
   non-geofenced URL. A `claude.ai` share link is a JavaScript app behind a share token; a reviewer's
   automated fetch may see nothing.

**Fix:** this repo is public, so publish the policy on GitHub Pages
(`https://jericrealubit.github.io/goodlist/privacy`), generated from the same source of truth as
`privacy.tsx`/`terms.tsx` so the two cannot drift again.

### B4. No account-deletion web URL

Play's User Data policy requires apps that let users create an account to provide **both** in-app
deletion (present) **and** a web URL where deletion can be requested without installing the app.
The Data Safety form has a required field for it. There is currently no such page — ship it on the
same GitHub Pages site as B3 (`/delete-account`), explaining the in-app path and giving
`jericrealubit@gmail.com` as the request address.

### B5. No reviewer credentials for a login-gated app

Goodlist shows nothing until you sign in. Under **App content → App access**, provide a working demo
account (email + password) on your Supabase project, seeded with a few tasks and ideally a group.
Reviewers who cannot get past a login screen reject the submission. Create this account now and do
not delete it.

### B6. Screenshots — the existing images cannot be used as-is

Play needs 2–8 phone screenshots (aim for 4–6), JPEG or **24-bit PNG with no alpha**, min dimension
320px, max 3840px, and **no side more than twice the other (2:1 max)**.

`docs/user-guide/images/*.png` are 780×1688 — that is 1:2.16, past the 2:1 cap, so Play Console will
reject them on upload. They are also illustrations rather than captures of the running app. Take real
screenshots from a device or emulator at 1080×2160 or 1080×1920 (both exactly ≤ 2:1). Good candidates:
the task list with a few tasks, task detail, a group screen, history, and appearance/themes.

### B7. The feature graphic has an alpha channel

`assets/images/feature-graphic.png` is 1024×500 (correct) but RGBA. Play requires a 24-bit PNG or
JPEG with **no transparency**. Flatten it onto the brand background before upload:

```bash
npx sharp-cli -i assets/images/feature-graphic.png -o feature-graphic-flat.png \
  flatten --background "#072655"
```

or re-export from `scripts/generate-app-icons.mjs` with the alpha channel removed.

---

## 4. The fastest path, in order

**Day 0 — in parallel, do both of these**

1. **Start the account clock.** Register at [play.google.com/console](https://play.google.com/console),
   pay the one-time $25, and submit identity verification immediately. It takes 2–5 business days and
   *nothing else can be published until it clears*, so this must not wait on the code. During
   verification the account is limited: you can create the app and set up the listing, but not publish
   to any track.
2. **Fix B1 and B2**, then produce a real build:

   ```bash
   npm install
   npx eas-cli login
   npx eas-cli build --platform android --profile preview   # APK — install directly, sanity-check it
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

7. Ship the GitHub Pages privacy policy + account-deletion page (B3, B4), regenerated to match
   `privacy.tsx`.
8. Fill the **Store listing**: copy from `play-store-listing.md`, the 512×512 icon, the flattened
   feature graphic (B7), and the new screenshots (B6).
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
