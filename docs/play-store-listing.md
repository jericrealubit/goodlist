# Google Play Console listing — copy-paste reference

Everything here is written to match `supabase/schema.sql` and the published Privacy
Policy/Terms exactly — if the app's data model changes, update this file *and*
`src/content/legal.ts` (then re-run `npm run legal:site`) before submitting an update.
Google cross-checks the Data Safety form against the privacy policy it can fetch, so a
disagreement between the two is a rejection.

See [`play-store-deployment.md`](./play-store-deployment.md) for the process and timeline.

## Store listing

**App name**
```
Goodlist
```

**Short description** (max 80 characters)
```
Personal tasks, alarms, medicine reminders, and a calendar for your household.
```
(78 characters)

This leads on the newest feature (task alarms) alongside medicine reminders and the calendar,
because they are what a search result has to earn a tap with. Older lines that still fit, if voice
or the solo-to-household framing should lead instead: `Personal tasks you can speak, see on a
calendar, and share with your household.` (79 characters) or `Personal tasks that stay simple
solo, and work together with your household.` (78 characters).

**Full description** (max 4000 characters)
```
Goodlist is a personal task list that starts simple and grows with you.

Sign up and start adding tasks in seconds — no household, no setup, no
friction. Every task you create is private to you by default.

Type a task, or tap the microphone and just say it: "Buy milk tomorrow"
becomes a task, due tomorrow. You see the words it heard before anything is
saved, and nothing is ever recorded — your own phone turns speech into text,
and Goodlist only ever receives the text.

Give a task a day and it turns up on the calendar, so you can see what's
coming instead of scrolling a list. Tap a day to see what is on it, and move
a task to another day with two taps. Turn on a task's alarm and your phone
rings at the exact time. Make a task repeat daily, weekly, monthly or on chosen days. Say "remind me to call the vet at 5pm" and it's
already on.

Add a medicine and Goodlist reminds you at every dose, right on your phone.
Mark each one taken or skipped with one tap, and see the week's adherence
at a glance. It's a reminder and a record, not medical advice.

When you're ready, create or join a household with a partner. You can then
send each other Requested tasks — clear, visible asks with a name attached,
so it's always obvious who asked for what and who's doing it. Your personal
tasks stay exactly as they were; nothing about going from solo to shared
changes what you already had.

FEATURES
• Personal tasks with optional notes and due dates
• A calendar view — a dot on every day with something due, red if it's overdue
• Move a task to another day with two taps
• An optional alarm on any task, right at its due time
• Repeating tasks — every day, week, two weeks, month, or the days you choose
• Track medicines and get a reminder at each dose, with Taken and Snooze
• Log every dose taken or skipped, and see your week's adherence
• Add tasks by speaking, including dates like "buy milk tomorrow"
• Tick off, undo or delete a task by voice — deleting always asks first
• A history of everything you've completed
• Optional household collaboration — create or join with an invite code
• Request tasks from another household member; they see your name on it
• Share a medicine with your household so they can see its schedule too
• Live updates — no need to refresh to see what's changed
• Delete your account and all of your data at any time, right from Settings
• Also on the web at goodlist.expo.app, with the same account (medicine
  reminders and task alarms are phone-only — a browser can't schedule them)

Goodlist is free. An optional Premium subscription lets you own a second
group or share a medicine with one. Whichever you do first starts a 90-day
free trial, no card needed.

Goodlist doesn't show ads, doesn't track you for advertising, and doesn't
sell your data. See our Privacy Policy for the specifics.
```

> **The published listing does not currently match the block above.** The live description
> opens "Goodlist is a simple, fast to-do list for your own tasks", is organised under CAPS
> section headings, and mentions neither voice nor the calendar — an older draft that predates
> this file. Pasting the block above replaces it wholesale, which is the intended direction:
> this file is the one that gets checked against the privacy policy. Replace it in one edit
> rather than patching the live copy, so the two stop diverging.

**Category**
```
Productivity
```

**Contact email**
```
jericrealubit@gmail.com
```

**Privacy Policy URL**
```
https://jericrealubit.github.io/goodlist/legal/privacy/
```

**Account deletion URL** (required — see the Data deletion section below)
```
https://jericrealubit.github.io/goodlist/legal/delete-account/
```

**Terms of Service URL** (optional for Play, useful in the listing)
```
https://jericrealubit.github.io/goodlist/legal/terms/
```

**Website / Support URL** (optional for Play, useful in the listing)
```
https://jericrealubit.github.io/goodlist/guide/
```
The plain-language user guide — the same walkthrough as the in-app Settings → Help screen,
generated by `npm run guide:site` from `src/content/guide.ts`.

All three are generated by `npm run legal:site` from `src/content/legal.ts` — the same module the
in-app Privacy Policy and Terms screens render from, so the reviewed policy and the shipped app
cannot disagree. **Turn Pages on before submitting:** repo Settings → Pages → Source: *Deploy from a
branch*, branch `main`, folder `/docs`. Load the URLs in a private window once to confirm.

## Release notes — the ringing alarms release

Pasted into **Release notes** on the closed-testing release in Play Console. `eas submit` does not
set these, so they are typed into the Console by hand, and rewritten for each release — the note
below replaces the repeating-tasks one, which follows it for reference.

Play caps this field at **500 characters per language**. The note below is 397; check it again if
you edit it. Drop the "Also:" line if the repeating-tasks release has already gone out.

```
What's new: alarms that keep ringing.

Task alarms and medicine reminders now ring loudly until you answer them: tap Stop alarm, Snooze 10 min, or Mark done / Taken. With Goodlist open the alarm fills the screen; closed, it rings again every few minutes for up to two hours.

Also: repeat any task with a due date, every day, week, 2 weeks, month, or on the days you choose.

Nothing new to allow.
```

**"Nothing new to allow"** — the only permission added is `MODIFY_AUDIO_SETTINGS` (from
`expo-audio`, for the in-app alarm sound), a normal install-time permission with no prompt.
Notifications were already asked for by Meds.

## Release notes — the repeating tasks release (previous, for reference)

Pasted into **Release notes** on the closed-testing release in Play Console. `eas submit` does not
set these, so they are typed into the Console by hand, and rewritten for each release — the note
below replaces the alarms one, which is in git history if it is ever wanted.

Play caps this field at **500 characters per language**. The note below is 372; check it again if
you edit it.

```
What's new: repeating tasks, and alarms.

Make any task with a due date repeat: every day, week, 2 weeks, month, or on the days you choose. The next few show on the calendar.

Turn on Alarm and your phone rings at the due time. Say "remind me to call the vet at 5pm" and it's already on.

No new permissions. Alarms use the notification permission from medicine reminders.
```

**No "New permission" line** — nothing new is asked for. `POST_NOTIFICATIONS` is already in the
manifest from the Meds release, and repeating tasks need no permission at all. The last line still
says so, for the tester who skipped Meds and meets the notification prompt here for the first
time — the same "don't let a permission prompt arrive unexplained" reasoning as every past
release. **The spoken example** carries the "remind me" phrasing verbatim so a tester can copy it
and see the alarm land on, not just read that it can.

Previous release, for reference:

```
What's new: Meds.

Track a medicine and Goodlist reminds you at every dose, right on your phone. Tap Taken or Snooze right on the reminder, or open the app to log it.

See the week's adherence on each medicine, and one mark per day on the calendar: taken, missed, or skipped.

Sharing a medicine with your household is a Premium feature. Tracking and reminders are free.

New permission: notifications, to remind you at dose time.
```

## Content rating questionnaire (IARC)

Goodlist has no user-generated media beyond plain text task titles/notes, no
chat between strangers (only between household members you've explicitly
invited), no violence, gambling, or sexual content. Answer **No** to every
content category the questionnaire asks about. Expected result: rated for
all ages (e.g. "Everyone" / PEGI 3 equivalent).

## Data Safety form

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | Yes |
| Data collected | Email address (account), User-generated content (task titles/notes/due dates, display name, group name), **Health and fitness → Health info** (medicine names, doses, schedules and taken/skipped log — optional; see the medicines note below), App activity → Other actions (a single overwritten "last seen" timestamp, used only for the live active-user count), Approximate location (country + time zone — see note below), Financial info → Purchase history (Premium trial/subscription status — see note below) |
| Is data encrypted in transit? | Yes |
| Can users request data deletion? | Yes — in-app (Settings → Delete account), immediate and permanent. The country/time zone alone can also be cleared on its own via Settings → Privacy |
| Is data shared with third parties? | No — Supabase and RevenueCat are service providers processing data on our behalf, which Play does not count as sharing |
| Is data sold? | No |
| Is data used for advertising or marketing? | No |
| Does the app collect audio (voice or sound recordings)? | **No** — the microphone is used, but the audio never reaches Goodlist. See the voice-input note below |
| Purpose of location collection | Analytics only — an aggregate count of users per country. Never used for advertising, personalisation, or locating an individual |
| Is collection required or optional? | Email required for account creation; display name optional; task content is whatever the user chooses to enter; **country/time zone is optional** and can be switched off in Settings → Privacy |

### Note on medicines and the "Health info" declaration

The Meds tab stores medicine names, doses, instructions, schedules and a taken/skipped log in
Supabase. Declare **Health and fitness → Health info**: collected, **optional**, purpose **App
functionality**, **not shared** (a medicine is shown to a group only when its owner chooses to share
it, which is user-initiated transfer and not "sharing" in Play's sense), deletable in-app (delete the
medicine, or Settings → Delete account).

Reminders are **local notifications** scheduled on the device by `expo-notifications`; no push
token is registered and nothing is sent by a server. The app requests `POST_NOTIFICATIONS` (asked
in context — the first time a medicine is saved with reminders on, **or** the first time a task's
Alarm switch is turned on and saved, whichever a user reaches first) and does **not** request
`SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM`, so there is no exact-alarm declaration to make. Task
alarms are a one-shot local notification at the task's own due date/time (same mechanism, no new
permission, no new Data Safety category — the title/note/due date it uses is already declared
under User-generated content); see the note below on task content generally.

Before submitting: confirm the merged manifest carries no push-related permission you don't intend
(`npx expo prebuild --platform android --no-install`, then inspect `AndroidManifest.xml`), and
regenerate the public privacy page (`npm run legal:site`) in the same release so the policy Google
fetches already mentions medicines.

### Note on the "Approximate location" declaration

Goodlist requests **no location permission** and calls **no location API**. The country comes
from the device's own Region setting and the time zone from its calendar settings, both read via
`expo-localization` — the same values any app gets for formatting dates and currency.

Google's "Approximate location" category is written around location APIs (e.g.
`ACCESS_COARSE_LOCATION`), which this does not use. It is declared anyway because the app
*derives a geographic breakdown* from these values, and over-declaring is the safer side of that
line. If a reviewer questions it, the accurate description is: *device locale settings, used to
infer country for aggregate analytics; no location permission is requested.*

Answer **No** to "Does your app use precise location?" — it does not, and cannot.

### Note on voice input and the "Audio" declaration

The app now requests `android.permission.RECORD_AUDIO`, so a task can be spoken instead of typed.
That permission is new, and it is the one thing on this page a reviewer is most likely to ask about.

**Do not declare Audio → "Voice or sound recordings."** Data Safety covers what *this app* collects,
and Goodlist never receives the audio. `expo-speech-recognition` hands the microphone to the
platform's own recognizer — Google's `SpeechRecognizer` on Android, the browser's `SpeechRecognition`
on the web — which returns text. Nothing is written to disk and nothing reaches Goodlist's backend.
The line that makes that true is that `recordingOptions.persist` is never set anywhere in the
codebase. Verify it before answering, rather than trusting this paragraph:

```bash
grep -rn "persist" src/lib/voice src/hooks/use-voice-input.ts   # expect no matches
```

The transcript that comes back becomes a task title, and is already declared under **User-generated
content** — no new category is needed for it. If a reviewer does ask, the accurate description is:
*the microphone is live only while the user holds the listening panel open; audio is transcribed by
the device's own speech service and is never recorded, stored, or transmitted by the app.*

The permission reaches the manifest through the `expo-speech-recognition` config plugin in
`app.json`, which also adds the `<queries>` entry for `com.google.android.googlequicksearchbox` that
Android 11+ package visibility requires. Both show up in `npx expo config --type prebuild`.

The matching disclosure in the privacy policy is the **Voice input** paragraph under *What we
collect*, plus the speech-service entry under *Sharing & service providers* — both in
`src/content/legal.ts`. Google fetches that policy and cross-checks it against this form, so the two
must ship together.

### Note on repeating tasks

A repeating Personal task stores its pattern (frequency, chosen weekdays, due time, optional last
day, and the title/note copies are made from) in `public.task_recurrences`, owned by the user and
deleted with their account. Each copy is an ordinary task row. Nothing new is collected beyond what
User-generated content already covers, no permission is requested, and **no Data Safety answer
changes**. Repeating tasks are not shared with groups.

### Note on the calendar view

The Calendar tab plots the due dates already stored on the user's own tasks. It does **not** read,
write, or sync the device calendar: there is no `expo-calendar` dependency, no `READ_CALENDAR` or
`WRITE_CALENDAR` in the manifest, and no calendar permission is requested. Nothing new is
collected, so **no Data Safety answer changes for it** — the due dates are already declared under
User-generated content. Verify before answering rather than trusting this paragraph:

```bash
grep -rn "expo-calendar\|READ_CALENDAR\|WRITE_CALENDAR" package.json app.json src   # expect no matches
```

If a reviewer asks, the accurate description is: *an in-app month view of the user's own task due
dates; the device calendar is neither read nor written.*

### Note on the "Purchase history" declaration

Premium is sold through Google Play Billing, via RevenueCat's SDK. Card and bank details never
reach Goodlist or RevenueCat — Google Play collects them, and Play's own billing does not need to
be declared. What the app *does* handle is purchase history: RevenueCat receives the Play purchase
records keyed to the user's Supabase user ID, and `public.entitlements` stores the trial dates and
subscription expiry. Declare **Financial info → Purchase history**:

| Question | Answer |
|---|---|
| Collected or shared? | Collected (RevenueCat is a service provider, so not shared) |
| Processed ephemerally? | No |
| Required or optional? | Optional — only for users who start the trial or subscribe |
| Purposes | App functionality (unlocking Premium) and account management |

## Data deletion declaration

Play's User Data policy requires apps that allow account creation to offer deletion **both** in-app
and from a public web page. Goodlist has both.

| Question | Answer |
|---|---|
| Does your app allow users to create an account? | Yes |
| Can users request account deletion? | Yes |
| Account deletion URL | `https://jericrealubit.github.io/goodlist/legal/delete-account/` |
| Does deletion remove all data, or only some? | All account data is deleted |

## App access (login credentials for the reviewer)

**Goodlist shows nothing before sign-in, so this section is mandatory** — a reviewer who cannot get
past the login screen will reject the submission.

Under **App content → App access**, choose *All or some functionality is restricted* and add one
instruction set:

| Field | Value |
|---|---|
| Name | Full app access |
| Username | *(a real Supabase account created for this purpose)* |
| Password | *(its password)* |
| Any other instructions | Sign in with the credentials above. The Tasks tab is the main screen; add a task with the compose bar at the bottom. The microphone beside the send button dictates a task — the phone asks for microphone access the first time, and the words appear on screen for confirmation before anything is saved. Open any task and set a due date to see the optional Alarm switch — turning it on and saving is one of two places the app asks for notification access (the other is below). The Calendar tab shows tasks that have a due date; it reads only the app's own data, not the device calendar. The Meds tab tracks medicines — this account already has one with reminders on, so the phone will ask for notification access the first time that screen loads if it hasn't already been granted; tap a dose's Taken/Skip buttons to see logging, and open the medicine to see the Premium-gated group-sharing picker. Group features are under the Group tab — this account is already in a Family group, so the Requested-tasks flow can be reviewed there. History moved under Settings → History. |

Create that account on the production Supabase project, seed it with a handful of tasks, a group,
and at least one requested task, and **do not delete it** — Play re-uses it for every future update
review.

## App content declarations

| Question | Answer |
|---|---|
| Contains ads? | No |
| Target audience / "designed for children"? | No — general audience. Goodlist has no child-account or child-profile feature yet (see project plan, Phase 6 — deliberately deferred) |
| Government app? | No |
| COVID-19 contact tracing / status app? | No |
| News app? | No |
| Financial features (loans, crypto, trading, etc.)? | No |
