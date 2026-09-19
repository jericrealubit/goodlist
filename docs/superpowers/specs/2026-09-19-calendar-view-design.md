# Calendar view

## Context

Goodlist has stored a due date on every task since the first release. `tasks.due_at` is a
`timestamptz`; it is carried through `Task`, all three input types and every mutation; the task
editor sets it with a platform-split date picker; and since the voice release a spoken phrase can
set it too ("buy milk tomorrow").

Nothing in the app shows those dates *as time*. A due date surfaces only as six grey characters
under a title — `Due Sep 19`, rendered by `formatDueDate` in `src/components/task-row.tsx`. You
cannot see what a week looks like, cannot notice that four things land on Thursday, and cannot move
something to another day without opening the task editor and operating a date picker.

The data has been there all along. The view has not.

The task-by-task build is in
[`docs/superpowers/plans/2026-09-19-calendar-view.md`](../plans/2026-09-19-calendar-view.md).

### A note on sources

`AGENTS.md` requires reading the versioned SDK 57 docs before writing code. Unlike when the voice
spec was written, `docs.expo.dev` **was reachable** for this work, and was read directly. It
confirmed that SDK 57 ships both a Calendar and a Notifications module — neither of which this
feature uses — and that `@expo/ui` (already installed, imported nowhere) offers date and time
pickers but **no month-grid primitive**. So the grid is hand-rolled.

## Goals

- Show open tasks on the days they are due, at a month's glance.
- Let a task be given a day, moved to another day, or have its date cleared, without leaving the
  calendar.
- Make the tasks that have *no* date visible and schedulable, since that is almost all of them.
- Add no dependency, no permission, no native module, and no new server call.
- Work offline and in all nine themes, like everything else here.

## Non-goals

- **Device-calendar sync (`expo-calendar`).** A native module and a `READ_CALENDAR`/`WRITE_CALENDAR`
  permission, which means a device-filter review, a Data Safety re-answer and new privacy-policy
  text — the exact sequence the microphone cost. `Goodlist — Project Plan.md:235` already defers
  "Calendar synchronization".
- **Reminders or push.** `expo-notifications` is not installed, and the existing "notifications" are
  in-app database rows with a tab badge — they cannot deliver anything to a device. The product plan
  pencils reminders in as a *Premium* capability (line 485) and says to "begin with in-app
  indicators" (line 597).
- **Week and agenda views.** The same data at a different zoom; worth having, not worth having first.
- **Drag-to-reschedule.** See *Design*; tapping is both simpler and more accessible.
- **Completed tasks on the grid.** The calendar is about what is still to do.

## Design

### One query, bucketed on the client

`listOpenTasks()` in `src/lib/queries/tasks.ts` is already unbounded — no date filter, no limit, no
pagination — and is already offline-persisted and realtime-invalidated. So the calendar needs **no
new query**: it is a `useMemo` over `useOpenTasksQuery()`, grouped by local day. That inherits
offline-first and live updates rather than rebuilding them, and it means the month renders from
cache with no connection.

If open tasks ever stop being bounded in practice, the seam is a `listTasksInRange()` beside
`listOpenTasks` and a `taskKeys.range` key — kept under the `['tasks', …]` prefix, which
`useRealtimeTasks` invalidates wholesale, so live updates would come free. There is no index on
`due_at` today; that is when to add one.

### The date module — `src/lib/calendar/` (new)

Pure and dependency-free, like `src/lib/voice/`, so `node --test` runs it directly:

| File | Exports |
|---|---|
| `day.ts` | `DayKey`, `toDayKey`, `fromDayKey`, `startOfLocalDay`, `addDays`, `addMonths`, `isSameLocalDay`, `isOverdue`, `withDueTime`, `DUE_HOUR` |
| `month.ts` | `MonthCell`, `MonthGrid`, `buildMonthGrid`, `monthLabel`, `CELL_COUNT` |
| `bucket.ts` | `Schedulable`, `DayBuckets`, `bucketByDay` |

Three decisions inside it are load-bearing.

**Days are local, and keyed as `YYYY-MM-DD`.** `due_at` is a UTC instant, and three writers bake
three different times into it: the web picker writes local midnight, the native picker carries
whatever o'clock it was when it opened, and `parse-when.ts` writes 09:00. Slicing the ISO string
puts a web-created task on the *previous* day anywhere east of UTC —
`src/components/due-date-picker.web.tsx:20-24` already documents that trap. Every day-level decision
goes through `toDayKey`, which reads `getFullYear`/`getMonth`/`getDate`.

**Overdue compares days, never instants.** `YYYY-MM-DD` sorts lexicographically exactly as it sorts
chronologically, so `isOverdue` is a string comparison of two keys. The consequence is the valuable
part: *whichever of the three hours got stored cannot change whether a task reads as late.* A task
due today at local midnight is not overdue at 23:00.

**`addMonths` clamps.** A bare `setMonth` turns 31 January into 3 March. That bug is live today in
`parse-when.ts:161`, reachable via "next month"; it is out of scope here but is precisely why the
calendar's own month arithmetic does not use `setMonth`.

`addDays` is **duplicated** from `parse-when.ts` rather than extracted. That file's stated virtue is
importing nothing, it is pinned by its own suite, and sharing would couple two modules that have no
reason to change together — and would propagate the `setMonth` bug or force a behaviour change to a
file with no user-facing reason to change. Extract when a third consumer appears, guarded by both
suites.

### The grid — `src/components/calendar/month-grid.tsx` (new)

Six rows of seven cells at `flex: 1`, always 42 cells even when the month fits in five: a grid whose
height changes as you page makes everything below it jump, which reads as a bug rather than as a
shorter month. No `flexWrap` — it rounds inconsistently between React Native and react-native-web at
seven columns.

Each cell declares its height with `aspectRatio: 1` rather than measuring one. **That is why this
needs no `key={themeId}` remount.** The remount on the Tasks screen exists because `Sortable.Grid`
measures a row once and caches the height, so a theme with a different spacing scale leaves stale
heights. A flex-and-aspect-ratio grid re-flows in the same pass it repaints. The rule to carry
forward: the remount becomes required the moment something caches a measured size.

State rides a mark, never the numeral's colour — the rule `stat-tile.tsx` states outright, so a day
stays legible in all nine themes. Today is a ring at `max(cardBorderWidth, 2)`, which gives a
zero-border theme a visible ring while letting brutalist keep its 3px. Selected is
`backgroundSelected`, already proven across nine themes by `OptionPicker`. Tasks are up to three
dots, capped — a fourth, or a "+2", crowds a 44dp cell. Overdue turns the first dot `danger`.

### Scheduling by tapping, not dragging

Tap a task's date button to **arm** it; the grid becomes a day picker; tap a day to commit. Tapping
again or Cancel disarms.

Drag would be the obvious choice and is the wrong one. The Tasks screen's `handleMove` exists
because drag-to-reorder needed a screen-reader equivalent bolted on afterwards; here the accessible
path can simply **be** the path — one labelled `Pressable` per day, with no gesture to mirror. It
also sidesteps the rule that only `Sortable.Touchable` composes with a drag gesture, behaves
identically on web, and avoids introducing anything that caches a measured size.

While armed, every day's spoken label gains "tap to move here", so a screen reader hears what the
grid has *become* rather than only what it is.

### Writes reuse what exists

`useCreateTaskMutation` + `buildNewTaskInput` for "add on this day"; `useUpdateTaskMutation` for
move and clear. Both are already optimistic with rollback, and both already replay offline in
submission order. **No new `mutationKey`**, which matters: a key not registered in
`src/lib/mutation-defaults.ts` cannot resume after a relaunch, because a rehydrated mutation has
lost its closure-bound `mutationFn`.

A move sends only `id` and `due_at` — in `UpdateTaskInput`, `undefined` means "leave alone" and
`null` means "clear", so sending anything else would round-trip a value nobody edited.

### The read-only group needs less code than it looks

The `enforce_group_task_read_only` trigger names `due_at` explicitly, so moving a *requested* task in
a lapsed-Premium group raises. The calendar prevents it — no date button on those tasks — and does
**not** special-case the error, because the trigger raises a string character-identical to
`READ_ONLY_MESSAGE` and `getErrorMessage` returns `err.message` verbatim. The right sentence already
reaches the user through the ordinary path. The code says so in a comment, because otherwise someone
will later "fix" the missing check.

### One time of day

Of the three writers, only the native picker's carried-over time is non-deterministic, and it has to
go regardless. Both pickers now route through `withDueTime`, so every path writes **09:00 local** —
the hour `parse-when.ts` already used, meaning a spoken date and a tapped date finally agree.

This is about consistency and future display, not correctness: because `isOverdue` compares days,
the stored hour was never able to affect whether something read as late. Which is exactly why the
calendar did not have to wait for it.

## Risks

| Risk | Mitigation |
|---|---|
| The calendar opens empty, since the compose bar never sets a due date | The Unscheduled tray, which turns the empty calendar into the tool that fills it |
| A timezone bug puts tasks on the wrong day | Local-day keys throughout, pinned by a test that round-trips local midnight through `toISOString()` |
| A fifth tab crowds the bar | Five is the ceiling — Android Material degrades past it, iOS collapses to "More", and the web pill row does not wrap |
| Theme regressions in a brand-new grid | No measured heights, no hardcoded px/radius/border, state on marks not colour; nine-theme pass in the manual matrix |
| Moving a task in a lapsed group looks broken | Prevented up front, and the trigger's own message is already the right copy |

## Open decisions

1. **Week start.** Fixed at Sunday to match `Date.getDay()`. Deriving it from `expo-localization`
   (already a dependency, already read in `src/lib/device-locale.ts`) is a one-liner in the component
   layer whenever someone outside a Sunday-start locale complains. Owner's call.
2. **Completing from the calendar.** Deliberately absent — the row has no checkbox and a tap opens
   the editor. Adding it is easy; the question is whether the calendar should be a second place that
   completes things. Owner's call.
3. **The guide screenshots.** A fifth tab means regenerating all 19, because `tabBar()` in
   `scripts/generate-guide-screens.mjs` hardcodes four. Worth doing once the layout is settled on a
   device, not before.

## Alternatives considered

- **A calendar library** (`react-native-calendars` and similar). Would have supplied the grid, a
  week view and an agenda immediately. Rejected on the same reasoning the voice spec used to reject
  `chrono-node`: this repo's instinct is to add code it can test rather than a dependency it can't,
  and a themed grid that must survive nine palettes, three spacing scales and two zero-radius themes
  is exactly the thing a general library fights you on.
- **A date library** (`date-fns`, `dayjs`, `luxon`). The whole requirement is eleven small functions
  over local days, and they are now pinned by 31 tests. Not worth a dependency.
- **A modal day sheet** at `/calendar/[day]`. More room and a linkable URL, but it puts the day's
  tasks a navigation away from the month they belong to. Listing them beneath the grid keeps the
  relationship visible and removes a route.
- **Server-side date ranging.** Correct at scale and unnecessary now; `listOpenTasks()` is already
  unbounded and cached. Documented as the seam rather than built.
