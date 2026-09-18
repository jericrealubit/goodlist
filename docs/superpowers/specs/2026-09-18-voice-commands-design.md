# Voice commands

## Context

Every way into Goodlist today is the keyboard. `ComposeBar` (`src/components/compose-bar.tsx`) is
a `TextInput` and a send button; the task editor is two more text fields and a date picker. That is
fine at a desk and bad everywhere else — one hand on a steering wheel, a toddler on the other arm,
or a user who finds typing on a phone slow or painful. A task app that can't take a sentence out
loud is missing its most natural input.

The ask: add voice command functionality. This spec is the research behind it and the design it
points to. The task-by-task build is in
[`docs/superpowers/plans/2026-09-18-voice-commands.md`](../plans/2026-09-18-voice-commands.md).

### A note on sources

`AGENTS.md` says to read the versioned SDK 57 docs before writing code. `docs.expo.dev` is blocked
by this session's network egress policy, so every API fact below was read instead from the
published packages themselves — the TypeScript definitions, config-plugin source and README inside
`expo-audio@57.0.5`, `expo-speech@57.0.3` and `expo-speech-recognition@57.1.0`. Those are the exact
artifacts the app would install, so the surface described here is the real one. Re-read the web
docs before implementation if they become reachable; nothing below should change, but the guides
carry worked examples this spec compresses.

## Goals

- Say a task and have it appear, on Android and on the web, without touching the keyboard.
- Understand the app's actual verbs — add, ask someone, finish, delete, undo — not just dictation.
- Understand "tomorrow" and "on Friday" as due dates, because a spoken task usually carries one.
- Degrade honestly: where speech isn't available, the mic isn't there, and nothing else changes.
- Stay inside the app's existing promises — offline-first, no analytics, nothing recorded or kept.

## Non-goals

- A wake word, or listening when the user hasn't asked. Battery, privacy and Play policy all argue
  against it, and none of it is needed to say "add milk".
- Sending audio to Goodlist's own servers, or to any model we run. The platform recognizer does the
  transcription; we never hold the audio.
- Conversation. One utterance, one action, visible result. No dialogue state, no follow-up turns.
- iOS shipping work. The package supports iOS and the config plugin writes the iOS usage strings, so
  the code path stays correct — but `eas.json` builds and submits Android only, so iOS is untested
  and out of scope for this work.

## What SDK 57 actually gives us

### `expo-speech-recognition` — the one real option

There is no first-party Expo speech-*recognition* module; `expo-speech` is text-to-speech in the
other direction. The community package `expo-speech-recognition` (jamsch, MIT) is the standard
answer and publishes an SDK-matched line — **57.1.0, published 2026-09-16**. It is an Expo Modules
package (`expo-module.config.json` lists `["ios", "android", "web"]`), so it works with the New
Architecture and with Continuous Native Generation; this repo has no `ios/`/`android/` directories
and doesn't need them.

It wraps the platform recognizers rather than shipping a model: Android `SpeechRecognizer`, iOS
`SFSpeechRecognizer`, and the browser's `SpeechRecognition`/`webkitSpeechRecognition`. One API,
three engines.

The pieces that matter here:

| Need | API |
| --- | --- |
| Start / stop / discard | `ExpoSpeechRecognitionModule.start(options)`, `.stop()`, `.abort()` |
| Permissions | `requestPermissionsAsync()`, `requestMicrophonePermissionsAsync()`, `getPermissionsAsync()` |
| Capability check | `isRecognitionAvailable()`, `supportsOnDeviceRecognition()`, `getSupportedLocales()` |
| Live text | `interimResults: true` + the `result` event (`{ isFinal, results: [{ transcript, confidence, segments }] }`) |
| Level meter | `volumeChangeEventOptions: { enabled, intervalMillis }` + the `volumechange` event (−2…10; ≤ 0 is inaudible) |
| Accuracy bias | `contextualStrings: string[]` — `EXTRA_BIASING_STRINGS` on Android 13+, `SFSpeechRecognitionRequest.contextualStrings` on iOS |
| Offline recognition | `requiresOnDeviceRecognition: true`, plus `androidTriggerOfflineModelDownload()` |
| Failure | the `error` event, with typed codes |

Events arrive through the `useSpeechRecognitionEvent(name, handler)` hook: `start`, `audiostart`,
`speechstart`, `result`, `nomatch`, `speechend`, `audioend`, `end`, `volumechange`, `error`,
`languagedetection`.

Error codes are a closed union and each one deserves its own sentence of copy: `not-allowed`,
`service-not-allowed`, `network`, `no-speech`, `speech-timeout`, `busy`, `language-not-supported`,
`audio-capture`, `interrupted`, `aborted`, `client`, `unknown`.

The config plugin (`app.plugin.js`) does exactly three things, all of which this app needs:

- adds `android.permission.RECORD_AUDIO`;
- adds an Android `<queries>` block for `com.google.android.googlequicksearchbox` and the
  `android.speech.RecognitionService` intent — without it, Android 11+ package visibility hides the
  recognizer and `start()` fails on a device that is perfectly capable;
- writes `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription` for iOS.

### Platform reality for *this* app

Goodlist ships Android and web. The package's own compatibility table (dated 12 July 2025 in its
README) plus its Android notes give us:

| Target | Works | Watch out for |
| --- | --- | --- |
| Android 13+ | Everything: continuous, interim, on-device, biasing strings, punctuation | Needs `com.google.android.tts` installed **and enabled** |
| Android 12 and below | Basic recognition, interim results, volume metering | No continuous mode, no on-device recognition, no persisted audio; needs the Google app (`com.google.android.googlequicksearchbox`) |
| Chrome (desktop + Android) | Yes, Google's server-based engine | Transcription leaves the device |
| Safari ≥ 16 | Yes, Siri engine | Siri must be enabled |
| Edge | Conditional — needs the Azure speech component | Treat as unsupported unless detected |
| Firefox, Brave | No implementation | Feature-detect and hide the mic |

Two Android specifics worth designing around rather than discovering later:

- **The beep.** `SpeechRecognizer` plays a start/stop tone that the OS hardcodes. The package's
  documented workaround is `continuous: true` (or `recordingOptions.persist`), which switches
  `EXTRA_AUDIO_SOURCE` to a custom microphone source. To keep single-shot behaviour while staying
  quiet, run continuous and call `abort()` on the first `isFinal` result. Android 13+ only.
- **Short utterances.** Single words and letters resolve badly with the default `free_form` model;
  Google's own recommendation is `androidIntentOptions: { EXTRA_LANGUAGE_MODEL: "web_search" }`.
  Goodlist's utterances are phrases, so `free_form` stays the default — but the knob exists if
  "done" or "undo" on their own prove flaky.

### What we deliberately don't install

- **`expo-audio@57.0.5`** — a full recorder (`useAudioRecorder`, `RecordingPresets`, web via
  `MediaRecorder`) and, new in this line, `useAudioStream` for real-time PCM. Its web build is a
  stub that returns `{ stream: null, isStreaming: false }`, so streaming is native-only. We need
  none of it: `expo-speech-recognition` owns the microphone and already emits volume levels. It
  only becomes relevant if a cloud-STT fallback is ever built (see Alternatives).
- **`expo-speech@57.0.3`** — text-to-speech (`speak`, `stop`, `getAvailableVoicesAsync`; web via
  `window.speechSynthesis`). Not needed to *take* commands; it's the obvious dependency for reading
  a list back, which is a later stage.
- **`@react-native-voice/voice`** — the pre-Expo-Modules alternative. No config plugin, weaker New
  Architecture story, no web. Nothing to gain.

### Build impact

A native module means a new dev build and a new production build; the current Play release won't
grow a microphone by itself. That's already this project's workflow — `react-native-purchases` has
the same constraint — so nothing about how the app is developed changes. The web build needs only
a redeploy.

## Design

### Three surfaces, one pipeline

```
 mic press ─► recognizer ─► transcript ─► parse ─► intent ─► existing mutation ─► undo
                  │             │           │
             volumechange   interim text   local, pure, testable
```

Everything after `transcript` is ordinary TypeScript running on the device: a pure parser, then the
same `useCreateTaskMutation` / `useCompleteTaskMutation` / router calls the buttons already use.
Voice adds an input, not a second way to write data — which is what keeps the offline queue, the
optimistic updates and the premium read-only rules working untouched.

**Surface 1 — Dictation into the compose bar.** A mic beside the send button. Interim results stream
into the existing `TextInput`; the final transcript stays there, editable, and the user sends it.
Nothing is committed without a deliberate tap. This alone is the accessibility win, and it is
shippable on its own.

**Surface 2 — Commands.** The same mic, held or long-pressed, opens a listening sheet. On the final
transcript the parser decides what was meant, and the app does it: add a task, ask a group member
for one, finish one, undo. Non-destructive intents commit immediately (typing a task is instant
too) and report what happened in one line. Destructive ones confirm first.

**Surface 3 — Correction.** Voice mis-hears; the design assumes it. Every committed voice action
leaves either an editable field or a one-tap undo, and the listening sheet always offers "Cancel"
before the commit lands.

### The grammar

A closed, documented set — not a model. It is written once in `src/lib/voice/parse-command.ts` as
a pure function over a lower-cased, punctuation-normalized transcript, and it is the single place
anyone has to look to answer "what can I say?".

```ts
parseVoiceCommand(transcript: string, ctx: { now: Date; memberNames: string[] }): VoiceCommand
```

| Intent | Spoken forms | Result |
| --- | --- | --- |
| `addTask` | "add …", "new task …", "create a task called …", "remind me to …", "I need to …", "note to self …" | `createTask` |
| `requestTask` | "ask <name> to …", "tell <name> to …", "request … from <name>" | `createRequest` |
| `completeTask` | "complete …", "finish …", "mark … done", "tick off …", "I just did …" | `completeTask` |
| `cancelRequest` | "cancel …" | `cancelTask` (only a request the speaker created) |
| `deleteTask` | "delete …", "remove …" | `deleteTask`, behind a confirmation |
| `undo` | "undo", "undo that" | reopen the most recently completed task |
| `navigate` | "open history", "go to settings", "show my group" | `router.push` |
| `dictation` | anything else | the whole transcript becomes a task title |

The `dictation` fallback is the important row. An unrecognized sentence is never an error — "buy
milk on the way home" is a perfectly good task title, and treating no-match as a title is what makes
the feature feel forgiving rather than like a command line you have to memorize.

`<name>` is matched against the group members already pooled on the Tasks screen
(`otherMemberOptions` in `src/app/(app)/(tabs)/index.tsx`) after normalizing case and accents. Those
same names are passed to the recognizer as `contextualStrings`, so the engine is biased toward
hearing them correctly in the first place.

### Dates out of speech

`src/lib/voice/parse-when.ts`, also pure:

```ts
parseWhen(text: string, now: Date): { dueAt: Date | null; rest: string }
```

It recognizes `today`, `tonight`, `tomorrow` (+ `morning`/`afternoon`/`evening`), weekday names with
and without `next`, `this weekend`, `next week`, `in N minutes|hours|days|weeks`, `at 5`, `at 5:30
pm`, `at noon`, `at midnight`, and `on <month> <day>`.

Two rules keep it from mangling titles:

- **Anchored.** A date phrase is only stripped when it sits at the end of the utterance, optionally
  introduced by `by`, `due` or `on`. "Call mum about Friday's party" keeps its Friday; "call mum on
  Friday" doesn't.
- **Date-first.** Today's UI is date-only — `DueDatePicker` runs `mode="date"` and `TaskRow` prints
  `toLocaleDateString`. A phrase with no clock time resolves to **09:00 local**, so a spoken date
  reads back as the day the user said, whatever the renderer does with the time. Spoken times are
  parsed and stored; surfacing them is a separate change to the picker.

No new dependency. `chrono-node` would cover far more English than this list, but it is a large
general parser for a problem we can state in twenty phrases, and this repo's instinct — see the
theme-switcher plan — is to add code it can test rather than a dependency it can't.

### Matching a task you spoke about

"Finish the milk one" has to find a row. `src/lib/voice/match-task.ts` scores each open task against
the spoken fragment on normalized token overlap, and returns a winner only when it is clearly
ahead — a minimum score plus a margin over the runner-up. Otherwise the sheet lists the top few and
asks which one. Guessing wrong on a destructive verb is much worse than asking.

### States and failures

The listening sheet has five states, and each one says something specific:

| State | What the user sees |
| --- | --- |
| Listening | Live transcript, a level ring driven by `volumechange`, Cancel |
| Heard nothing (`no-speech`, `speech-timeout`, `nomatch`) | "Didn't catch that" and the mic stays up for one retry |
| Denied (`not-allowed`) | Why the mic is needed and a link to system settings — never a silent failure |
| Offline (`network`) | "Speech needs a connection right now" — plus, on Android 13+ with an installed locale, an offer to switch to on-device recognition |
| Unavailable (`service-not-allowed`, `language-not-supported`, or `isRecognitionAvailable()` false) | The mic is not rendered at all, and the compose bar is exactly what it is today |

Permission is requested on the first mic press, after a one-line rationale — not on app start, and
not before the user has shown they want it. `requestMicrophonePermissionsAsync()` is enough on
Android; the combined `requestPermissionsAsync()` matters only on iOS.

### Offline

Recognition needs the network unless an on-device model is installed; task *writes* never do. Once
a transcript exists, the command runs through the same mutations as a tap, which queue in the
TanStack persister and replay in order. So voice inherits offline-first for free on the write side,
and only the listening step is connectivity-bound — which the copy above states plainly instead of
failing with a generic error.

### Fitting the app it's in

- **Themes.** The mic button has to survive all nine themes, including the two that fake depth with
  an offset layer and the glass one. `SendButton` already solves this; the shape logic gets
  extracted into one shared round-action button that both use, with send's rendering unchanged.
- **Icons.** New entries in `ActionIcons` (`voice`, `voiceListening`, `voiceOff`) so the glyph means
  the same thing everywhere, per that file's rule.
- **Accessibility.** The mic is a labelled `Pressable` with a state-dependent label ("Start voice
  input" / "Stop listening"); the transcript area is a live region; nothing depends on hearing the
  Android tone. Voice is an accessibility feature, so it must itself be reachable by screen reader.
- **Haptics.** `expo-haptics` is already used on complete and reorder; start-of-listening and
  commit get the same light impact.

## Privacy and store compliance

Audio goes to the platform recognizer — Google on Android and Chrome, Apple in Safari — and is not
recorded, uploaded or kept by Goodlist. `recordingOptions.persist` stays off, which is what makes
that sentence true. The transcript becomes task text, exactly as if it were typed.

That has to be written down in three places before release:

- `src/content/legal.ts` — a "Voice input" paragraph under *What we collect* and *Sharing & service
  providers*, naming the platform recognizer as the processor. The in-app screens and the published
  pages both render from this file, so they can't drift.
- `docs/play-store-listing.md` — it currently advertises that the app requests **no location
  permission**. It now requests a microphone permission, and should say why in the same plain voice.
- Play Console **Data safety** — re-answer the audio questions against the shipped behaviour (no
  recording persisted, no audio to our backend, transcription performed by the platform service).
  Answer it from the code, not from this paragraph.

## Risks

| Risk | Mitigation |
| --- | --- |
| Recognition is wrong and a wrong task lands | Dictation is editable before send; commands report what they did and are undoable; destructive verbs confirm |
| The grammar feels like a memory test | Unmatched speech becomes a task title; the guide lists the phrases; nothing *requires* a command word |
| Android fragmentation (12-, missing recognizer, disabled TTS package) | `isRecognitionAvailable()` gates the button; the error copy names the fix instead of saying "error" |
| Browsers without the Web Speech API | Same gate; Firefox and Brave users see today's app |
| A stuck listening session drains the mic | Hard client-side timeout, `abort()` on unmount, blur and navigation |
| Privacy expectations | Nothing persisted, plain-language policy text, mic only live while the sheet is open |

## Open decisions

1. **Premium or free?** Voice is an accessibility feature and gating it would be a bad look; the
   recommendation is free for everyone, with Premium staying about group count. Owner's call.
2. **Press-and-hold or tap-to-toggle?** Hold reads as "walkie-talkie" and ends cleanly; toggle is
   kinder to users with motor impairments. Recommendation: tap to start, tap or silence to stop,
   with hold-to-talk as a later preference.
3. **Language.** Ship `en-US`, or derive from `expo-localization` (already a dependency, already
   read in `src/lib/device-locale.ts`)? Recommendation: derive, fall back to `en-US`, and expose a
   picker only if users ask.
4. **Settings toggle.** Worth an explicit on/off (persisted like `goodlist.themeId`), or is the
   capability gate enough? Recommendation: ship the toggle — it's the honest answer to "can I turn
   the microphone off".

## Alternatives considered

- **Cloud STT (record with `expo-audio`, transcribe server-side).** Better accuracy, uniform across
  platforms and browsers, and it would let an LLM parse freeform speech instead of a grammar. It
  also means Goodlist itself handles voice audio, adds per-command cost to a $1.99/month app, needs
  a new Supabase Edge Function, and can't work offline. Rejected for v1; if the grammar proves too
  rigid, the parser interface is the seam to put it behind — the parser is one pure function, so an
  LLM implementation can replace it without touching the UI.
- **An LLM parser over the local transcript.** Same seam, smaller change: keep platform recognition,
  send only the text to a model. Worth revisiting once there is evidence of what people actually
  say. Same cost and offline caveats.
- **Android's `RecognizerIntent` dialog (system UI).** Free and zero-maintenance, but it's a modal
  system screen that ignores the app's nine themes, has no web equivalent, and gives no interim
  results. Rejected.
