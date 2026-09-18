# Voice commands implementation plan

> **For agentic workers:** implement this plan task-by-task, in order. Steps use checkbox
> (`- [ ]`) syntax for tracking. The design behind it is
> [`docs/superpowers/specs/2026-09-18-voice-commands-design.md`](../specs/2026-09-18-voice-commands-design.md)
> — read it first; this file assumes its decisions.

**Goal:** Let someone add, assign, finish and undo Goodlist tasks by speaking, on Android and on the
web, with no keyboard and no loss of the app's offline-first, nothing-recorded behaviour.

**Architecture:** One new dependency, `expo-speech-recognition@~57.1.0`, wraps the platform
recognizers (Android `SpeechRecognizer`, browser `SpeechRecognition`). A single hook,
`useVoiceInput`, owns the session and hands up a live transcript. Everything after the transcript is
pure, local TypeScript: `parseVoiceCommand` turns text into a `VoiceCommand`, `matchTask` resolves
which row was meant, and the screen dispatches into the **existing** mutation hooks. No new data
path, no new server code, no change to the offline queue.

**Tech stack:** Expo SDK 57 / React Native 0.86, TypeScript, existing `expo-haptics`,
`expo-localization` and `@expo/vector-icons`. Tests for the pure parsers run on Node's built-in test
runner with native type stripping (verified on Node v22.22.2) — no test framework is added.

## Global constraints

- **`SendButton` must render pixel-identically after Task 4.** Its nine-theme shape logic gets
  extracted, not redesigned. Same sizes, same offsets, same colors, same `accessibilityLabel`.
- **Never commit on an interim result.** Only `result` events with `isFinal: true` reach the parser.
- **`recordingOptions.persist` stays off, everywhere.** It is the line that makes "Goodlist keeps no
  audio" true, and the privacy copy in Task 14 depends on it.
- **The parsers stay pure and dependency-free.** `src/lib/voice/parse-*.ts` and `match-task.ts`
  import nothing — no React, no `@/` aliases, no Expo. That is what lets Node run their tests
  directly.
- **Erasable TypeScript only in tested files.** Node's type stripping rejects `enum`, parameter
  properties and namespaces. Use `as const` unions, which is this codebase's style anyway.
- **Capability gates everything.** If `isRecognitionAvailable()` is false, no mic is rendered and
  every existing screen behaves exactly as it does today.
- **No new native permission beyond the microphone.**

## Verification, per task

Unless a task says otherwise:

```bash
npx tsc --noEmit
npm run lint
node --test "src/lib/voice/**/*.test.ts"   # once Task 7 lands
```

Plus the manual matrix in Task 17 for anything that touches the microphone. There is no test runner
configured for React components in this repo, and this plan does not add one.

---

## Stage 0 — Foundation and dictation

Ships on its own: a mic that fills the compose bar with what you said. No grammar yet.

### Task 1: Dependency and native configuration

**Files:** `package.json`, `app.json`

- [ ] **Step 1:** `npx expo install expo-speech-recognition` — expect `~57.1.0`. Use `expo install`,
      not `npm install`, so the SDK-matched version is picked.
- [ ] **Step 2:** Add the config plugin to `app.json`'s `plugins` array, after
      `expo-splash-screen` and before `@react-native-community/datetimepicker`:

```json
[
  "expo-speech-recognition",
  {
    "microphonePermission": "Goodlist uses the microphone only while you are speaking a task.",
    "speechRecognitionPermission": "Goodlist turns what you say into task text.",
    "androidSpeechServicePackages": ["com.google.android.googlequicksearchbox"]
  }
]
```

- [ ] **Step 3:** Confirm what it generates, without committing native dirs:
      `npx expo prebuild --platform android --no-install --clean` into a scratch checkout, then
      check `android/app/src/main/AndroidManifest.xml` for `RECORD_AUDIO` and for the `<queries>`
      block naming `com.google.android.googlequicksearchbox` and
      `android.speech.RecognitionService`. Delete the scratch output; this repo uses CNG.
- [ ] **Step 4:** Build a new dev client (`eas build --profile development --platform android`).
      Every later task that touches the microphone needs it — the current dev build has no mic
      permission.

**Verify:** `npx expo config --type prebuild` lists the plugin; `npx tsc --noEmit` clean.

### Task 2: Capability and permission hook

**Files:** create `src/hooks/use-voice-availability.ts`

**Produces:**

```ts
export type VoiceAvailability = {
  /** The platform can recognize speech at all. False on Firefox, Brave, Android without a recognizer. */
  supported: boolean;
  /** Permission already granted this session. */
  granted: boolean;
  /** Asks, once, behind a rationale the caller has already shown. */
  request: () => Promise<boolean>;
};
```

- [ ] **Step 1:** Read `ExpoSpeechRecognitionModule.isRecognitionAvailable()` once on mount and
      memoize it; it is synchronous and does not change within a session.
- [ ] **Step 2:** Read `getPermissionsAsync()` on mount; call
      `requestMicrophonePermissionsAsync()` in `request()`. Android has no separate speech
      permission, so do not use the combined request there.
- [ ] **Step 3:** Return `supported: false` rather than throwing on any error, so a broken
      recognizer degrades into "no mic button" instead of a crash.

### Task 3: The session hook

**Files:** create `src/hooks/use-voice-input.ts`

**Produces:**

```ts
export type VoiceStatus = 'idle' | 'starting' | 'listening' | 'unavailable' | 'denied';

export type VoiceSession = {
  status: VoiceStatus;
  /** Interim while listening, final once the session ends. */
  transcript: string;
  /** 0–1, normalized from the recognizer's −2…10 volume scale. */
  level: number;
  /** Already-humanized copy, never a raw error code. */
  error: string | null;
  start: (options?: { contextualStrings?: string[] }) => Promise<void>;
  stop: () => void;    // finalize and keep the transcript
  cancel: () => void;  // abort and discard
};

export function useVoiceInput(onFinal: (transcript: string) => void): VoiceSession;
```

- [ ] **Step 1:** Subscribe with `useSpeechRecognitionEvent` to `start`, `result`, `error`, `end`
      and `volumechange`. Keep interim text in state; call `onFinal` only when `isFinal` is true.
- [ ] **Step 2:** Start with:

```ts
ExpoSpeechRecognitionModule.start({
  lang,                       // from Task 5
  interimResults: true,
  continuous: Platform.OS === 'android' && Platform.Version >= 33,
  maxAlternatives: 1,
  contextualStrings,
  volumeChangeEventOptions: { enabled: true, intervalMillis: 200 },
});
```

  `continuous` on Android 13+ is what suppresses the OS start/stop beep; because of it, call
  `abort()` as soon as a final result arrives so behaviour still reads as single-shot.
- [ ] **Step 3:** Map every error code to a sentence — `not-allowed` → microphone permission and
      where to change it; `network` → speech needs a connection; `no-speech`/`speech-timeout` →
      didn't catch that; `service-not-allowed`/`language-not-supported` → unavailable here;
      `busy` → already listening; `audio-capture`/`client`/`unknown` → generic retry. Never surface
      the raw code.
- [ ] **Step 4:** Safety rails: a 15-second hard stop, `abort()` in the effect cleanup, and
      `abort()` on `AppState` leaving `active`. A session must not outlive the screen.

### Task 4: Extract the round action button, add the mic

**Files:** create `src/components/round-action-button.tsx`, create `src/components/mic-button.tsx`,
modify `src/components/send-button.tsx`, modify `src/constants/icons.ts`

- [ ] **Step 1:** Move the nine-theme shape logic out of `send-button.tsx` into
      `RoundActionButton`, which takes `{ glyph, onPress, disabled, loading, accessibilityLabel,
      variant }` and keeps every existing branch: the `colorful3d`/`brutalist` offset layer, the
      `lavenderGlass` `GlassView` with its fallback fill, `darkNeon`'s ring, `paperCollage`'s
      rotation, `darkLuxury`'s inverted fill, `natureZen`'s organic radii. The named constants stay
      with it.
- [ ] **Step 2:** Rewrite `SendButton` as a thin wrapper. Its rendered output must not change.
- [ ] **Step 3:** Add to `ActionIcons`: `voice: 'mic-outline'`, `voiceListening: 'stop-circle-outline'`,
      `voiceOff: 'mic-off-outline'`.
- [ ] **Step 4:** `MicButton` wraps `RoundActionButton` with a listening state: the glyph swaps to
      `voiceListening`, the label swaps from "Start voice input" to "Stop listening", and the level
      from Task 3 drives a Reanimated scale on a ring behind the button (`react-native-reanimated`
      is already a dependency).

**Verify:** screenshot the compose bar in all nine themes before and after; send button unchanged.

### Task 5: Recognition language

**Files:** create `src/lib/voice/language.ts`

- [ ] **Step 1:** `getRecognitionLanguage(): string` — read `Localization.getLocales()[0]`, prefer
      `languageTag`, fall back to `'en-US'` when it is missing or empty. `expo-localization` is
      already a dependency and already read in `src/lib/device-locale.ts`; follow that file's shape.

### Task 6: Dictation in the compose bar

**Files:** modify `src/components/compose-bar.tsx`, modify `src/app/(app)/(tabs)/index.tsx`

- [ ] **Step 1:** `ComposeBar` takes two new optional props: `onVoicePress` and `voiceState`. When
      `onVoicePress` is absent — which is what an unsupported platform produces — the bar renders
      exactly as it does today.
- [ ] **Step 2:** On the Tasks screen, wire `useVoiceAvailability` + `useVoiceInput` so interim
      transcripts flow into `composeText` and the final transcript lands there editable. Do not
      submit automatically in this stage.
- [ ] **Step 3:** Before the first `request()`, show a one-line rationale (reuse the inline
      `composeError` slot rather than an `Alert`, matching how the screen already reports problems).
- [ ] **Step 4:** Light haptic on listening start and on final result, matching
      `Haptics.ImpactFeedbackStyle.Light` used elsewhere on this screen.

**Verify:** on an Android 13+ device, speak "buy milk", see it appear in the field, tap send, see the
task. On Chrome, same. On Firefox, no mic button at all.

---

## Stage 1 — Understanding commands

### Task 7: Date-phrase parser

**Files:** create `src/lib/voice/parse-when.ts`, create `src/lib/voice/parse-when.test.ts`,
modify `package.json`

**Produces:** `parseWhen(text: string, now: Date): { dueAt: Date | null; rest: string }`

- [ ] **Step 1:** Add `"@types/node": "^22"` to `devDependencies` (needed for `node:test` types
      under `tsc --noEmit`; the repo's only timer typing is `ReturnType<typeof setTimeout>` in
      `src/components/app-tabs.tsx`, which is unaffected) and a script:
      `"test": "node --test \"src/**/*.test.ts\""`.
- [ ] **Step 2:** Implement the phrase set from the spec: `today`, `tonight`, `this evening`,
      `tomorrow` (+ morning/afternoon/evening), weekday names with and without `next`,
      `this weekend`, `next week`, `in N minutes|hours|days|weeks`, `at 5`, `at 5:30 pm`, `at noon`,
      `at midnight`, `on <month> <day>`.
- [ ] **Step 3:** Enforce the two rules: the phrase matches only at the **end** of the string
      (optionally introduced by `by`, `due` or `on`), and a date with no spoken time resolves to
      **09:00 local**.
- [ ] **Step 4:** Tests, with a frozen `now`. Cover each phrase, the anchoring rule ("call mum about
      Friday's party" keeps its text and returns `dueAt: null`), `rest` being trimmed, and a
      weekday that is today resolving to next week rather than to the past.

### Task 8: Command parser

**Files:** create `src/lib/voice/types.ts`, create `src/lib/voice/parse-command.ts`,
create `src/lib/voice/parse-command.test.ts`

**Produces:**

```ts
export type VoiceCommand =
  | { kind: 'addTask'; title: string; dueAt: Date | null }
  | { kind: 'requestTask'; assigneeHint: string; title: string; dueAt: Date | null }
  | { kind: 'completeTask'; titleHint: string }
  | { kind: 'cancelRequest'; titleHint: string }
  | { kind: 'deleteTask'; titleHint: string }
  | { kind: 'undo' }
  | { kind: 'navigate'; to: 'tasks' | 'history' | 'group' | 'settings' }
  | { kind: 'dictation'; text: string };

export function parseVoiceCommand(
  transcript: string,
  ctx: { now: Date; memberNames: string[] },
): VoiceCommand;
```

- [ ] **Step 1:** Normalize first: lower-case, strip trailing punctuation, collapse whitespace,
      fold accents for name matching only (the title keeps its original casing from the transcript).
- [ ] **Step 2:** Match the verb table in the spec, longest pattern first, so "mark X done" is not
      eaten by "mark".
- [ ] **Step 3:** Run `parseWhen` on the remainder for `addTask` and `requestTask` only. A due date
      on "delete the milk one" is meaningless and must not be stripped from the match hint.
- [ ] **Step 4:** Anything unmatched returns `{ kind: 'dictation', text }` — never an error.
- [ ] **Step 5:** Tests: every row of the verb table, "ask Maria to pick up the parcel tomorrow"
      producing the right three fields, a member name that isn't in `memberNames` falling back to
      `dictation`, and casing/punctuation variants.

### Task 9: Bias the recognizer with real names

**Files:** modify `src/app/(app)/(tabs)/index.tsx`

- [ ] **Step 1:** Pass the pooled `otherMemberOptions` display names as `contextualStrings` when
      starting a session. They are already computed on this screen for the assignee picker.
- [ ] **Step 2:** Cap the list (say 20) so an unusual group can't bloat the intent extras.

### Task 10: Run add and request from speech

**Files:** create `src/components/voice-sheet.tsx`, modify `src/app/(app)/(tabs)/index.tsx`

- [ ] **Step 1:** `VoiceSheet` — a themed overlay showing the live transcript, the level ring and
      Cancel. It renders the five states from the spec (listening, heard-nothing, denied, offline,
      unavailable) and nothing else.
- [ ] **Step 2:** On a final transcript, parse. `addTask` → `createTaskMutation` via
      `buildNewTaskInput`; `requestTask` → `createRequestMutation` via `buildNewRequestInput` with
      the matched member's `userId`/`familyId`; `dictation` → fill the compose bar and leave it to
      the user.
- [ ] **Step 3:** Respect the rules the screen already enforces: a requested task needs a writable
      group, and `READ_ONLY_MESSAGE` is the copy when Premium has lapsed. Route voice failures into
      the same `composeError` slot as typing.
- [ ] **Step 4:** After a commit, report it in one line ("Added: buy milk · Sep 19") and keep it on
      screen long enough to read.

---

## Stage 2 — Acting on tasks that already exist

### Task 11: Task matching

**Files:** create `src/lib/voice/match-task.ts`, create `src/lib/voice/match-task.test.ts`

**Produces:**

```ts
export function matchTask<T extends { id: string; title: string }>(
  hint: string,
  tasks: T[],
): { match: T | null; candidates: T[] };
```

- [ ] **Step 1:** Score on normalized token overlap, ignoring stop words ("the", "a", "my", "one").
- [ ] **Step 2:** Return a `match` only when the best score clears a floor **and** beats the runner-up
      by a margin; otherwise return the top three as `candidates`.
- [ ] **Step 3:** Tests: exact title, partial ("milk" → "Buy milk at the shop"), two similar titles
      producing candidates rather than a guess, and no plausible match returning both empty.

### Task 12: Complete, cancel, delete, undo

**Files:** modify `src/app/(app)/(tabs)/index.tsx`

- [ ] **Step 1:** `completeTask` → `completeMutation`, reusing the existing `justCompleted` optimistic
      path so the row behaves exactly as a tap does.
- [ ] **Step 2:** `undo` → reopen the most recent `justCompleted` entry via `reopenMutation`.
- [ ] **Step 3:** `deleteTask` and `cancelRequest` always confirm — show the matched title and
      require a tap. Never delete on a voice match alone.
- [ ] **Step 4:** When `matchTask` returns candidates, render them in the sheet as a pick-one list.

### Task 13: Navigation commands

**Files:** modify `src/app/(app)/(tabs)/index.tsx`

- [ ] **Step 1:** `navigate` → `router.push` to the typed routes for History, Group and Settings
      (`experiments.typedRoutes` is on, so these are checked at compile time).

---

## Stage 3 — Saying so, out loud and in writing

### Task 14: Privacy and store copy

**Files:** modify `src/content/legal.ts`, modify `docs/play-store-listing.md`

- [ ] **Step 1:** Add a "Voice input" paragraph to *What we collect*: the microphone is live only
      while the listening sheet is open, audio is transcribed by the device's own speech service
      (Google on Android, the browser's engine on the web), Goodlist stores no audio, and the
      transcript becomes task text exactly as typing would.
- [ ] **Step 2:** Name the platform recognizer under *Sharing & service providers*, in the same
      form as the existing entries.
- [ ] **Step 3:** Update the Play listing's permissions note, which currently says only that no
      location permission is requested, to cover the microphone and why.
- [ ] **Step 4:** Re-answer the Play Console **Data safety** audio questions against the shipped
      behaviour. Verify `recordingOptions.persist` is absent from the codebase before answering:
      `grep -rn "persist" src/lib/voice src/hooks/use-voice-input.ts`.

### Task 15: Settings toggle

**Files:** modify `src/app/(app)/(tabs)/settings.tsx`, create `src/contexts/voice-context.tsx` (or
extend an existing preference store)

- [ ] **Step 1:** A "Voice input" switch persisted to `AsyncStorage` under `goodlist.voiceEnabled`,
      defaulting to on where the platform supports it — mirroring how `goodlist.themeId` is stored.
- [ ] **Step 2:** When off, no mic button anywhere and no microphone session is ever started.
- [ ] **Step 3:** When the platform doesn't support recognition, show the row disabled with a
      one-line reason rather than hiding it, so the absence is explained.

### Task 16: User-facing guide

**Files:** modify `src/content/guide.ts`, modify `README.md`, run `npm run guide:screens` and
`npm run site`

- [ ] **Step 1:** A guide step, in the same plain voice as its neighbours: press the mic, say the
      thing, check it before sending. List the command phrases as examples, not as syntax.
- [ ] **Step 2:** Regenerate the bundled screenshots and the published pages. The in-app guide, the
      web guide and `docs/user-guide/` all render from `guide.ts`, so they can't drift.
- [ ] **Step 3:** Add voice to the README feature list.

### Task 17: Manual verification matrix

- [ ] Android 13+ dev build: dictation, each command verb, a date phrase, a denied permission, and
      airplane mode (expect the offline copy, and the queued write once back online).
- [ ] Android 12 device or emulator: no continuous mode — confirm the beep is present but the flow
      still completes, and that nothing crashes.
- [ ] Android with the recognizer disabled (`adb shell pm disable-user com.google.android.tts`):
      confirm the mic is not rendered.
- [ ] Chrome desktop and Chrome on Android: full flow.
- [ ] Firefox: no mic, everything else unchanged.
- [ ] Screen reader (TalkBack): mic reachable and labelled, transcript announced, no state that can
      only be perceived by hearing the tone.
- [ ] All nine themes: mic and sheet legible in each, light and dark.

---

## Definition of done

- Speaking "add milk", "ask <member> to <task> tomorrow", "finish milk" and "undo" each do the right
  thing on an Android 13+ device and in Chrome.
- Unsupported platforms and revoked permissions produce no mic and no errors.
- `npx tsc --noEmit`, `npm run lint` and `npm test` are clean.
- Privacy policy, Play listing, Data safety answers and the in-app guide all describe what the code
  actually does.
- `SendButton` renders as it did before Task 4, in all nine themes.

## Deferred, deliberately

- Reading a list back with `expo-speech@57.0.3` ("what's on my list").
- Hands-free continuous mode — several tasks in one breath, Android 13+ only.
- On-device recognition, with `androidTriggerOfflineModelDownload()` and a `getSupportedLocales()`
  check, to make listening work offline.
- An LLM parser behind the `parseVoiceCommand` seam, if the grammar proves too rigid in real use.
