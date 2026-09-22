# Medicine reminders implementation plan

> **For agentic workers:** implement this plan one task at a time, in order. Steps use checkbox
> (`- [ ]`) syntax for tracking. The design behind it is
> [`docs/superpowers/specs/2026-09-23-medicine-reminders-design.md`](../specs/2026-09-23-medicine-reminders-design.md).
> Read it first; this file assumes its decisions.

**Goal:** Remind someone to take each medicine, record every dose, show how well the schedule is
being kept, and, on Premium, let a group see it.

**Architecture:**
- Two new tables with RLS, plus a definer helper and a trigger for the Premium gate.
- A pure, node-tested module turns medicines into dose slots, statuses, adherence and a reminder
  plan.
- The data layer mirrors tasks: optimistic, persisted and realtime-invalidated.
- `expo-notifications` schedules repeating local reminders, reconciled by diff.

## Global constraints

- **Slots are local wall-clock `HH:MM` strings.** Never store or compare a dose slot as a UTC
  instant.
- **`src/lib/medications/*.ts` import only each other and `../calendar/day.ts`**, with explicit
  `.ts` extensions and erasable TypeScript only.
- **Every new `mutationKey` is registered in `src/lib/mutation-defaults.ts`.**
- **Never write "missed" to the database.** It is derived.
- **No hardcoded px, radius or border in themed UI.** Status rides a mark, never the text colour.
- **No `SCHEDULE_EXACT_ALARM`, no push token.**

## Verification, per task

```bash
npx tsc --noEmit   # after `npx expo start` has regenerated typed routes for new screens
npm run lint
npm test           # also with TZ=Pacific/Auckland and TZ=America/Los_Angeles
```

---

## Stage 1 — Tracking

### Task 1: Schema
**Files:** `supabase/schema.sql` (new section at the end)

- [x] `medications` and `medication_doses`, with check constraints matching `parseTime` and the
      weekday range.
- [x] `can_view_medication()` (definer) and select policies for the owner or a shared group member.
- [x] `enforce_medication_sharing` trigger raising `PREMIUM_REQUIRED…`.
- [x] Both tables added to `supabase_realtime`.
- [ ] **Apply to the Supabase project** (SQL editor). The client expects these tables.
- [ ] Verify with two accounts:
  - a non-member can't read a medicine
  - a member sees a shared one only while the owner has Premium or a trial
  - sharing without Premium raises
  - leaving the group hides the medicine
  - `delete_my_account` removes everything (cascade from `auth.users`)

### Task 2: Pure module
**Files:** `src/lib/medications/{schedule,adherence,reminder-plan}.ts` and a `*.test.ts` for each

- [x] Slots, statuses, adherence with streak, and a reminder plan with its diff.
- [x] Tests cover:
  - DST in both hemispheres
  - course boundaries and weekday filtering
  - the grace window
  - an evening dose after midnight
  - the 60 cap
  - a rename rescheduling only what it touched

### Task 3: Data layer
**Files:** `src/lib/types.ts`, `src/lib/queries/medications.ts`, `src/lib/mutations/medications.ts`,
`src/lib/query-client.ts`, `src/hooks/use-medications-query.ts`,
`src/hooks/use-medication-mutations.ts`, `src/hooks/use-realtime-medications.ts`,
`src/lib/mutation-defaults.ts`

- [x] Five mutation keys on one scope, all registered.
- [x] Dose logging is an upsert on the slot, with no `id` in the payload.

### Task 4: Meds tab, editor, and the History move
**Files:**
- `src/app/(app)/(tabs)/meds.tsx`
- `src/components/meds/*`
- `src/app/(app)/medication/[id].tsx`
- `src/app/(app)/history.tsx` (moved from `(tabs)/`)
- `src/app/(app)/_layout.tsx`
- `src/components/app-tabs{,.web}.tsx`
- `src/app/(app)/(tabs)/settings.tsx`
- `src/components/due-date-picker{,.web}.tsx` (new `name` and `placeholder` props)
- `src/constants/icons.ts`

- [x] Today / Your medicines / Shared with you, with Taken, Skip and Undo.
- [x] Editor with times, days, start and last day, reminders, sharing, archive and delete.
- [x] History is a stack screen at `/history`, linked from Settings.
- [ ] Nine-theme visual pass of the Meds tab and the editor, on a device and on web.

## Stage 2 — Reminders

### Task 5: Notifications
**Files:** `package.json` (`expo-notifications`), `app.json` (plugin), `src/lib/reminders.ts`,
`src/lib/reminders.web.ts`, `src/hooks/use-medication-reminders.ts`,
`src/components/meds/reminder-status-banner.tsx`, `src/contexts/session-context.tsx`

- [x] Channel, handler, and a category with Taken and Snooze. Both actions open the app.
- [x] Sync on change and on foreground. Handle the launch response and the live listener without
      double-handling.
- [x] Permission asked when a medicine is saved with reminders on. A banner shows when permission
      is denied or unsupported, or reminders overflow the cap.
- [x] Signing out cancels every reminder and snooze.
- [ ] **New EAS development build** (native module): `eas build --profile development --platform android`.
- [ ] On a device, check each of these:
  - the prompt appears on first save
  - the reminder fires
  - Taken logs the dose with the app killed
  - Snooze fires again after 10 minutes
  - editing the times leaves no duplicates in `getAllScheduledNotificationsAsync()`
  - archiving cancels the reminders
  - signing out clears them
- [ ] Monochrome Android notification icon, then set `icon` in the plugin config.

## Stage 3 — Sharing (Premium)

- [x] The server gate (Task 1) and the editor's "Who can see it" with its Premium upsell.
- [x] "\<Name\> · shared with you" section on the Meds tab.
- [ ] Two-account check, including lapse behaviour (use an expired `trial_ends_at` on a test user).

## Stage 4 — Compliance and docs

- [x] `src/content/legal.ts` updates:
  - Privacy: a *Medicines* entry under "what we collect", and a sharing paragraph
  - Deletion: medicines added to the list
  - Terms: *not medical advice*
  - Effective date bumped
- [x] `docs/play-store-listing.md`: the **Health info** declaration and a notifications note.
- [ ] `npm run legal:site` **in the release that ships this**, so the public policy never
      describes a feature before it exists.
- [ ] Guide screenshots: update `tabBar()` in `scripts/generate-guide-screens.mjs` (Meds in place
      of History), add a Meds screen, then run `npm run guide:screens` and `npm run guide:site`.
- [ ] Play Console: complete the Data Safety **Health info** declaration before rollout.

## Stage 5 — Calendar verdicts

- [x] `src/lib/medications/day-summary.ts` + tests (✓ / ✗ / – / none).
- [x] `MonthGrid` `medsByDay` prop: corner glyph and spoken label.
- [x] `CalendarView`: month-ranged dose query, verdict map, the selected day's doses.
- [ ] Nine-theme pass on the grid: the corner glyph must not touch the numeral at the smallest cell width.
