import { forwardRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { SendButton } from '@/components/send-button';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';

type ComposeBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  submitting?: boolean;
};

export const ComposeBar = forwardRef<TextInput, ComposeBarProps>(function ComposeBar(
  { value, onChangeText, onSubmit, placeholder = 'I want to...', submitting },
  ref,
) {
  const theme = useTheme();
  const tokens = useTokens();
  const canSubmit = value.trim().length > 0 && !submitting;

  return (
    <ThemedView style={[styles.container, { gap: tokens.spacing.two }]}>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        onSubmitEditing={() => canSubmit && onSubmit()}
        blurOnSubmit={false}
        returnKeyType="send"
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.backgroundElement,
            borderWidth: tokens.borderWidth,
            borderRadius: tokens.radii.pill,
            paddingHorizontal: tokens.spacing.three,
            paddingVertical: tokens.spacing.two,
          },
        ]}
      />
      <SendButton onPress={onSubmit} disabled={!canSubmit} loading={submitting} />
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
});
