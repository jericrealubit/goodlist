import type { ViewStyle } from 'react-native';

import { Fonts } from './theme';
import type { StyleTokens } from './style-variants';

export type ThemeId =
  | 'minimalSage'
  | 'darkNeon'
  | 'colorful3d'
  | 'swissMonochrome'
  | 'lavenderGlass'
  | 'brutalist'
  | 'paperCollage'
  | 'darkLuxury'
  | 'natureZen';

export type ThemeColors = {
  text: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
  primary: string;
  accent: string;
  danger: string;
  border: string;
};

// Kept for the `ThemeColor` type (keyof) used by ThemedText/ThemedView's
// `themeColor` prop — every theme's `colors` below has this exact shape.
export type ThemeTokens = ThemeColors;

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  /** Preview swatches for the switcher's color dots. */
  swatches: string[];
  colors: ThemeColors;
  tokens: StyleTokens;
};

const NO_SHADOW: ViewStyle = {};

const SOFT_SHADOW: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 3,
};

const PRONOUNCED_SHADOW: ViewStyle = {
  shadowColor: '#1B2A63',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 16,
  elevation: 6,
};

const PURPLE_GLOW: ViewStyle = {
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.35,
  shadowRadius: 14,
  elevation: 5,
};

const GOLD_GLOW: ViewStyle = {
  shadowColor: '#D4AF6A',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.2,
  shadowRadius: 10,
  elevation: 3,
};

const WARM_SHADOW: ViewStyle = {
  shadowColor: '#8A6A46',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 2,
};

const AIRY_SPACING = { half: 3, one: 6, two: 12, three: 20, four: 28, five: 40, six: 72 };
const COMFORTABLE_SPACING = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 };
const COMPACT_SPACING = { half: 2, one: 3, two: 6, three: 12, four: 18, five: 24, six: 48 };

export const themes: Record<ThemeId, ThemeDefinition> = {
  minimalSage: {
    id: 'minimalSage',
    label: 'Minimal Sage',
    swatches: ['#7C9473', '#5F7855', '#F5F1E6'],
    colors: {
      text: '#2B2E28',
      background: '#F5F1E6',
      backgroundElement: '#FFFFFF',
      backgroundSelected: '#E8E2D0',
      textSecondary: '#6B7A63',
      primary: '#7C9473',
      accent: '#5F7855',
      danger: '#C0392B',
      border: '#E3DCC8',
    },
    tokens: {
      spacing: AIRY_SPACING,
      radii: { sm: 12, md: 18, lg: 24, pill: 999 },
      borderWidth: 0,
      cardBorderWidth: 0,
      surface: 'elevated',
      shadow: SOFT_SHADOW,
      font: { family: Fonts.rounded, titleWeight: '700', headingWeight: '700', bodyWeight: '500' },
    },
  },
  darkNeon: {
    id: 'darkNeon',
    label: 'Dark Neon',
    swatches: ['#7C3AED', '#22D3EE', '#000000'],
    colors: {
      text: '#FFFFFF',
      background: '#000000',
      backgroundElement: '#14141C',
      backgroundSelected: '#1E1E2C',
      textSecondary: '#9B9BB0',
      primary: '#7C3AED',
      accent: '#22D3EE',
      danger: '#FF4D6D',
      border: '#2A2A3A',
    },
    tokens: {
      spacing: COMFORTABLE_SPACING,
      radii: { sm: 10, md: 16, lg: 20, pill: 999 },
      borderWidth: 1,
      cardBorderWidth: 1,
      surface: 'elevated',
      shadow: PURPLE_GLOW,
      font: { titleWeight: '800', headingWeight: '700', bodyWeight: '600' },
    },
  },
  colorful3d: {
    id: 'colorful3d',
    label: 'Colorful 3D',
    swatches: ['#3B5FE0', '#FF6B4A', '#4FBFA1'],
    colors: {
      text: '#1B2A63',
      background: '#FAF6EF',
      backgroundElement: '#FFFFFF',
      backgroundSelected: '#F0E9DC',
      textSecondary: '#6B7290',
      primary: '#3B5FE0',
      accent: '#4FBFA1',
      danger: '#FF6B4A',
      border: '#ECE3D0',
    },
    tokens: {
      spacing: AIRY_SPACING,
      radii: { sm: 16, md: 22, lg: 28, pill: 999 },
      borderWidth: 0,
      cardBorderWidth: 0,
      surface: 'elevated',
      shadow: PRONOUNCED_SHADOW,
      font: { family: Fonts.rounded, titleWeight: '800', headingWeight: '700', bodyWeight: '600' },
    },
  },
  swissMonochrome: {
    id: 'swissMonochrome',
    label: 'Swiss Monochrome',
    swatches: ['#0A0A0A', '#E2231A', '#F5F4F2'],
    colors: {
      text: '#0A0A0A',
      background: '#F5F4F2',
      backgroundElement: '#FFFFFF',
      backgroundSelected: '#ECECEC',
      textSecondary: '#5A5A5A',
      primary: '#E2231A',
      accent: '#E2231A',
      danger: '#E2231A',
      border: '#0A0A0A',
    },
    tokens: {
      spacing: COMPACT_SPACING,
      radii: { sm: 0, md: 0, lg: 0, pill: 0 },
      borderWidth: 1,
      cardBorderWidth: 1,
      surface: 'flat',
      shadow: NO_SHADOW,
      font: { titleWeight: '800', headingWeight: '700', bodyWeight: '500', headingLetterSpacing: -1 },
    },
  },
  lavenderGlass: {
    id: 'lavenderGlass',
    label: 'Lavender Glass',
    swatches: ['#7C5CFC', '#22C7D9', '#E9E4FB'],
    colors: {
      text: '#2E2A4A',
      background: '#E9E4FB',
      backgroundElement: '#F3F0FD',
      backgroundSelected: '#D9CFFA',
      textSecondary: '#6E6690',
      primary: '#7C5CFC',
      accent: '#22C7D9',
      danger: '#E4685D',
      border: '#C9BEF2',
    },
    tokens: {
      spacing: AIRY_SPACING,
      radii: { sm: 14, md: 20, lg: 26, pill: 999 },
      borderWidth: 1,
      cardBorderWidth: 1,
      surface: 'glass',
      shadow: SOFT_SHADOW,
      font: { family: Fonts.rounded, titleWeight: '700', headingWeight: '700', bodyWeight: '500' },
    },
  },
  brutalist: {
    id: 'brutalist',
    label: 'Brutalist',
    swatches: ['#1E3AF1', '#FF3D7F', '#F2EEE4'],
    colors: {
      text: '#111111',
      background: '#F2EEE4',
      backgroundElement: '#F2EEE4',
      backgroundSelected: '#FFE14D',
      textSecondary: '#3A3A3A',
      primary: '#1E3AF1',
      accent: '#FF3D7F',
      danger: '#E8432E',
      border: '#111111',
    },
    tokens: {
      spacing: COMPACT_SPACING,
      radii: { sm: 0, md: 0, lg: 0, pill: 0 },
      borderWidth: 3,
      cardBorderWidth: 3,
      surface: 'flat',
      shadow: NO_SHADOW,
      font: { titleWeight: '900', headingWeight: '800', bodyWeight: '700', headingLetterSpacing: -1 },
    },
  },
  paperCollage: {
    id: 'paperCollage',
    label: 'Paper Collage',
    swatches: ['#C1694A', '#7C8F6E', '#EDE4D3'],
    colors: {
      text: '#3B3128',
      background: '#EDE4D3',
      backgroundElement: '#F7F1E4',
      backgroundSelected: '#E3D5B8',
      textSecondary: '#8A7A63',
      primary: '#C1694A',
      accent: '#7C8F6E',
      danger: '#C0392B',
      border: '#D9C9A8',
    },
    tokens: {
      spacing: AIRY_SPACING,
      radii: { sm: 10, md: 16, lg: 20, pill: 999 },
      borderWidth: 0,
      cardBorderWidth: 0,
      surface: 'elevated',
      shadow: WARM_SHADOW,
      font: { family: Fonts.serif, titleWeight: '600', headingWeight: '600', bodyWeight: '400' },
    },
  },
  darkLuxury: {
    id: 'darkLuxury',
    label: 'Dark Luxury',
    swatches: ['#D4AF6A', '#F2E6C9', '#000000'],
    colors: {
      text: '#F2E6C9',
      background: '#000000',
      backgroundElement: '#121212',
      backgroundSelected: '#1C1C1C',
      textSecondary: '#B8A46E',
      primary: '#D4AF6A',
      accent: '#D4AF6A',
      danger: '#C0392B',
      border: '#3A331F',
    },
    tokens: {
      spacing: AIRY_SPACING,
      radii: { sm: 10, md: 16, lg: 20, pill: 999 },
      borderWidth: 1,
      cardBorderWidth: 1,
      surface: 'elevated',
      shadow: GOLD_GLOW,
      font: { family: Fonts.serif, titleWeight: '600', headingWeight: '700', bodyWeight: '400', headingLetterSpacing: 1 },
    },
  },
  natureZen: {
    id: 'natureZen',
    label: 'Nature Zen',
    swatches: ['#6E8C5E', '#C98657', '#F1ECDF'],
    colors: {
      text: '#2F3B2A',
      background: '#F1ECDF',
      backgroundElement: '#FBF8F0',
      backgroundSelected: '#E6DFC9',
      textSecondary: '#7A8570',
      primary: '#6E8C5E',
      accent: '#C98657',
      danger: '#C0392B',
      border: '#E0D6BC',
    },
    tokens: {
      spacing: COMFORTABLE_SPACING,
      radii: { sm: 12, md: 18, lg: 22, pill: 999 },
      borderWidth: 0,
      cardBorderWidth: 0,
      surface: 'flat',
      shadow: NO_SHADOW,
      font: { family: Fonts.serif, titleWeight: '500', headingWeight: '600', bodyWeight: '400' },
    },
  },
};

export const THEME_LIST: ThemeDefinition[] = Object.values(themes);
