import { useLayoutEffect, useRef } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  /** Web only: grow a multiline field to fit its value instead of scrolling inside it. */
  autoGrow?: boolean;
};

export function TextField({ label, error, style, autoGrow, multiline, value, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const tokens = useTokens();
  const inputRef = useRef<TextInput>(null);

  // react-native-web renders a multiline TextInput as a <textarea>, which keeps
  // the height it started at and scrolls internally instead of growing the way a
  // native TextInput does. Measure the content and set the height ourselves.
  // Keyed on `value`, not onContentSizeChange: RNW only fires that while typing,
  // never when the value is set programmatically — which is how a loaded task
  // fills this field. The height is written straight to the node rather than
  // held in state: React never sets `height` here, so it won't overwrite it,
  // and this avoids a second render on every keystroke.
  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || !autoGrow || !multiline) return;
    const node = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!node) return;

    const apply = () => {
      // Nothing to measure when empty; clearing hands the field back to the
      // caller's minHeight.
      if (!value) {
        node.style.height = '';
        return;
      }
      // Collapse first or the field can grow but never shrink. scrollHeight
      // covers padding but not the border, and the textarea is border-box.
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight + tokens.borderWidth * 2}px`;
    };

    apply();
    // A narrower window re-wraps the text into more lines.
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [autoGrow, multiline, value, tokens.borderWidth]);

  return (
    <View style={[styles.container, { gap: tokens.spacing.one }]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        ref={inputRef}
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        value={value}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: error ? theme.danger : theme.border,
            backgroundColor: theme.backgroundElement,
            borderWidth: tokens.borderWidth,
            borderRadius: tokens.radii.sm,
            paddingHorizontal: tokens.spacing.three,
            paddingVertical: tokens.spacing.two,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  input: {
    fontSize: 16,
  },
});
