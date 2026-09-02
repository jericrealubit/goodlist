import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { Fonts, Spacing } from './theme';

/**
 * A "design style" is the second theming axis (independent of the color
 * palette): it controls shape (corner radius), density (spacing scale),
 * typography (font family + weight character), and surface treatment
 * (flat / elevated / glass). `classic` reproduces the app's original look
 * exactly, so selecting it is a visual no-op.
 */
export type StyleId = 'classic' | 'soft' | 'minimal' | 'glass';

export type SurfaceTreatment = 'flat' | 'elevated' | 'glass';

export type SpacingScale = {
  half: number;
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
  six: number;
};

export type RadiiScale = {
  sm: number;
  md: number;
  lg: number;
  pill: number;
};

export type StyleTokens = {
  spacing: SpacingScale;
  radii: RadiiScale;
  /** Border width for controls (inputs, text fields). */
  borderWidth: number;
  /** Border width for card surfaces (task rows, cards). Classic cards are borderless. */
  cardBorderWidth: number;
  surface: SurfaceTreatment;
  /** Applied to elevated/glass surfaces; empty object = no shadow. */
  shadow: ViewStyle;
  font: {
    /** Omit to use the platform default font (keeps Classic unchanged). */
    family?: string;
    /** Large display headings (title, subtitle). */
    titleWeight: TextStyle['fontWeight'];
    /** Section headers + bold labels (header, smallBold). */
    headingWeight: TextStyle['fontWeight'];
    /** Body/small/link text. */
    bodyWeight: TextStyle['fontWeight'];
    /** Applied to display headings (title/subtitle/header) only. */
    headingLetterSpacing?: number;
  };
};

export type StyleDefinition = {
  id: StyleId;
  label: string;
  description: string;
  tokens: StyleTokens;
};

const NO_SHADOW: ViewStyle = {};

const SOFT_SHADOW: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 4,
};

const SUBTLE_SHADOW: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};

// The Classic spacing scale is exactly today's global Spacing, so Classic is a
// pixel-identical baseline once layout containers read spacing from tokens.
const CLASSIC_SPACING: SpacingScale = { ...Spacing };

export const styleVariants: Record<StyleId, StyleDefinition> = {
  classic: {
    id: 'classic',
    label: 'Classic',
    description: 'The original look — balanced and familiar.',
    tokens: {
      spacing: CLASSIC_SPACING,
      radii: { sm: 8, md: 12, lg: 16, pill: 999 },
      borderWidth: 1,
      cardBorderWidth: 0,
      surface: 'flat',
      shadow: NO_SHADOW,
      font: {
        // Classic keeps the platform-default font it always used.
        titleWeight: '600',
        headingWeight: '700',
        bodyWeight: '500',
      },
    },
  },
  soft: {
    id: 'soft',
    label: 'Soft',
    description: 'Rounded and playful, with roomy spacing and gentle shadows.',
    tokens: {
      spacing: { half: 3, one: 6, two: 12, three: 20, four: 28, five: 40, six: 72 },
      radii: { sm: 14, md: 20, lg: 28, pill: 999 },
      borderWidth: 0,
      cardBorderWidth: 0,
      surface: 'elevated',
      shadow: SOFT_SHADOW,
      font: {
        family: Fonts.rounded,
        titleWeight: '800',
        headingWeight: '700',
        bodyWeight: '500',
      },
    },
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Sharp and compact, with hairline borders and tight type.',
    tokens: {
      spacing: { half: 2, one: 3, two: 6, three: 12, four: 18, five: 24, six: 48 },
      radii: { sm: 2, md: 4, lg: 6, pill: 6 },
      borderWidth: StyleSheet.hairlineWidth,
      cardBorderWidth: StyleSheet.hairlineWidth,
      surface: 'flat',
      shadow: NO_SHADOW,
      font: {
        family: Fonts.sans,
        titleWeight: '600',
        headingWeight: '600',
        bodyWeight: '400',
        headingLetterSpacing: -0.5,
      },
    },
  },
  glass: {
    id: 'glass',
    label: 'Glass',
    description: 'Translucent frosted surfaces with a soft, modern feel.',
    tokens: {
      spacing: CLASSIC_SPACING,
      radii: { sm: 12, md: 18, lg: 24, pill: 999 },
      borderWidth: 1,
      cardBorderWidth: 1,
      surface: 'glass',
      shadow: SUBTLE_SHADOW,
      font: {
        family: Fonts.rounded,
        titleWeight: '700',
        headingWeight: '700',
        bodyWeight: '500',
      },
    },
  },
};

export const STYLE_LIST: StyleDefinition[] = Object.values(styleVariants);
