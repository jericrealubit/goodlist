# Goodlist — what could come next

A ranked list of improvements, researched against the code in September 2026. Every item names the
evidence for the gap, so it can be re-checked instead of trusted. "Play/legal" says what else has to
change if it ships: `src/content/legal.ts` (then `npm run site`), and
[`play-store-listing.md`](./play-store-listing.md)'s Data Safety answers.

Effort: **S** ≈ a day, **M** ≈ a few days, **L** ≈ a week or more.

## Done in this pass

- **CI.** `.github/workflows/ci.yml` runs typecheck, lint, unit tests, and checks that `docs/` is
  regenerated from `src/content/`. Before this, nothing ran automatically (there was no `.github/`).
- **Task-alarm planner tests.** `src/lib/tasks/reminder-plan.test.ts`. Its medicine counterpart was
  already tested; this one wasn't.
- **Accessibility.** The Settings links and the error screen's *Try again* button now announce
  themselves as a link or a button. The Settings links also got a larger touch target.
- **Docs.** The alarm ring cadence, the exact-alarm permission, the Calendar alarm banner, and the
  Health apps / exact-alarm Play declarations are now documented in the legal, guide, README,
  About and Play docs.

## Release risk — look at this first

| | |
|---|---|
| **What** | Play may refuse `USE_EXACT_ALARM` for a to-do app. It is reserved for apps whose core function is an alarm clock or a calendar. |
| **Evidence** | `app.json` → `android.permissions`. See [`play-store-deployment.md` → Exact-alarm declaration](./play-store-deployment.md#exact-alarm-declaration). |
| **Fallback** | Drop `USE_EXACT_ALARM` and keep `SCHEDULE_EXACT_ALARM`. On Android 14+ that is off until the user allows *Alarms & reminders*. Extend `src/components/calendar/alarm-status-banner.tsx` to detect that state specifically (it currently only checks the notification permission). |
| **Effort** | S |

## Features

### 1. Search and filter — S/M
- **Gap:** there is no search on the Tasks tab (`src/app/(app)/(tabs)/index.tsx`) or in History
  (`src/app/(app)/history.tsx`). Both only list.
- **Why:** it's the most expected feature a list app lacks, and History grows without bound.
- **How:** filter the React Query cache on the client, so it works offline for free.
- **Play/legal:** none.

### 2. Push notifications for Requested tasks — M/L
- **Gap:** when someone asks you to do something, you only find out while Goodlist is open. The unread
  badge is Realtime-only, there is no push token anywhere, and the only edge function is
  `supabase/functions/revenuecat-sync`. The plan lists this under Phase 5 ("push notifications if
  justified").
- **How:** register an Expo push token in a `push_tokens` table, then add a database webhook or edge
  function on `notifications` insert.
- **Play/legal:** the privacy policy must disclose the push token and that Expo's push service is a
  processor. Data Safety needs **Device or other IDs**.

### 3. Remind me before it's due — S
- **Gap:** a task alarm fires only at `due_at` (`src/lib/tasks/reminder-plan.ts`: "one specific
  instant").
- **How:** add a lead time (5 / 15 / 60 min, 1 day) as a column on `tasks`, and put the offset in
  `planTaskReminders` and its signature. The new tests make this safe to change.
- **Play/legal:** one clause in the privacy policy's *Task alarms* paragraph.

### 4. Repeating chores for groups — M
- **Gap:** `task_recurrences` (`supabase/schema.sql`) has only `creator_id`, so repeating tasks are
  Personal-only. The user guide and the policy both say so.
- **Why:** "take the bins out every Tuesday" is the most common family task.
- **How:** add an assignee and group column, and RLS mirroring `tasks`.
- **Play/legal:** update the *Repeating tasks* privacy paragraph, which says they aren't shared.

### 5. Priorities, tags, subtasks/checklists — M each
- **Gap:** absent from the `tasks` schema. Subtasks and "attachments/photos" are listed as
  deliberately deferred in the Project Plan §9.2. Revisit priorities first: they're the cheapest.
- **Play/legal:** none beyond what User-generated content already covers.

### 6. Export my data — S
- **Gap:** there is no export. The only `Share.share` is the invite code in
  `src/components/group-card.tsx`.
- **Why:** a JSON/CSV export from Settings is good practice for a privacy-forward app. It also backs
  up the GDPR-style access right the policy's *Your choices* clause implies.
- **Play/legal:** mention it in *Your choices*.

### 7. Home-screen widget — L
- **Gap:** there is no widget. Today's tasks and doses at a glance would suit the alarm and Meds users.
- **How:** this needs a native Android module (config plugin plus Glance/RemoteViews).

### 8. Child profiles — L
- **Gap:** Project Plan Phase 6. It is still an open decision there, and the policy says child roles
  are labels only. Treat it as its own product and security project, as the plan says.

## Platform and reliability

### 9. Over-the-air updates (EAS Update) — S
- **Gap:** there is no `expo-updates`, and no `channel` in `eas.json`. Every copy fix needs a Play
  build plus review, which [`play-store-deployment.md` §5](./play-store-deployment.md#5-ongoing)
  already flags.
- **How:** add channels per build profile and a `runtimeVersion` policy.

### 10. Crash and error reporting — S/M
- **Gap:** there is no crash reporter. The only safety net is `src/components/error-boundary.tsx`.
  Reminder and alarm failures are swallowed with `.catch(() => {})` in `src/hooks/use-task-mutations.ts`,
  `src/hooks/use-alarms.ts` and `src/hooks/use-task-recurrences.ts`. "Why didn't my alarm ring?" is
  therefore undiagnosable.
- **How:** start by logging those catches locally. Adding a reporter such as Sentry is the bigger step.
- **Play/legal:** a reporter is a new processor. It needs a disclosure in the policy and Data Safety
  **App info and performance → Crash logs**.

### 11. Store the session in secure storage — S
- **Gap:** the Supabase session lives in plain AsyncStorage (`src/lib/supabase.ts`, `storage:`).
- **How:** on native, use an `expo-secure-store`-backed adapter (the refresh token is the sensitive
  part). Keep AsyncStorage on the web.

### 12. Database tests — M
- **Gap:** RLS is enabled on all 12 tables, and every `security definer` function pins
  `search_path`, but nothing tests the policies. The Project Plan's Phase 4 asks for "security tests".
- **How:** use pgTAP with `supabase test db`. Key cases: someone outside a group can't read its tasks,
  a lapsed owner's extra group is read-only, and an unshared medicine is private.

### 13. iOS release — L
- **Gap:** there is a bundle id in `app.json`, but `eas.json` has only Android submit profiles.
  RevenueCat has no App Store app, and there are no App Store docs to match `docs/play-store-*.md`.
- **Note:** the alarm cadence is already written with iOS's 64-pending-notification cap in mind
  (`FOLLOW_UP_LIMIT` in `src/lib/alarms/ringing.ts`).

### 14. Translations — L
- **Gap:** all copy is hard-coded English, including `src/content/guide.ts` and `legal.ts`.
  `expo-localization` is already a dependency, and voice already follows the device language
  (`src/lib/voice/language.ts`).
- **How:** start by extracting strings. Legal translations need care, because Play fetches the policy.

### 15. More unit tests — S
- **Gap:** these pure modules have no tests: `src/lib/validation/task.ts`, `src/lib/url.ts`,
  `src/lib/color.ts` and `src/components/meds/dose-format.ts`. Offline write replay
  (`src/lib/mutation-defaults.ts`) is the riskiest untested code.
