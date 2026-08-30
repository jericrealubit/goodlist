# Theme Switcher (9 themes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick from 9 themes (Classic + 8 decorative palettes) in Settings, applied app-wide and persisted locally.

**Architecture:** A new theme registry (`src/constants/themes.ts`) defines all 9 themes; 8 of them derive their surface colors from a small per-theme "seed" via a shared color-mixing helper rather than 80 hand-picked hex values. A new `ThemeProvider`/`useSelectedTheme()` context persists the chosen theme id to `AsyncStorage` and is read by the existing `useTheme()` hook, so every existing themed component picks up the change with zero changes to itself.

**Tech Stack:** Expo/React Native (TypeScript), existing `@react-native-async-storage/async-storage` dependency (no new dependencies). No test runner is configured in this repo (`package.json` has no `test` script/jest) — each task is verified via `npx tsc --noEmit` plus a manual check (visual or a one-off `node` sanity check for pure functions), matching how the rest of this codebase has been built this session.

## Global Constraints

- Classic's `light`/`dark` token values must stay byte-identical to today's `Colors.light`/`Colors.dark` in `src/constants/theme.ts` — do not edit that file's existing values.
- The 8 new palette themes are each a single fixed look — their `tokens.light` and `tokens.dark` are the same object, and they do not change with system dark mode.
- `danger` for all 8 new palette themes is fixed at `#C0392B` (Classic's own two danger values are untouched — see Note in the spec).
- Persisted `AsyncStorage` key is exactly `goodlist.themeId`; unset or unrecognized values fall back to `'classic'`.
- `src/components/option-picker.tsx` changes must be backward compatible: existing call sites (tab switcher in `index.tsx`, mode/role pickers in `group/create.tsx`, assignee picker) pass no `swatches` and must render pixel-identical to before.
- Two files with similar names, don't confuse them: `src/constants/theme.ts` (existing — `Colors`, `Spacing`, etc., unmodified except nothing) vs. `src/constants/themes.ts` (new, plural — the 9-theme registry).

---

### Task 1: Color mixing utility

**Files:**
- Create: `src/lib/color.ts`

**Interfaces:**
- Produces: `mixWithWhite(hex: string, amount: number): string` — `hex` is a 6-digit `#RRGGBB` string, `amount` is 0-1 (0 = unchanged, 1 = pure white `#FFFFFF`). Returns an uppercase `#RRGGBB` string. Used by Task 2.

- [ ] **Step 1: Write the utility**

```ts
function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** Mixes `hex` toward white by `amount` (0 = unchanged, 1 = pure white). */
export function mixWithWhite(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (channel: number) => channel + (255 - channel) * amount;
  return rgbToHex(mix(r), mix(g), mix(b));
}
```

Save this as `src/lib/color.ts` in full (this is the entire file content).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Sanity-check the output values**

Run (from the repo root):
```bash
node -e "
function hexToRgb(hex) { const n = hex.replace('#',''); return [parseInt(n.slice(0,2),16), parseInt(n.slice(2,4),16), parseInt(n.slice(4,6),16)]; }
function rgbToHex(r,g,b) { const h = v => Math.round(v).toString(16).padStart(2,'0'); return ('#'+h(r)+h(g)+h(b)).toUpperCase(); }
function mixWithWhite(hex, amount) { const [r,g,b] = hexToRgb(hex); const mix = c => c + (255-c)*amount; return rgbToHex(mix(r),mix(g),mix(b)); }
console.log(mixWithWhite('#997E67', 0));    // expect #997E67 (amount 0 = unchanged)
console.log(mixWithWhite('#997E67', 1));    // expect #FFFFFF (amount 1 = pure white)
console.log(mixWithWhite('#F6C992', 0.95)); // expect a very light near-white peach, e.g. #FEFAF4-ish
"
```
Expected: first line exactly `#997E67`, second line exactly `#FFFFFF`, third line a light near-white tone. If the first two don't match exactly, the mix formula is wrong — fix before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/lib/color.ts
git commit -m "feat: add mixWithWhite color utility for theme derivation"
```

---

### Task 2: Theme registry

**Files:**
- Create: `src/constants/themes.ts`
- Modify: none (reads `Colors` from `src/constants/theme.ts` but does not change it)

**Interfaces:**
- Consumes: `mixWithWhite` from `@/lib/color` (Task 1); `Colors` from `@/constants/theme` (existing, unchanged).
- Produces:
  - `type ThemeId` — the 9 theme id strings.
  - `type ThemeTokens` — `= typeof Colors.light` (the 9-key color shape).
  - `type ThemeDefinition = { id: ThemeId; label: string; swatches: string[]; tokens: { light: ThemeTokens; dark: ThemeTokens } }`.
  - `themes: Record<ThemeId, ThemeDefinition>` — used by Task 4 (`useTheme`) and Task 6 (`ThemeSwitcher`).
  - `THEME_LIST: ThemeDefinition[]` — `Object.values(themes)`, used by Task 6 for switcher row order.

- [ ] **Step 1: Write the registry**

Save as `src/constants/themes.ts` in full:

```ts
import { mixWithWhite } from '@/lib/color';
import { Colors } from './theme';

export type ThemeId =
  | 'classic'
  | 'neutralElegance'
  | 'seashellGarnetAfternoon'
  | 'tropicalJadeSunrise'
  | 'jadePebbleMorning'
  | 'sapphireNightfallWhisper'
  | 'oceanRubyRadiance'
  | 'jellyShoes'
  | 'freshlySqueezed';

export type ThemeTokens = typeof Colors.light;

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  swatches: string[];
  tokens: { light: ThemeTokens; dark: ThemeTokens };
};

type FixedThemeSeed = {
  /** The palette's hero/most versatile swatch — used for buttons/CTAs. */
  primary: string;
  /** A second, visually distinct swatch (completed/positive color). */
  accent: string;
  /** Lightest/most neutral swatch — base for background/backgroundElement/backgroundSelected/border. */
  seedLight: string;
  /** Darkest swatch, only if dark enough to read as body text. Omit to synthesize a near-black instead. */
  seedDark?: string;
};

// Fixed across every non-Classic theme so destructive actions always read
// as red, regardless of palette (see spec's Note on `danger`).
const FIXED_DANGER = '#C0392B';

function buildFixedTheme(seed: FixedThemeSeed): ThemeTokens {
  const text = seed.seedDark ?? '#1A1A1A';
  return {
    text,
    background: mixWithWhite(seed.seedLight, 0.95),
    backgroundElement: mixWithWhite(seed.seedLight, 0.88),
    backgroundSelected: mixWithWhite(seed.seedLight, 0.8),
    textSecondary: mixWithWhite(text, 0.4),
    primary: seed.primary,
    accent: seed.accent,
    danger: FIXED_DANGER,
    border: mixWithWhite(seed.seedLight, 0.85),
  };
}

function fixedTheme(
  id: ThemeId,
  label: string,
  swatches: string[],
  seed: FixedThemeSeed,
): ThemeDefinition {
  const tokens = buildFixedTheme(seed);
  return { id, label, swatches, tokens: { light: tokens, dark: tokens } };
}

export const themes: Record<ThemeId, ThemeDefinition> = {
  classic: {
    id: 'classic',
    label: 'Classic',
    swatches: [Colors.light.primary, Colors.light.accent, Colors.light.danger, Colors.dark.background],
    tokens: { light: Colors.light, dark: Colors.dark },
  },
  neutralElegance: fixedTheme(
    'neutralElegance',
    'Neutral Elegance',
    ['#FFDBBB', '#CCBEB1', '#997E67', '#664930'],
    { primary: '#997E67', accent: '#664930', seedLight: '#FFDBBB', seedDark: '#664930' },
  ),
  seashellGarnetAfternoon: fixedTheme(
    'seashellGarnetAfternoon',
    'Seashell Garnet Afternoon',
    ['#F6C992', '#30525C', '#ACC0D3', '#D396A6', '#09A1A1', '#5484A4'],
    { primary: '#09A1A1', accent: '#D396A6', seedLight: '#F6C992', seedDark: '#30525C' },
  ),
  tropicalJadeSunrise: fixedTheme(
    'tropicalJadeSunrise',
    'Tropical Jade Sunrise',
    ['#FCA47C', '#23CED9', '#F9D779', '#A1CCA6', '#097C87'],
    { primary: '#097C87', accent: '#FCA47C', seedLight: '#F9D779' },
  ),
  jadePebbleMorning: fixedTheme(
    'jadePebbleMorning',
    'Jade Pebble Morning',
    ['#7B9669', '#E6E6E6', '#6C8480', '#BAC8B1', '#404E3B'],
    { primary: '#7B9669', accent: '#6C8480', seedLight: '#E6E6E6', seedDark: '#404E3B' },
  ),
  sapphireNightfallWhisper: fixedTheme(
    'sapphireNightfallWhisper',
    'Sapphire Nightfall Whisper',
    ['#0474C4', '#5379AE', '#2C444C', '#A8C4EC', '#06457F', '#262B40'],
    { primary: '#0474C4', accent: '#06457F', seedLight: '#A8C4EC', seedDark: '#262B40' },
  ),
  oceanRubyRadiance: fixedTheme(
    'oceanRubyRadiance',
    'Ocean Ruby Radiance',
    ['#D8226C', '#B2DAE4', '#F86A38', '#029456', '#005BB3'],
    { primary: '#005BB3', accent: '#D8226C', seedLight: '#B2DAE4' },
  ),
  jellyShoes: fixedTheme(
    'jellyShoes',
    'Jelly Shoes',
    ['#E0AFFF', '#C4D6FF', '#DD68E3', '#8866DE'],
    { primary: '#8866DE', accent: '#DD68E3', seedLight: '#C4D6FF' },
  ),
  freshlySqueezed: fixedTheme(
    'freshlySqueezed',
    'Freshly Squeezed',
    ['#FFBF00', '#F2CF7E', '#FFE642', '#FF7900'],
    { primary: '#FF7900', accent: '#FFBF00', seedLight: '#F2CF7E' },
  ),
};

export const THEME_LIST: ThemeDefinition[] = Object.values(themes);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If `ThemeTokens = typeof Colors.light` doesn't structurally match `buildFixedTheme`'s return object, this will fail here — the object literal in `buildFixedTheme` must have exactly the same 9 keys as `Colors.light`: `text, background, backgroundElement, backgroundSelected, textSecondary, primary, accent, danger, border`.)

- [ ] **Step 3: Commit**

```bash
git add src/constants/themes.ts
git commit -m "feat: add 9-theme registry (Classic + 8 palettes)"
```

---

### Task 3: Theme persistence context

**Files:**
- Create: `src/contexts/theme-context.tsx`

**Interfaces:**
- Consumes: `themes`, `ThemeId` from `@/constants/themes` (Task 2); `AsyncStorage` from `@react-native-async-storage/async-storage` (existing dependency, already used in `src/lib/supabase.ts`).
- Produces:
  - `ThemeProvider` (component, wraps children) — used by Task 4 (mounted at app root, aliased on import there to avoid colliding with `expo-router`'s own `ThemeProvider`).
  - `useSelectedTheme(): { themeId: ThemeId; setThemeId: (id: ThemeId) => void }` — used by Task 4 (`useTheme`) and Task 6 (`ThemeSwitcher`).

- [ ] **Step 1: Write the context**

Save as `src/contexts/theme-context.tsx` in full:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { themes, type ThemeId } from '@/constants/themes';

const STORAGE_KEY = 'goodlist.themeId';

type ThemeContextValue = {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeId(value: string | null): value is ThemeId {
  return !!value && value in themes;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeId, setThemeIdState] = useState<ThemeId>('classic');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (isThemeId(stored)) {
        setThemeIdState(stored);
      }
    });
  }, []);

  function setThemeId(id: ThemeId) {
    setThemeIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  }

  return <ThemeContext.Provider value={{ themeId, setThemeId }}>{children}</ThemeContext.Provider>;
}

export function useSelectedTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useSelectedTheme must be used within a ThemeProvider');
  }
  return context;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/contexts/theme-context.tsx
git commit -m "feat: add theme persistence context (AsyncStorage-backed)"
```

---

### Task 4: Wire `useTheme()` to the selected theme, mount the provider at root

**Files:**
- Modify: `src/hooks/use-theme.ts` (full current content is 9 lines — replace entirely)
- Modify: `src/app/_layout.tsx`

**Interfaces:**
- Consumes: `themes` from `@/constants/themes` (Task 2), `useSelectedTheme` from `@/contexts/theme-context` (Task 3).
- Produces: `useTheme()` — **unchanged return shape** (`ThemeTokens`, the same 9-key object every existing screen/component already destructures), so no other file needs to change.

- [ ] **Step 1: Update `useTheme()`**

Replace the full content of `src/hooks/use-theme.ts` with:

```ts
import { themes } from '@/constants/themes';
import { useSelectedTheme } from '@/contexts/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const { themeId } = useSelectedTheme();
  const mode = scheme === 'unspecified' ? 'light' : (scheme ?? 'light');
  return themes[themeId].tokens[mode];
}
```

- [ ] **Step 2: Mount `ThemeProvider` at the app root**

In `src/app/_layout.tsx`, `expo-router` already exports its own `ThemeProvider` (React Navigation's light/dark theme, imported and used for `DarkTheme`/`DefaultTheme`) — import ours aliased as `AppThemeProvider` to avoid the name collision.

Change the import block from:
```tsx
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SessionProvider, useSession } from '@/contexts/session-context';
```
to:
```tsx
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemeProvider as AppThemeProvider } from '@/contexts/theme-context';
import { SessionProvider, useSession } from '@/contexts/session-context';
```

Change the `RootLayout` return from:
```tsx
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SessionProvider>
            <RootNavigator />
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
```
to:
```tsx
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SessionProvider>
              <RootNavigator />
            </SessionProvider>
          </ThemeProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual regression check**

Run the app (web is fine: `npx expo start --web`). Since `ThemeProvider` defaults to `'classic'` before any selection is ever made, the app must look **pixel-identical** to before this task — same colors everywhere (Tasks list, Group, History, Settings, buttons). This confirms the new plumbing is a true no-op until a theme is actually picked (Task 7).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-theme.ts src/app/_layout.tsx
git commit -m "feat: wire useTheme() to the selected theme, mount ThemeProvider"
```

---

### Task 5: Extend `OptionPicker` with optional swatch dots

**Files:**
- Modify: `src/components/option-picker.tsx` (full current content — replace entirely)

**Interfaces:**
- Produces: `OptionPicker`'s `options` prop items gain an optional `swatches?: string[]` field. When present, up to a handful of small color dots render inline next to the label. `selectedId`/`onSelect`/`layout` props unchanged. Used by Task 6.

- [ ] **Step 1: Update the component**

Replace the full content of `src/components/option-picker.tsx` with:

```tsx
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Option = { id: string; label: string; swatches?: string[] };

type OptionPickerProps = {
  options: Option[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  layout?: 'row' | 'column';
};

export function OptionPicker({ options, selectedId, onSelect, layout = 'column' }: OptionPickerProps) {
  return (
    <ThemedView style={[styles.container, layout === 'row' && styles.containerRow]}>
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [layout === 'row' && styles.pressedRow, pressed && styles.pressed]}>
            <ThemedView
              type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
              style={[
                styles.row,
                layout === 'row' && styles.rowCentered,
                option.swatches && styles.rowSpaceBetween,
              ]}>
              <ThemedText type={isSelected ? 'smallBold' : 'default'}>{option.label}</ThemedText>
              {option.swatches ? (
                <ThemedView style={styles.swatchRow}>
                  {option.swatches.map((color, index) => (
                    <ThemedView key={index} style={[styles.swatchDot, { backgroundColor: color }]} />
                  ))}
                </ThemedView>
              ) : null}
            </ThemedView>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  containerRow: {
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.7,
  },
  pressedRow: {
    flex: 1,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowCentered: {
    alignItems: 'center',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swatchRow: {
    flexDirection: 'row',
    gap: Spacing.half,
    backgroundColor: 'transparent',
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual regression check**

Run the app and check every existing `OptionPicker` consumer still renders exactly as before (none of them pass `swatches`, so none should show dots or change layout): the Personal/Requested tab switcher on the Tasks screen, the Family/Team and role pickers on `group/create`, and the assignee picker on the Tasks screen's Requested tab (only visible with 2+ other group members).

- [ ] **Step 4: Commit**

```bash
git add src/components/option-picker.tsx
git commit -m "feat: support optional swatch-dot previews in OptionPicker"
```

---

### Task 6: `ThemeSwitcher` component

**Files:**
- Create: `src/components/theme-switcher.tsx`

**Interfaces:**
- Consumes: `THEME_LIST` from `@/constants/themes` (Task 2), `useSelectedTheme` from `@/contexts/theme-context` (Task 3), `OptionPicker` from `@/components/option-picker` (Task 5).
- Produces: `ThemeSwitcher` (component, no props) — used by Task 7.

- [ ] **Step 1: Write the component**

Save as `src/components/theme-switcher.tsx` in full:

```tsx
import { OptionPicker } from '@/components/option-picker';
import { THEME_LIST, type ThemeId } from '@/constants/themes';
import { useSelectedTheme } from '@/contexts/theme-context';

export function ThemeSwitcher() {
  const { themeId, setThemeId } = useSelectedTheme();

  return (
    <OptionPicker
      options={THEME_LIST.map((theme) => ({ id: theme.id, label: theme.label, swatches: theme.swatches }))}
      selectedId={themeId}
      onSelect={(id) => setThemeId(id as ThemeId)}
    />
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/theme-switcher.tsx
git commit -m "feat: add ThemeSwitcher component"
```

---

### Task 7: Wire into Settings — end-to-end verification

**Files:**
- Modify: `src/app/(app)/(tabs)/settings.tsx`

**Interfaces:**
- Consumes: `ThemeSwitcher` from `@/components/theme-switcher` (Task 6).
- Produces: nothing new consumed elsewhere — this is the final, user-facing task.

- [ ] **Step 1: Add the "Appearance" section**

In `src/app/(app)/(tabs)/settings.tsx`, add the import:
```tsx
import { ThemeSwitcher } from '@/components/theme-switcher';
```

Insert a new section between the closing `</ThemedView>` of the account `styles.form` block and the `Sign out` button:
```tsx
        <ThemedView style={styles.appearance}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Appearance
          </ThemedText>
          <ThemeSwitcher />
        </ThemedView>

        <PrimaryButton title="Sign out" onPress={signOut} variant="danger" />
```
(The `Sign out` line already exists — this just shows what the new section goes directly above.)

Add to the `StyleSheet.create` call at the bottom of the file:
```ts
  appearance: {
    gap: Spacing.two,
  },
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Full manual walkthrough**

Run the app (`npx expo start --web` is sufficient for this session's tooling). In Settings:
1. Confirm the new "Appearance" section lists all 9 themes, each with its name and color dots, "Classic" pre-selected.
2. Tap through several of the 8 palette themes one at a time. For each, confirm: the Tasks screen, Group screen, History screen, and buttons across the app restyle immediately (no reload needed); text stays legible on every surface; the "Delete"/danger-colored elements (e.g. History's delete icon, Settings' "Delete account" flow) still read as red.
3. Reload the page after picking a non-Classic theme — confirm it comes back showing the same theme (AsyncStorage persistence).
4. Switch back to Classic — confirm the app returns to looking exactly as it did before this feature existed, and that it's the only one that would visually respond to toggling the OS/browser's light-dark preference (the 8 palette themes stay fixed either way).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/(tabs)/settings.tsx"
git commit -m "feat: add theme switcher to Settings"
```
