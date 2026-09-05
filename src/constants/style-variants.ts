import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Shape of the "design style" half of a theme: shape (corner radius),
 * density (spacing scale), typography (font family + weight character), and
 * surface treatment (flat / elevated / glass). Each theme in
 * `src/constants/themes.ts` bundles one of these alongside its color palette
 * — style is no longer an independently selectable axis.
 */
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
  /** Border width for card surfaces (task rows, cards). */
  cardBorderWidth: number;
  surface: SurfaceTreatment;
  /** Applied to elevated/glass surfaces; empty object = no shadow. */
  shadow: ViewStyle;
  font: {
    /** Omit to use the platform default font. */
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
