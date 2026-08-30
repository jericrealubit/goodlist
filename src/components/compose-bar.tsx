import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  const canSubmit = value.trim().length > 0 && !submitting;

  return (
    <ThemedView style={styles.container}>
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
          },
        ]}
      />
      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel="Add task"
        accessibilityState={{ disabled: !canSubmit }}
        style={({ pressed }) => [
          styles.sendButton,
          { backgroundColor: theme.primary, opacity: !canSubmit ? 0.4 : pressed ? 0.85 : 1 },
        ]}>
        {submitting ? <ActivityIndicator color="#ffffff" size="small" /> : <ThemedText style={styles.sendGlyph}>↑</ThemedText>}
      </Pressable>
    </ThemedView>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlyph: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
