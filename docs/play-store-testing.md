# Internal and closed testing — the tester runbook

Third file in the Play set:

| File | Holds |
|---|---|
| [`play-store-deployment.md`](./play-store-deployment.md) | The overall process, the release blockers, the timeline |
| [`play-store-listing.md`](./play-store-listing.md) | The listing copy, Data Safety, App content answers |
| **this file** | The two tester tracks that stand between a signed build and production |

Researched 2026-09-10. Google's track rules and the closed-testing requirement have both changed
before; re-check the links in §10 if you are reading this months later.

---

## 1. Two tracks, two different jobs

They are not two sizes of the same thing. They answer different questions, and Goodlist needs both.

| | Internal testing | Closed testing | Open testing |
|---|---|---|---|
| Question it answers | "Does the signed release build actually work?" | "Can I earn production access?" | "How does it behave at scale?" |
| Play Console name | Internal testing | Closed testing — default track **Alpha** | Open testing — track **Beta** |
| Track id for the API and `eas.json` | `internal` | `alpha`, or the custom track's own name | `beta` |
| Testers | Up to 100 email addresses | Email lists (2,000 addresses per list) or Google Groups | Anyone — it is listed publicly |
| Review before testers can install | No | Yes for the first release on the track | Yes |
| Upload → installable | Minutes | First release waits on review; later ones, minutes | Same |
| **Counts toward the 12 × 14 rule** | **No** | **Yes** | **No** |

**The one-line version:** internal testing is the smoke test, closed testing is the clock. Only
closed testing earns production access, so a day spent only on internal testing is a day the
14-day clock is not running.

> **The `beta` trap.** Play renamed its tracks years ago but the API kept the old ids: `alpha` is
> today's **Closed** testing and `beta` is today's **Open** testing. Setting `track: "beta"` in
> `eas.json` intending to run a closed test publishes the app to open testing — a public listing
> anyone can install, which does *not* satisfy the closed-testing requirement. Use `alpha`, or the
> name of the closed track you created.

---

## 2. The rule that sets the timeline

Goodlist is being published from a **personal** developer account registered after 13 Nov 2023, so
before it can go to production Google requires:

> **12 testers, opted in continuously for 14 days**, on a *closed* track — and, since 2026, evidence
> those testers genuinely used the app.

Mechanics that decide whether the 14 days actually count:

- **Opted in** means the tester accepted the web opt-in link *with the same Google account that is
  on your tester list*. Installing the APK by hand is not opting in. Being on the list without
  accepting is not opting in.
- **Continuous** is per tester. Someone who opts out on day 9 and back in on day 10 restarts at
  zero — their clock does not resume. The requirement is 12 testers each holding an unbroken
  14-day opt-in *at the moment you apply*.
- **Internal testers do not count**, no matter how many there are or how long they stay.
- **Usage is checked.** Twelve opted-in accounts that never opened the app is the common reason an
  otherwise complete application is rejected. §7 has a query for confirming they did.

Practical consequence: **recruit 16–20, not 12.** Attrition over two weeks is normal, and losing a
tester on day 12 means finding a replacement and waiting another 14 days.

Confirm the requirement applies to you before planning around it — the Play Console **Dashboard**
shows a "Run a closed test" task only for accounts it applies to. Organization accounts registered
to a legal entity are exempt entirely.

---

## 3. Preflight — do all of this before you invite anyone

Every day of the 14 is expensive. A crash-on-launch found by a tester on day 3 does not just cost
three days, it costs the goodwill of people you have to ask again.

- [ ] **B1 in the deployment doc is done** — `eas env:push production` and `preview` have run, and
      `eas env:list --environment production` shows both Supabase variables. Without them the AAB
      installs and crashes on launch, because `src/lib/supabase.ts:6` throws at module load.
- [ ] **A preview APK has been installed on a real device and exercised** — sign-in, create a task,
      complete a task, create or join a group, send a requested task. An `.aab` cannot be
      side-loaded, so this APK is the only pre-upload smoke test that exists:
      ```bash
      npx eas-cli build --platform android --profile preview
      ```
- [ ] **The reviewer demo account exists** (deployment doc B5) and is seeded with tasks and a group.
- [ ] **The app has been created in Play Console** and one AAB has been uploaded and reviewed at
      least once — the first release on a closed track waits on review, and you would rather that
      wait happened before testers were watching.
- [ ] **Identity verification has cleared.** Nothing publishes to any track until it does.

---

## 4. Internal testing — the smoke test

**Purpose:** prove the *signed, Play-processed* build works. This is not the same artifact you
side-loaded: Play re-signs it with the app signing key and delivers it through the Store. Bugs that
only appear here (signing, ProGuard/R8 stripping, deep links, the Play-delivered splash) are real
and worth catching before 20 people see them.

1. Play Console → **Testing → Internal testing → Create new release**.
2. Upload the AAB, or let EAS do it:
   ```bash
   npx eas-cli build --platform android --profile production
   npx eas-cli submit --platform android --profile internal --latest
   ```
   (`submit.internal` in `eas.json` — see §6.)
3. **Testers** tab → create a list with your own address and 2–3 people who will answer you
   quickly. Save.
4. Copy the **opt-in URL** from that tab, open it, click *Become a tester*, then install from Play.
5. Verify against the release build, not from memory: sign-in, task create/complete, group create
   and join, a requested task, Settings → Delete account on a throwaway account, and both themes.

Only when this passes does the closed track get a build. Internal testing has no waiting period and
no review, so you can iterate here as many times as you need in a single day.

---

## 5. Closed testing — starting the clock

Reach this step as early as you possibly can. Everything else in the Play submission — screenshots,
listing copy, the feature graphic, Data Safety — can be finished *during* the 14 days. None of it
gates the clock.

### 5.1 Create the track

1. Play Console → **Testing → Closed testing**. The default track is named **Alpha**; use it, or
   *Create track* for a named one (its name becomes the API track id — write it down for §6).
2. **Create new release**, upload the same AAB that passed internal testing, add release notes,
   and roll it out. **The first release on this track goes to review** — usually hours, sometimes
   days.
3. **Testers** tab → *Create email list*. Add every tester's Google account address. Save, then
   copy the **opt-in URL** — this is the link testers need, and the only one that registers an
   opt-in.

A Google Group works instead of a list and is easier to manage over time, but adds a step for each
tester (join the group, then opt in). For 16–20 people a plain email list is less friction.

### 5.2 Recruit, and tell them exactly what to do

This is the step that actually fails, and it fails on mechanics rather than willingness. Testers
routinely opt in with a different Google account than the one you listed, or install nothing after
opting in. Send them something like this:

> Hi — I'm putting Goodlist (a shared to-do app) on Google Play and Google requires 12 people to
> test it for 14 days before it can go public. It's about two minutes to set up and then just
> leaving it installed.
>
> **1.** Tell me the Gmail address on your Android phone. It has to be that exact account — a
> different one won't register.
> **2.** I'll send you a link. Open it on the phone and tap **Become a tester**.
> **3.** On the same page, tap **Download it on Google Play**, then install as normal.
> **4.** Open the app, sign up, and add a couple of tasks.
> **5.** Please leave it installed for two weeks and open it every few days. If you uninstall or
> leave the tester programme early, my clock resets — so if you need to stop, just tell me.
>
> It's free, has no ads, and you can delete your account and everything in it from Settings at any
> time.

Points worth repeating to them: **the same Google account**, **install from Play (not a file I sent
you)**, and **don't leave the tester programme**.

### 5.3 Record day zero

The 14 days count from when each tester opted in, not from when you uploaded. Note the date each
person confirms. §7 has a tracker.

---

## 6. Shipping updates to testers

Add named submit profiles so the track is chosen by profile rather than by editing `eas.json`
between runs — editing it by hand is how a build meant for 20 testers ends up on the open track.
`eas.json` now carries:

```jsonc
"submit": {
  "internal": { "android": { "track": "internal",   "releaseStatus": "completed" } },
  "closed":   { "android": { "track": "alpha",      "releaseStatus": "completed" } },
  "production": { "android": { "track": "internal", "releaseStatus": "draft" } }
}
```

(Each also carries `serviceAccountKeyPath`. `submit.production` is deliberately still pointed at
`internal`/`draft` — that is what a *first* submission needs; change it to `track: "production"` and
drop `releaseStatus` at the very end, per the deployment doc.)

Then:

```bash
# build once, ship to the smoke-test track
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform android --profile internal --latest

# same build, once it looks right, to the track that counts
npx eas-cli submit --platform android --profile closed --latest

# or in one step
npx eas-cli build --platform android --profile production --auto-submit-with-profile closed
```

Notes that save a cycle:

- **`--latest` submits the most recent finished build.** Use `--id <build-id>` when you mean a
  specific one; without either, EAS asks.
- **Every upload needs a higher `versionCode`.** `eas.json` sets `autoIncrement: true` with
  `appVersionSource: "remote"`, so EAS handles it. Never set `versionCode` by hand while that is
  remote — a duplicate is rejected on upload.
- **Promoting inside Play Console does not need a new build.** Closed testing → *Releases* →
  **Promote release** reuses the reviewed artifact and is the cheapest way to move a known-good
  build up a track.
- **Keep shipping during the window.** A couple of small updates on the closed track is good
  evidence of a genuine test, and gives testers a reason to reopen the app.
- **`releaseStatus: "draft"` uploads without rolling out.** Useful for staging an artifact you
  intend to release from the Console; useless for a track you want testers on today, because
  nobody receives a draft.

---

## 7. Watching the window

### 7.1 Tester tracker

Play Console shows how many testers are opted in but not a per-person history, so keep one. Copy
this into a note and fill it in:

| # | Google account | Opted in | 14 days up | Installed? | Opened since | Notes |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| … | | | | | | |

The column that matters is **14 days up** — production access needs 12 rows whose date has passed
and who are *still* opted in on the day you apply.

### 7.2 Did they actually use it?

Opt-in is what Play counts; usage is what Play now also checks. The app itself is the better
source. Run this in the Supabase SQL editor (the dashboard runs as service role, so it reads past
RLS — never put a service key in the app):

```sql
select
  u.email,
  p.display_name,
  u.created_at::date                 as signed_up,
  p.last_seen_at                     as last_opened,
  count(t.id)                        as tasks_created_14d,
  count(distinct t.created_at::date) as active_days_14d
from auth.users u
join public.profiles p on p.id = u.id
left join public.tasks t
  on t.creator_id = u.id
 and t.created_at >= now() - interval '14 days'
group by u.email, p.display_name, u.created_at, p.last_seen_at
order by active_days_14d desc, p.last_seen_at desc nulls last;
```

Reading it:

- `last_opened` is `profiles.last_seen_at`, a heartbeat the app writes every 60s while foregrounded
  (`touch_last_seen()`). It is **overwritten**, so it proves only the most recent open — a row
  showing today tells you nothing about last week.
- `active_days_14d` is the real signal: distinct days on which that person created a task. That is
  the number to look at before applying.
- A tester whose address does not appear in the results **at all** never got past the sign-up
  screen — they opted in on Play and stopped. Chase those first; they are the ones who sink an
  otherwise complete application. (Cross-check the output against your §7.1 tracker; the query can
  only show people who have an account.)

`npm run report:distribution` is a separate, aggregate view (users per country) and is not a
per-tester tool — do not reach for it here.

---

## 8. Applying for production access

Once 12 testers have each held an unbroken 14-day opt-in and the usage query looks honest:

1. Play Console → **Dashboard** → the closed-testing task → **Apply for production access**.
2. The form asks about the test in prose. Answer concretely and briefly — how testers were
   recruited, what feedback came back, what you changed because of it. "Twelve friends and
   colleagues; they found the group invite code hard to locate, so it moved onto the group card"
   reads as a real test. Generic answers get pushed back.
3. Finish **App content** first if any of it is still amber — the application is reviewed against a
   complete listing. `play-store-listing.md` has every answer.
4. Google reviews this separately from an app review. Budget **up to ~7 days**.
5. When it is granted, promote the release to **Production** and start at a partial rollout (20% is
   a sensible first step). A staged rollout can be halted; a full one effectively cannot.

Do not stop the closed test the moment you apply. Keep the track and its testers in place until
production access is actually granted.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Tester opens the opt-in link and sees "not available" / 404 | Signed in as a different Google account than the one on the list, or the list was saved but the release was not rolled out | Confirm the exact address; check the track shows an active release, not a draft |
| Opted in, but Play shows "item not found" for hours | The first release on the track is still in review, or Play's propagation lag (up to ~a few hours) | Wait it out; verify the release status in Console before chasing testers |
| Tester count in Console is lower than the number of people who told you they opted in | Someone opted in with a second account, or left the programme | Reconcile against your §7.1 tracker one row at a time |
| `eas submit` fails: "The app is missing the required metadata…" | The app has never been reviewed, so Play will not accept an automated rollout | Upload the first AAB by hand in Play Console, or submit once with `releaseStatus: "draft"` and complete the release in the Console |
| `eas submit` fails: "Changes cannot be sent for review automatically" | An edit Play will not auto-submit — typically a track in a rejected state | Set `changesNotSentForReview: true` on that submit profile *for that submission only*, then send for review from the Console. It is a last resort, not a default — leaving it on can itself cause upload failures |
| Upload rejected: version code already used | A `versionCode` was reused | Do not set it by hand; `appVersionSource: "remote"` + `autoIncrement: true` own it |
| App installs, then crashes immediately on launch | `EXPO_PUBLIC_SUPABASE_*` were missing at build time | Deployment doc B1 — `eas env:push`, then rebuild. The variables are inlined at build time, so no rebuild means no fix |
| Testers on the wrong track — the app is publicly listed | `track: "beta"` was used for the closed test | `beta` is *open* testing. Move to `alpha`, and halt the open-testing release |
| 14 days elapsed but the Console task is still incomplete | Fewer than 12 *continuous* opt-ins on the day, or insufficient usage | Recruit replacements and restart their 14 days; check §7.2 before applying again |

---

## 10. Sources

- [Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334) — track setup, tester lists, opt-in URLs, limits
- [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465) — the 12-tester / 14-day rule
- [APKs and tracks](https://developers.google.com/android-publisher/tracks) — the reserved track ids (`internal`, `alpha`, `beta`, `production`) and custom closed-track naming
- [Control when app changes are reviewed and published](https://support.google.com/googleplay/android-developer/answer/9859654) — what `changesNotSentForReview` corresponds to
- [Submit to the Google Play Store with EAS Submit](https://docs.expo.dev/submit/android/) — `track`, `releaseStatus`, `rollout`, `changesNotSentForReview`
- [Automate submissions](https://docs.expo.dev/build/automate-submissions/) — `--auto-submit-with-profile`
- [Manually submit an Android app](https://docs.expo.dev/submit/android-manual/) — the first-upload-by-hand path
