import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

type TextType =
  | 'default'
  | 'title'
  | 'header'
  | 'small'
  | 'smallBold'
  | 'subtitle'
  | 'link'
  | 'linkPrimary'
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

// Large display headings get title weight + optional letter-spacing.
const DISPLAY_TYPES: TextType[] = ['title', 'subtitle', 'header'];
// `header` uses heading weight; title/subtitle use title weight.
const TITLE_TYPES: TextType[] = ['title', 'subtitle'];
// Bold labels: heading weight, but no display letter-spacing.
const HEADING_WEIGHT_TYPES: TextType[] = ['header', 'smallBold'];

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { font } = useTokens();

  // The type scale (size/line-height) stays fixed; the active design style
  // controls font family, weight, and letter-spacing. `code` keeps the mono
  // family regardless of style.
  const fontWeight = TITLE_TYPES.includes(type)
    ? font.titleWeight
    : HEADING_WEIGHT_TYPES.includes(type)
      ? font.headingWeight
      : font.bodyWeight;

  const fontStyle: TextStyle =
    type === 'code'
      ? { fontFamily: Fonts.mono }
      : {
          ...(font.family ? { fontFamily: font.family } : null),
          fontWeight,
          ...(DISPLAY_TYPES.includes(type) && font.headingLetterSpacing != null
            ? { letterSpacing: font.headingLetterSpacing }
            : null),
        };

  const linkColor = type === 'linkPrimary' ? { color: theme.primary } : null;

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'header' && styles.header,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        fontStyle,
        linkColor,
        style,
      ]}
      {...rest}
    />
  );
}

// Sizes/line-heights only — weights/families now come from the active style's
// tokens (see fontStyle above), so they're intentionally omitted here.
const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 48,
    lineHeight: 52,
  },
  header: {
    fontSize: 24,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
