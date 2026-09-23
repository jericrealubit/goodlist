# System status notice — runbook

A manual, developer-only banner shown above every screen (signed in or out) when Supabase usage
nears/hits a tier limit. There is no automatic detection — Supabase doesn't expose that to the
client — so this is a remote flag you flip by hand.

Backed by the singleton table `public.system_status` (see `supabase/schema.sql`), polled read-only
by the app every few minutes.

## Turn a notice on

Supabase SQL editor:

```sql
update public.system_status
set message = 'Goodlist is temporarily read-only while we sort out a data issue. Sit tight!'
where id = true;
```

The message shows verbatim in the app within a few minutes (polling interval, see
`src/hooks/use-system-status-query.ts`).

## Turn it off

```sql
update public.system_status set message = null where id = true;
```

## One-time setup (already done if this table exists)

```sql
insert into public.system_status (id, message) values (true, null)
on conflict (id) do nothing;
```
