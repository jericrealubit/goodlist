# Calendar view implementation plan

> **For agentic workers:** implement this plan task-by-task, in order. Steps use checkbox
> (`- [ ]`) syntax for tracking. The design behind it is
> [`docs/superpowers/specs/2026-09-19-calendar-view-design.md`](../specs/2026-09-19-calendar-view-design.md)
> — read it first; this file assumes its decisions.

**Goal:** Show open tasks on the days they are due, and let someone schedule an undated task, add a
task to a day, or move one to another day — without leaving Goodlist and without a new permission.

**Architecture:** No new query, no new mutation key, no schema change. A pure date module
(`src/lib/calendar/`) turns `Task[]` into a 42-cell month grid bucketed by **local** day; a
presentational `MonthGrid` renders it from theme tokens; the screen dispatches into the **existing**
`useCreateTaskMutation` and `useUpdateTaskMutation`. Grouping is a `useMemo` over
`useOpenTasksQuery()`, so offline persistence and realtime invalidation come free.

**Tech stack:** Expo SDK 57 / React Native 0.86, TypeScript, Expo Router typed routes. **No new
dependency** — no date library, no calendar library. Tests run on Node's built-in runner with native
type stripping, exactly as `src/lib/voice/` does.

## Global constraints

- **Never bucket with `due_at.slice(0, 10)`.** `due_at` is a UTC instant; three entry points bake
  three different times into it. Every day-level decision goes through `toDayKey()`.
- **`src/lib/calendar/*.ts` imports nothing** — no React, no `@/` aliases, no Expo. Imports *inside*
  the folder carry explicit `.ts` extensions.
- **Erasable TypeScript only in tested files.** No `enum`, no namespaces, no parameter properties.
- **No new `mutationKey`.** A key not registered in `src/lib/mutation-defaults.ts` cannot resume
  after a relaunch.
- **No hardcoded px, radius or border.** `spacing.three` is 20 on minimalSage and 12 on brutalist;
  radii are zero on swissMonochrome and brutalist; `borderWidth` is 3 on brutalist.
- **Status rides a mark, never the text colour** — the `stat-tile.tsx` rule.
- **No new native module and no new permission.** This is not `expo-calendar`.

## Verification, per task

```bash
npx tsc --noEmit    # also regenerates typed routes
npm run lint
npm test
```

`npm run lint` currently dies on this Windows checkout with "Cannot find native binding" from
`unrs-resolver` — a missing MSVC runtime, not the npm optional-dependency bug the message suggests.
The workaround is a throwaway eslint config outside the repo with every `import/*` rule off, which
still runs the React Compiler rules that actually catch things here. The lint baseline is **zero**.

---

## Stage 1 — A month you can read

Ships on its own: page through months, see which days carry tasks and which are overdue, tap a day
to read its tasks, tap a task to open the existing editor. Zero writes, zero new server calls, works
offline from the persisted cache.

### Task 1: Local-day primitives
**Files:** create `src/lib/calendar/day.ts`, `src/lib/calendar/day.test.ts`

- [x] **Step 1:** `addMonths` clamps the day-of-month rather than using `setMonth`, which turns
      31 January into 3 March. That bug is live in `parse-when.ts:161` — out of scope, but the
      reason this function exists in this shape.
- [x] **Step 2:** `isOverdue` compares two `YYYY-MM-DD` keys as strings, which sort
      lexicographically exactly as they sort chronologically. The stored hour therefore cannot
      affect whether a task reads as late — the most valuable consequence of the key format.
- [x] **Step 3:** Tests built from local constructors only, never epoch numbers, so the suite passes
      in any `TZ`. The load-bearing one round-trips local midnight through `toISOString()` and
      asserts the day does not move.

One shipped detail: `fromDayKey` rejects a day the month doesn't have (`2026-02-31`) rather than
letting it roll into March, which `new Date(y, m, d)` would do silently.

### Task 2: Month grid maths
**Files:** create `src/lib/calendar/month.ts`, `month.test.ts`

- [x] **Step 1:** Always 42 cells, even for a month that fits in five rows.
- [x] **Step 2:** Weekday labels from `toLocaleDateString`, rotated for `weekStart`. Locale-aware
      labels, locale-agnostic logic.
- [x] **Step 3:** Tests pin 42 cells across short, long and Sunday-starting months, the leap
      February, and — the one that catches anyone reaching for `+ 86_400_000` — a month spanning a
      DST spring-forward whose cells still run consecutively.

Shipped detail: the reference Sunday for the labels is found by walking back from a fixed date with
`getDay()`, rather than hardcoding a date and hoping it is a Sunday.

### Task 3: Bucketing
**Files:** create `src/lib/calendar/bucket.ts`, `bucket.test.ts`

- [x] **Step 1:** One pass; `due_at === null` goes to `unscheduled`.
- [x] **Step 2:** Sort within a day by the due instant, with `sort_order` breaking ties only — it is
      negative epoch seconds carrying the manual drag order and is orthogonal to dates.
- [x] **Step 3:** Tests: undated lands in `unscheduled` and no day; three tasks stored at three
      different hours on one local day share a bucket; `overdue` excludes today.

Shipped detail: an unparseable `due_at` is treated as undated rather than dropped, so a bad row is
visible instead of silently missing.

### Task 4: The grid component
**Files:** create `src/components/calendar/month-grid.tsx`

- [x] **Step 1:** Six rows of seven `flex: 1` cells, `aspectRatio: 1`, no `flexWrap`, capped at 420px
      wide so a square seventh of `MaxContentWidth` doesn't become a 640px-tall grid on web.
- [x] **Step 2:** Today a ring at `max(cardBorderWidth, 2)`; selected `backgroundSelected`; up to
      three dots for tasks; overdue turns the first dot `danger`; out-of-month text `textSecondary`
      with no opacity.
- [x] **Step 3:** Each cell a labelled `Pressable`; the dot row decorative via
      `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`.
- [x] **Step 4:** **No `key={themeId}`** — nothing here measures. The Tasks screen needs that remount
      because `Sortable.Grid` caches a measured row height; this re-flows as it repaints. Add it the
      moment anything starts caching a measured size.

### Task 5: The screen
**Files:** create `src/components/calendar/calendar-view.tsx`

- [x] **Step 1:** `useOpenTasksQuery()` + `useRealtimeTasks()`, memoised through `bucketByDay` and
      `buildMonthGrid`.
- [x] **Step 2:** The repo's universal branch — `isLoading` → `LoadingState`, `error` → `EmptyState`
      with Retry, else the content.
- [x] **Step 3:** Month label with previous/next buttons; grid; overdue line that jumps to the oldest;
      selected-day list; Unscheduled tray.
- [x] **Step 4:** `bottomInset + Spacing.four` — never zeroed, or outlined and elevated themes clip.

Shipped detail: `now` is read once with a lazy `useState` initialiser rather than in the render body,
which is the pattern the React Compiler rules flag. The cost is that "today" doesn't move if the app
is left open across midnight. Also: `EmptyState` is `flex: 1`, so it collapses inside a ScrollView —
the empty day uses a plain text line instead.

### Task 6: Register the tab
**Files:** create `src/app/(app)/(tabs)/calendar.tsx`; modify `app-tabs.tsx`, `app-tabs.web.tsx`,
`src/constants/icons.ts`

- [x] **Step 1:** Route file is a five-line wrapper using `useTabScreenInsets()`, which keeps
      placement a one-file decision.
- [x] **Step 2:** Native trigger with `sf={{ default: 'calendar', selected: 'calendar' }}`
      `md="calendar_month"`.
- [x] **Step 3:** Web trigger with `href="/calendar"`. Forgetting this file is the classic bug — the
      native tab works and the web build routes to nothing.
- [x] **Step 4:** `ActionIcons.dueDate` is already `calendar-outline`, and one glyph means one action
      in that file, so the tab gets `calendarView: 'calendar-number-outline'`.
- [ ] **Step 5:** Check the web pill row at phone width. `CustomTabList` lays the brand logo plus
      every trigger in one row with **no `flexWrap`** inside `maxWidth: 800`. Needs a browser.

---

## Stage 2 — A day you can act on

Everything here reuses an existing mutation hook, so `mutation-defaults.ts` is untouched and offline
replay is inherited.

### Task 7: Create a task on a day
**Files:** modify `src/components/calendar/calendar-view.tsx`

- [x] **Step 1:** Title field plus an Add button in the selected-day section, `validateTaskTitle`
      first, as `handleSubmitCompose` does.
- [x] **Step 2:** `buildNewTaskInput({ title, due_at: withDueTime(day).toISOString() })` through
      `useCreateTaskMutation`. The optimistic insert already carries `due_at`, so the dot appears
      before the network answers.
- [x] **Step 3:** On error the title is put back in the field rather than lost.

### Task 8: Reschedule by tapping
**Files:** modify `calendar-view.tsx`, `month-grid.tsx`

- [x] **Step 1:** One piece of state — `armed: Task | null`. While set, a banner names the task and
      offers Cancel, and the grid commits instead of selecting.
- [x] **Step 2:** The move sends **only** `id` and `due_at`; `undefined` means "leave alone" and
      `null` means "clear", so sending more would round-trip a value nobody edited.
- [x] **Step 3:** Clearing a date sends `due_at: null`, returning the task to the Unscheduled tray.
- [x] **Step 4:** `MonthGrid` takes a `labelSuffix`, so while armed every day's spoken label gains
      "tap to move here" — the screen reader hears what the grid has become. Light haptic on commit.

### Task 9: The read-only group
**Files:** modify `calendar-view.tsx`

- [x] **Step 1:** Prevent — compute `is_writable === false` per task via `useGroupsQuery()`, the way
      `task/[id].tsx` does, and offer no date button on those.
- [x] **Step 2:** Catch — deliberately **no** error-code check. The trigger raises a string
      character-identical to `READ_ONLY_MESSAGE` and `getErrorMessage` returns `err.message`
      verbatim, so the right sentence already arrives. A comment says why, or someone will "fix" it.
- [x] **Step 3:** No rollback work: `updateTaskMutationOptions.onError` restores `taskKeys.open`, and
      the calendar is a `useMemo` over it, so the card returns to its old day by itself.

### Task 10: One time of day
**Files:** modify `src/components/due-date-picker.tsx`, `due-date-picker.web.tsx`

- [x] **Step 1:** Both pickers route `onChange` through `withDueTime`, so every writer lands on 09:00
      local. The native picker's carried-over time was the only non-deterministic one and had to go
      regardless.
- [x] **Step 2:** `parse-when.ts` left alone — its `DEFAULT_HOUR` is already 9, so it already agrees,
      and changing it would move 43 pinned tests for no behaviour gain.

---

## Stage 3 — Saying so

### Task 11: The guide
**Files:** modify `src/content/guide.ts`, `guide-document.tsx`, `scripts/generate-guide-screens.mjs`;
run `npm run guide:screens`

- [x] **Step 1:** Add `'19-calendar'` to `ShotName`, the matching `require()` to `SHOTS`, and a
      `19-calendar` entry to `SCREENS`. `tsc` is the guard here: `SHOTS` is typed
      `Record<ShotName, number>`, so the union and the map cannot drift apart.
- [x] **Step 2:** A guide step in the plain second-person voice of its neighbours, placed after
      "Change a task" — the step that introduces due dates — so the calendar follows from them.
      `guide.ts` renumbers itself for the in-app and web renderings; `docs/user-guide/README.md`
      does not, and was renumbered by script (steps 8–16 became 9–17, plus every TOC anchor).
      `README.md`'s "16-step walkthrough" became 17.
- [x] **Step 3:** Run `npm run guide:screens` — 19 screens plus 4 product shots, all at 1266×2532.

**Look at the output; do not just run it.** The first pass produced three defects that only a visual
check catches, none of which any tool would have reported:

1. The red callout wrapped the whole grid, so `outline-offset` pushed it past the 390px frame and
   the step badge was half out of shot.
2. It therefore taught nothing — the guide's convention is that the dotted box shows *exactly where
   to tap*, and a box around the entire grid points at everything.
3. The heading read "Friday 19 September" while the grid correctly placed 19 in the **Sat** column.
   19 September 2026 is a Saturday; the mock stated a falsehood.

Fixed by moving "today" to the 17th — a Thursday, and an interior column, which resolves the
clipping, the badge position and the weekday at once — and by replacing a 📅 colour emoji with the
stroke SVG every other icon in these mocks uses.

> **Budget for this one.** `tabBar()` at `generate-guide-screens.mjs:247-252` hardcodes four tabs, so
> a fifth tab means editing that helper — which **regenerates all 19 screenshots plus the four
> product shots**. Review every image, not one. Worth doing once the layout is settled on a device,
> not before.

### Task 12: README, store listing, site
**Files:** modify `README.md`, `docs/play-store-listing.md`; run `npm run site`

- [x] **Step 1:** A Calendar bullet in the README features list.
- [x] **Step 2:** The calendar in the Play listing's feature copy — **no permission note, since this
      adds none**. Voice input was also missing from that list and was added at the same time.
- [x] **Step 3:** `npm run site` — reports "17 steps, 2 extra sections, 19 screenshots". Note it is a
      no-op until `guide.ts` or `legal.ts` changes, since it builds from those two modules and not
      from `README.md` or the Play listing.
- [x] **Step 4:** `src/content/legal.ts` deliberately untouched. An in-app view of data the app
      already stores and displays changes no collection, sharing or retention; editing it would bump
      `EFFECTIVE_DATE` and force a Play Data Safety recheck for nothing.

### Task 13: This spec and plan
- [x] Written, and kept updated in place as tasks land.

---

## Definition of done

- Every open task appears on its correct **local** day, including one set at local midnight from the
  web picker while the device is east of UTC.
- Paging months never changes the grid's height, and never drops or duplicates a day across a DST
  boundary.
- An undated task can be scheduled, a dated one moved or cleared, entirely by tapping — with a
  screen reader, start to finish.
- Moving a requested task in a lapsed-Premium group snaps back and says why, once.
- Every day state is legible in all nine themes and carried by a mark rather than a colour.
- `npx tsc --noEmit`, `npm run lint` and `npm test` are clean.

## Manual verification matrix

- [ ] Android: page months, tap days, schedule from the tray, move, clear a date.
- [ ] **Timezone:** device east of UTC, create a task with the *web* picker, confirm it lands on that
      day and not the day before. Then west of UTC.
- [ ] DST boundary and December→January: grid height constant, no dropped or duplicated dates.
- [ ] Screen reader: the whole schedule/move/clear flow with no gesture.
- [ ] Lapsed second group: moving a requested task snaps back, message shown once.
- [ ] All nine themes, light and dark — especially swissMonochrome and brutalist (radius 0) and
      minimalSage (border width 0).
- [ ] Web at phone width: five pills plus the brand logo still fit.
- [ ] Airplane mode: month renders from cache; a move queues and replays on reconnect.

## Deferred, deliberately

- Device-calendar sync and local reminders — both need a native module and a permission.
- Week and agenda views; `OptionPicker` is the idiomatic switcher when they are wanted.
- Drag-to-reschedule. If added, the host grid then *does* need `key={themeId}`, only
  `Sortable.Touchable` composes with the gesture, and `task-row.tsx:84-98` is the required
  non-gesture twin.
- Completing a task from the calendar.
- Requesting a task for someone else from a day — needs the assignee picker and writable-group rules
  the Tasks screen already encodes.
- Density shading; `washToSurface`/`mixHex` in `src/lib/color.ts` are the tools, never `opacity`.
- Server-side date ranging and a `due_at` index.
- Cross-timezone agreement: `due_at` is an instant, so "Friday" in UTC+8 buckets on Thursday for a
  reader in UTC−5. Fixing it means a date-only column and a migration.
- Fixing `parse-when.ts`'s `setMonth` overflow and extracting the shared date helpers.
- A shared `taskSubtitle(task, userId)` helper — the `From X` / `To Y` logic is now in three screens.
