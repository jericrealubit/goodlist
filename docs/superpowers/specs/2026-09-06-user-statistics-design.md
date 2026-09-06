# User statistics

## Context

The app has no view of itself as a community. Every query in
`src/lib/queries/` is scoped to the signed-in user by RLS, and `profiles`
deliberately exposes only the caller's own row (plus household-mates', for
member lists). There is no existing way to ask "how many people use this?"

The ask: show current live users, total registered users, and the split
between people using Goodlist solo, in 1 group, and in 2 groups.

## Goals

- Five community-wide numbers, visible to any signed-in user: live now, total
  registered, and the 0/1/2-group breakdown.
- No user is identifiable from any of it — counts only.
- Works with the 9 themes already in the app, in light and dark.

## Non-goals

- Per-user analytics, retention curves, or history. Presence is a single
  overwritten timestamp, not an event log.
- An admin-only view. These numbers are for everyone; nothing here is
  privileged.
- Cross-device presence. A user with two devices open counts once, because
  presence lives on their profile row, not their session.

## Design

### Reading past RLS, safely

`profiles` RLS blocks reading other users' rows, which is exactly what a
community count needs. Rather than loosen the policy, `app_user_stats()` is a
`security definer` function that counts past RLS and returns **only
aggregates** — no id, name, or timestamp for anyone. It is the one sanctioned
crossing of that line, and the aggregate-only return is what makes it safe.

Two guards on top:

- `revoke execute … from public` then `grant … to authenticated`. Postgres
  grants EXECUTE to PUBLIC by default, which would have exposed the counts to
  the anon key.
- An `auth.uid() is null` check inside, so the function refuses a signed-out
  caller even if a grant is ever loosened by mistake.

`touch_last_seen()` is deliberately **not** `security definer`: the caller
already owns their profile row under the existing update policy, so it needs
no elevated privilege. Its reason to exist is that `now()` is the *server's*
clock — a client-supplied timestamp could fake being live.

### Presence

`profiles.last_seen_at` is stamped by a 60s heartbeat while the app is
foregrounded (`usePresenceHeartbeat`, mounted from `(app)/_layout.tsx` so it
covers everyone with the app open, not just whoever is on the stats screen).
The server counts anyone seen inside a 2-minute window — twice the heartbeat,
so one dropped beat doesn't blink a user out of the count.

The window is **returned by the RPC** (`live_window_seconds`) rather than
hardcoded on the client, so the screen's "active in the last 2 minutes"
caption cannot drift from the query that produced the number.

`last_seen_at` is intentionally **not indexed**: the stats query aggregates
over every profile row (it needs the total anyway) so an index would go
unused while making each heartbeat write more expensive. The one index added
is `family_members(user_id)` — the existing `(family_id, user_id)` primary key
can't serve a lookup keyed on `user_id` alone, which both the group-count
aggregate and the existing "my memberships" query in `queries/group.ts` need.

### The chart

Form follows the data's job:

| Number | Form | Why |
|---|---|---|
| Live now | hero figure (48px) | the one number the screen leads with |
| Registered, Sharing | KPI row of stat tiles | headline numbers, not a chart |
| 0 / 1 / 2 groups | horizontal stacked bar + labelled rows | part-to-whole over an ordered scale |

The buckets are an **ordered** scale (0 → 1 → 2), so they get a sequential
ramp — one hue, weak to strong — not three categorical colors, which would
imply the buckets are unrelated.

Building that ramp is the one genuinely tricky part. A fixed wash fraction
cannot work: the app ships 9 themes whose `primary` sits anywhere from 2.5:1
to 10:1 against its own card, so the same 60% wash that reads correctly on one
theme dissolves into the card on another. Measured against each theme's real
surface, a fixed 0.6/0.3/0 ramp put the pale end below a 2:1 contrast floor in
**8 of 9 themes**.

The shipped ramp instead spans `primary` in both directions:

- weakest — `washToSurface(primary, surface)`: the palest step that still
  clears 2.3:1 against that theme's own card, snapped in 5% increments
- middle — `primary`
- strongest — `mixHex(primary, text, 0.4)`

Verified with the dataviz skill's `validate_palette.js` in `--ordinal` mode,
run against each theme's actual `backgroundElement`: all 9 pass monotone
lightness, adjacent-ΔL separation, single-hue spread, and the light-end
contrast floor (2.31:1 – 2.50:1).

Identity never rests on color alone — each row carries a swatch, a label, the
exact count, and the share, so the rows are the legend and the table view at
once. That is what lets the bar itself stay thin (14px), unlabelled, and
hidden from screen readers rather than announced twice.

## Privacy

Storing a "last seen" timestamp is new background collection, which the
privacy policy previously (accurately) said the app did none of. Clause 2 now
describes it — one timestamp, overwritten, never a history — and clause 3 adds
the community-totals use. `src/app/(app)/privacy.tsx` was updated in the same
change rather than left to drift.

## Verification

- Whole `supabase/schema.sql` runs clean on PostgreSQL 16 against a stubbed
  `auth` schema; `app_user_stats()` returns exactly the expected
  `6 | 4 | 3 | 2 | 1 | 120` over a fixture of 6 users built through the app's
  own `create_household`/`join_household` RPCs.
- `touch_last_seen()` writes only the caller's row, under RLS, as the
  `authenticated` role; `anon` is refused by the grant; a null `auth.uid()`
  raises.
- Palette validated per theme as described above; `mixHex`/`washToSurface`/
  `formatCount`/`formatShare` checked against edge cases (clamping, K/M
  rollover, sub-1% shares, zero totals).
- Chart geometry rendered and eyeballed at four data shapes (typical, a
  near-empty bucket, a single bucket, no users) in a light and a dark theme.
