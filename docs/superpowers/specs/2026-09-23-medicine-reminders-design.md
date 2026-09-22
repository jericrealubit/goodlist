# Medicine reminders & tracking

## Context

Goodlist tracks things you have to remember to do. A medicine is one of those things, but tasks
can't handle it. A task has one `due_at`, no recurrence, and no way to reach the phone. The
existing "notifications" are only in-app database rows with a tab badge. With a medicine, people
ask different questions: *did I take it this morning, am I missing doses, did Mum take hers?*

The task-by-task build is in
[`docs/superpowers/plans/2026-09-23-medicine-reminders.md`](../plans/2026-09-23-medicine-reminders.md).

### Decisions made with the owner

| Question | Decision |
|---|---|
| Where the data lives | Supabase, synced and offline-first like tasks |
| Price | Personal tracking and reminders are **free**. **Sharing with a group is Premium**, and the existing 90-day trial covers it |
| Where it lives in the UI | A **Meds** tab replaces the **History** tab. History becomes a stack screen at the same `/history` URL |

### Sources

`AGENTS.md` requires the versioned SDK 57 docs. `docs.expo.dev/versions/v57.0.0/sdk/notifications/`
was read directly, and `node_modules/expo-notifications/build/*.d.ts` was checked against it. It
confirmed three things:

- iOS holds at most 64 pending local notifications.
- Web can't schedule local notifications.
- An action with `opensAppToForeground: false` is **silently dropped when the app has been
  killed**. That last one drives the action design below.

## Goals

- Remind someone at each time they set, on the days they set, even if they don't open the app.
- Record each dose as taken or skipped with one tap, from the app or from the notification.
- Show today's doses and a 7-day adherence figure for each medicine.
- Let a Premium owner share a medicine with a group, read-only.
- Keep working offline, on web (without reminders), and in all nine themes.

## Non-goals (v1)

- **Refills and pill counts.**
- **Caregivers logging doses.** They can view; only the owner writes.
- **Exact alarms.** `SCHEDULE_EXACT_ALARM` needs a user grant on Android 14+, and Play restricts
  `USE_EXACT_ALARM` to alarm and calendar apps. A reminder a few minutes late is acceptable.
- **Push notifications.** Every reminder is scheduled locally, so the app needs no push token and
  no server sender.
- **Medication databases, interactions or dose checking.** This is a reminder and a record, not
  medical advice. The Terms and the Meds tab both say so.

## Design

### Data — two tables

`medications` stores the schedule as **local wall-clock times** (`times text[]` of `HH:MM`) plus
`days_of_week` (null means every day), `start_date`/`end_date`, `reminders_enabled`, `archived_at`
and `shared_family_id`. It also stamps the owner's IANA `time_zone`, so a caregiver reading "08:00"
knows whose clock it is.

`medication_doses` has one row per *answered* slot: `(medication_id, slot_date, slot_time)` is
unique, and `status` is `taken` or `skipped`.

**Missed is derived, never stored.** A slot with no row whose grace window (60 minutes) has passed
reads as missed. Nothing has to wake up on a server at 08:01 to write it, and a late "taken" just
fills the gap.

**Logging is an upsert on the slot.** A "Taken" from the notification, a tap in the app, and a
replayed offline mutation all land on the same row. The upsert omits `id`, so a conflict can't
rewrite the row's primary key.

### Why slots are wall-clock, not instants

A person takes a tablet at breakfast wherever breakfast is. Storing `HH:MM` and building each slot
with local `Date` constructors keeps 08:00 at 08:00 across DST changes and travel. Tasks go the
other way: `due_at` is an instant, which is why the calendar needs `toDayKey`. The medicine module
reuses `toDayKey`/`fromDayKey`/`addDays` from `src/lib/calendar/day.ts`. It is their third
consumer, so this module imports them instead of duplicating them.

### RLS and the Premium gate

- The owner has full CRUD on their own medicines and doses. A dose insert must also point at a
  medicine the caller owns.
- The shared read goes through the `SECURITY DEFINER` helper `can_view_medication(id)`. A viewer
  can read a medicine when all of these are true:
  - it has a `shared_family_id`
  - the viewer is a member of that group
  - the **owner is still a member**
  - `user_has_premium(owner)` is true

  Leaving the group or letting Premium lapse hides the medicine with no row edit, which mirrors
  how read-only groups work. Clients can't call `user_has_premium`, so the check has to sit behind
  a definer function.
- `enforce_medication_sharing` refuses to **start** or **move** sharing without Premium. It raises
  `PREMIUM_REQUIRED…`, which the existing `isPremiumRequiredError` recognises. It does not check
  edits to a medicine that is already shared, so a lapsed owner can still edit or un-share it.

### Pure logic — `src/lib/medications/`

This module is node-testable like `src/lib/calendar/`: explicit `.ts` imports and erasable
TypeScript only.

| File | Exports |
|---|---|
| `schedule.ts` | `parseTime`, `formatTime`, `normalizeTimes`, `isScheduledOn`, `slotsForDay`, `slotsForDayAll`, `daysEndingOn` |
| `adherence.ts` | `MISSED_GRACE_MINUTES`, `slotKey`, `indexDoses`, `slotStatus`, `adherence` |
| `reminder-plan.ts` | `REMINDER_PREFIX`, `REMINDER_LIMIT`, `reminderIdentifier`, `isActiveOn`, `planReminders`, `diffReminders` |

The adherence calculation leaves out slots that are still upcoming or inside their grace window.
Counting them as missed would punish someone because it is 07:59. Days with no slots don't break a
streak.

### Reminders — repeating triggers, reconciled by diff

Each medicine time becomes a `DAILY` trigger, or one `WEEKLY` trigger per weekday. Repeating
triggers keep firing even if the app isn't opened for a month. The cost is that a repeating trigger
can't know a dose was already logged early. For a medicine, an unneeded nudge is the right side to
err on.

Identifiers are deterministic (`med:{id}:{weekday|*}:{HH:MM}`), and each request carries a content
`signature` in `data`. `syncReminders` computes `planReminders` → `diffReminders` against
`getAllScheduledNotificationsAsync()`, so an unchanged list schedules and cancels nothing, and a
rename reschedules exactly the reminders it touched. Snoozes (`snooze:*`) are outside the diff.

Repeating triggers can't express a start or end date. So `useMedicationReminders`, which is mounted
in the signed-in layout, re-syncs whenever the medicines cache changes and **each time the app comes
to the foreground**. That sync retires a finished course and starts one that has reached its start
date.

The plan caps at **60** reminders (the iOS limit of 64, minus 4 kept for snoozes). It keeps daily
reminders first, since one daily trigger covers seven weekly ones. The Meds tab tells the user when
something doesn't fit.

**Both actions open the app.** An action with `opensAppToForeground: false` is dropped when the
app has been killed, and a "Taken" that is never recorded is worse than a screen that opens for a
second. Taken logs through the ordinary persisted mutation, so it is queued if the phone is offline.
The launch response and the live listener can both report the same tap, so they are de-duplicated.

Permission is requested **in context**, the first time a medicine is saved with reminders on, never
at launch. If permission is denied, the Meds tab shows a banner linking to OS settings, and tracking
works as before. Signing out cancels every `med:*` and `snooze:*` notification. Without that, the
next person to sign in on the phone would see the last person's medicine names on the lock screen.

`src/lib/reminders.web.ts` is a no-op twin, so web builds without the native module and says plainly
that reminders arrive on the phone app.

### UI

- **Tabs.** Meds (`pills` / `medication`) takes History's slot. Five tabs is the ceiling (see the
  calendar spec). History moved to `src/app/(app)/history.tsx` with a stack header. Its URL is still
  `/history`, so voice "open history" and every existing `router.push('/history')` keep working. It
  is also linked from Settings → Help.
- **Meds tab** (`src/components/meds/meds-view.tsx`) has three sections:
  - *Today*: slots in time order, each with **Skip** and **Taken** buttons at least 44dp tall, and
    **Undo** once a slot is logged.
  - *Your medicines*: the schedule plus the 7-day figure and streak.
  - *\<Name\> · shared with you*: read-only.

  Status rides a **mark**, never the text colour (the `stat-tile.tsx` rule):
  - filled primary: taken
  - filled `danger`: missed
  - filled secondary: skipped
  - primary ring: due
  - border ring: upcoming

  A minute clock held in state moves slots from due to missed and rolls "today" over at midnight,
  because render can't read the clock under the React Compiler rules.
- **Editor** (`/medication/[id]`, a modal like `/task/[id]`) has these fields:
  - name, dose and instructions
  - times, using a native `DateTimePicker` in time mode or `<input type="time">` on web
  - Every day / Some days, with weekday chips
  - start and last day, through `DueDatePicker`, which now takes `name` and `placeholder`
  - a reminders switch
  - **Who can see it**, which shows a Premium upsell when sharing would start without Premium

  An existing medicine also gets *Stop taking (keep history)* (archive) and a two-step delete.

### Mutations

Five new keys: `['medications', 'create' | 'update' | 'delete' | 'logDose' | 'clearDose']`. All are
optimistic with rollback and share one scope, `medications-queue`, so a Taken followed by an Undo
can't replay reversed. **All are registered in `src/lib/mutation-defaults.ts`**, because otherwise a
paused mutation can't resume after a relaunch. Dose optimism writes to every cached dose window
(`setQueriesData` on the `['medications', 'doses']` prefix). `useRealtimeMedications` invalidates
the whole `['medications']` prefix on a change to either table.

## Risks

| Risk | Mitigation |
|---|---|
| A reminder doesn't arrive (permission off, OS batching, phone off) | Banner when permission is off. Terms and the Meds tab say not to rely on reminders alone |
| A dose is logged against the wrong day | Wall-clock slots and local day keys. A snooze pins `day` so 23:55 snoozed past midnight answers the right night. Pinned by tests across time zones |
| Duplicate or stale notifications after edits | Deterministic ids with a content signature, reconciled by diff on every change and on foreground |
| Health data exposure | Private by default, and sharing is per medicine and opt-in. The privacy policy, the Data Safety **Health info** declaration and account deletion all cover it |
| A caregiver keeps seeing a medicine after the owner leaves or lapses | Visibility is computed per read in `can_view_medication`, not stored |

## Open decisions (owner's call; defaults shipped)

1. **Grace window**: 60 minutes (`MISSED_GRACE_MINUTES`).
2. **Caregivers logging doses**: off. Turning it on needs an insert policy keyed on
   `can_view_medication` and a `logged_by` column.
3. **Exact alarms**: off.
4. **Guide screenshots**: `tabBar()` in `scripts/generate-guide-screens.mjs` still draws History.
   Regenerate once the Meds layout is settled on a device, as the calendar spec did.
5. **Android notification icon**: none is configured yet, so Android uses the app icon. Android
   needs a white-on-transparent monochrome PNG for the `expo-notifications` plugin's `icon`.

## Addendum — medicine verdicts on the calendar

Each past day on the Calendar tab carries **one corner mark summarising every medicine that day**:
✓ (primary) all taken, ✗ (`danger`) at least one missed, – (secondary) nothing missed but at least
one skipped. Skipped has its own mark because a doctor can say to skip, and an ✗ would call that a
failure. No mark when nothing was scheduled, on a future day, or while any dose is still upcoming or
inside its grace window — a ✓ at 09:00 that the evening dose can still turn into an ✗ would be a lie.

- A **glyph in the corner, not a dot**: on a past day a task dot means *overdue* (bad), a ✓ means
  *taken* (good), and the two must never be confused. Shape carries the verdict; colour only
  reinforces it. The day's spoken label gains e.g. "medicines: 1 missed, 2 taken".
- **Own medicines only** — shared ones live on the Meds tab.
- Doses are fetched for exactly the 42 visible cells (`useDosesQuery(first, last)`), and not at all
  when the whole grid is in the future.
- The selected day lists its doses (time, name, status glyph) with a link to Meds to log them; the
  calendar itself stays read-only for doses.
- Logic: `summarizeDay` / `describeDaySummary` in `src/lib/medications/day-summary.ts`, with tests.
