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
  } as ThemeTokens;
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
    tokens: { light: Colors.light as ThemeTokens, dark: Colors.dark as unknown as ThemeTokens },
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
