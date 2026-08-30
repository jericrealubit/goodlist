# Theme switcher (9 themes)

## Context

The app has one hardcoded color scheme (`Colors.light`/`Colors.dark` in
`src/constants/theme.ts`), consumed everywhere through a single `useTheme()`
hook. The user supplied 8 named decorative palettes (as swatch-reference
images in `C:\dev\aaa-pallete`, 4-6 raw hex colors each) and wants a theme
switcher offering all 8 plus the existing scheme, renamed "Classic" — 9
themes total, applied app-wide.

Source palettes (raw swatches, extracted from the reference images):

| Palette | Swatches |
|---|---|
| Neutral Elegance | `#FFDBBB` `#CCBEB1` `#997E67` `#664930` |
| Seashell Garnet Afternoon | `#F6C992` `#30525C` `#ACC0D3` `#D396A6` `#09A1A1` `#5484A4` |
| Tropical Jade Sunrise | `#FCA47C` `#23CED9` `#F9D779` `#A1CCA6` `#097C87` |
| Jade Pebble Morning | `#7B9669` `#E6E6E6` `#6C8480` `#BAC8B1` `#404E3B` |
| Sapphire Nightfall Whisper | `#0474C4` `#5379AE` `#2C444C` `#A8C4EC` `#06457F` `#262B40` |
| Ocean Ruby Radiance | `#D8226C` `#B2DAE4` `#F86A38` `#029456` `#005BB3` |
| Jelly Shoes | `#E0AFFF` `#C4D6FF` `#DD68E3` `#8866DE` |
| Freshly Squeezed | `#FFBF00` `#F2CF7E` `#FFE642` `#FF7900` |

## Goals

- 9 selectable themes (Classic + 8 palettes), switchable from Settings,
  applied to every themed surface in the app.
- Classic keeps following the system/device light-dark setting, exactly as
  today. Each of the 8 palette themes is one fixed look (doesn't split into
  separate light/dark variants).
- Selection persists locally (`AsyncStorage`, already a dependency) and
  applies immediately, no app restart or explicit save step.
- Destructive/error color (`danger`) always reads as red, regardless of
  theme.

## Non-goals

- Cross-device sync of the theme choice (explicitly out of scope per
  earlier discussion — local-only for now).
- Per-theme dark variants for the 8 palettes.
- User-defined/custom themes beyond these 9.

## Architecture

### Color derivation utility — `src/lib/color.ts` (new)

Two small pure functions, used to derive the "structural" tokens
(surfaces, secondary text) from a single seed color per theme, instead of
hand-picking ~80 hex values by eye:

```ts
export function mixWithWhite(hex: string, amount: number): string // amount 0-1, 1 = pure white
export function mixWithBlack(hex: string, amount: number): string
```

### Theme registry — `src/constants/themes.ts` (new)

```ts
export type ThemeId =
  | 'classic' | 'neutralElegance' | 'seashellGarnetAfternoon'
  | 'tropicalJadeSunrise' | 'jadePebbleMorning' | 'sapphireNightfallWhisper'
  | 'oceanRubyRadiance' | 'jellyShoes' | 'freshlySqueezed';

export type ThemeTokens = {
  text: string; background: string; backgroundElement: string;
  backgroundSelected: string; textSecondary: string; primary: string;
  accent: string; danger: string; border: string;
};

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  swatches: string[];              // raw palette hexes, for the switcher's preview dots
  tokens: { light: ThemeTokens; dark: ThemeTokens };
};
```

`classic` keeps its existing hand-tuned `light`/`dark` token sets verbatim
(today's `Colors.light`/`Colors.dark`, unchanged).

Each of the 8 palette themes is defined via a small seed + a shared
`buildFixedTheme()` helper, rather than hardcoding all 9 tokens by hand:

```ts
type FixedThemeSeed = {
  primary: string;       // the palette's hero/most versatile swatch
  accent: string;        // a second, visually distinct swatch (or a shade of primary if none exists)
  seedLight: string;     // lightest/most neutral swatch — base for background/backgroundElement/backgroundSelected/border
  seedDark?: string;     // darkest swatch, if dark enough to read as body text — omitted when none qualifies
};

function buildFixedTheme(seed: FixedThemeSeed): ThemeTokens {
  const text = seed.seedDark ?? '#1A1A1A'; // synthesized near-black fallback
  return {
    text,
    background: mixWithWhite(seed.seedLight, 0.95),
    backgroundElement: mixWithWhite(seed.seedLight, 0.88),
    backgroundSelected: mixWithWhite(seed.seedLight, 0.80),
    border: mixWithWhite(seed.seedLight, 0.85),
    textSecondary: mixWithWhite(text, 0.4),
    primary: seed.primary,
    accent: seed.accent,
    danger: '#C0392B', // fixed across every theme, see Goals
  };
}
// tokens.light = tokens.dark = buildFixedTheme(seed) — same fixed look either way
```

Per-theme seed assignments (which raw swatch plays which role — the actual
design decision; the surfaces are then mechanically derived from these by
the formula above):

| Theme | primary | accent | seedLight | seedDark (text) |
|---|---|---|---|---|
| Neutral Elegance | `#997E67` | `#664930` | `#FFDBBB` | `#664930` |
| Seashell Garnet Afternoon | `#09A1A1` | `#D396A6` | `#F6C992` | `#30525C` |
| Tropical Jade Sunrise | `#097C87` | `#FCA47C` | `#F9D779` | *(none — synthesized)* |
| Jade Pebble Morning | `#7B9669` | `#6C8480` | `#E6E6E6` | `#404E3B` |
| Sapphire Nightfall Whisper | `#0474C4` | `#06457F` | `#A8C4EC` | `#262B40` |
| Ocean Ruby Radiance | `#005BB3` | `#D8226C` | `#B2DAE4` | *(none — synthesized)* |
| Jelly Shoes | `#8866DE` | `#DD68E3` | `#C4D6FF` | *(none — synthesized)* |
| Freshly Squeezed | `#FF7900` | `#FFBF00` | `#F2CF7E` | *(none — synthesized)* |

`swatches` (switcher preview dots) = that theme's full raw palette list from
the Context table above.

Rationale for palettes without a `seedDark`: none of their swatches are
dark enough to double as body text at acceptable contrast, so `text` falls
back to the synthesized near-black rather than forcing a too-light color
into that slot.

### Persistence & context — `src/contexts/theme-context.tsx` (new)

`ThemeProvider` / `useSelectedTheme()`: loads the saved `ThemeId` from
`AsyncStorage` on mount (key e.g. `goodlist.themeId`, default `'classic'`
if unset or invalid), exposes `{ themeId, setThemeId }` (persists to
`AsyncStorage` on every change). Wraps the app at root
(`src/app/_layout.tsx`), alongside the existing `SessionProvider`.

### `useTheme()` — `src/hooks/use-theme.ts` (updated)

```ts
export function useTheme() {
  const scheme = useColorScheme();
  const { themeId } = useSelectedTheme();
  const mode = scheme === 'unspecified' ? 'light' : (scheme ?? 'light');
  return themes[themeId].tokens[mode];
}
```

Same return shape as today — every existing consumer (`ThemedView`,
`ThemedText`, every screen) needs no changes. `src/app/(app)/_layout.tsx`'s
native-header colors (`headerStyle`/`headerTintColor`), which already read
from this same color source, pick up the selected theme automatically.

## Switcher UI

New `src/components/theme-switcher.tsx`: a vertical list of all 9 themes.
Extends the existing `OptionPicker` row/selected-state pattern
(`src/components/option-picker.tsx`) with a small row of color-dot swatches
next to each label (from that theme's `swatches`), rather than introducing
new selection UI. Selecting a theme calls `setThemeId` immediately — no
separate save step.

Placement: a new "Appearance" section in
`src/app/(app)/(tabs)/settings.tsx`, between the account form and the
"Sign out" button.

## Verification

1. `npx tsc --noEmit`.
2. Web walkthrough: cycle through all 9 themes from Settings; confirm the
   whole app (Tasks list, Group, History, buttons, modal screens) restyles
   correctly and stays legible in each; confirm Classic still follows the
   system light/dark toggle while the 8 palette themes don't; confirm the
   selection survives a full page reload.
3. Spot-check: destructive buttons/text read as red in every theme; white
   button text stays legible against every theme's `primary` and `accent`.
