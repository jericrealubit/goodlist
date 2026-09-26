import { Ionicons } from '@expo/vector-icons';
import { useLayoutEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionIcons } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { tapLight } from '@/lib/haptics';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  /** Web only: grow a multiline field to fit its value instead of scrolling inside it. */
  autoGrow?: boolean;
};

const REVEAL_GLYPH_SIZE = 20;

export function TextField({
  label,
  error,
  style,
  autoGrow,
  multiline,
  value,
  secureTextEntry,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const tokens = useTokens();
  const inputRef = useRef<TextInput>(null);
  // Every masked field gets an eye to check what was typed — a mistyped
  // password is the most common reason a login fails.
  const [revealed, setRevealed] = useState(false);

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

  const box = {
    borderColor: error ? theme.danger : theme.border,
    backgroundColor: theme.backgroundElement,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radii.sm,
  };
  const text = {
    color: theme.text,
    paddingHorizontal: tokens.spacing.three,
    paddingVertical: tokens.spacing.two,
  };
  const inputProps = {
    ref: inputRef,
    accessibilityLabel: label,
    placeholderTextColor: theme.textSecondary,
    multiline,
    value,
    secureTextEntry: secureTextEntry && !revealed,
    ...rest,
  };

  return (
    <View style={[styles.container, { gap: tokens.spacing.one }]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      {secureTextEntry ? (
        // The border and fill move to a row so the eye sits inside the field.
        <View style={[styles.inputRow, box]}>
          <TextInput {...inputProps} style={[styles.input, styles.inputFill, text, { paddingRight: 0 }, style]} />
          <Pressable
            onPress={() => {
              tapLight();
              setRevealed((current) => !current);
            }}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={8}
            style={[styles.revealButton, { paddingHorizontal: tokens.spacing.three }]}>
            <Ionicons
              name={revealed ? ActionIcons.hidePassword : ActionIcons.showPassword}
              size={REVEAL_GLYPH_SIZE}
              color={theme.textSecondary}
            />
          </Pressable>
        </View>
      ) : (
        <TextInput {...inputProps} style={[styles.input, text, box, style]} />
      )}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  input: {
    fontSize: 16,
  },
  inputFill: {
    flex: 1,
  },
  revealButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
});
