import { forwardRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { MicButton } from '@/components/mic-button';
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
  /**
   * Absent where the platform can't listen — Firefox, Brave, an Android phone
   * with no speech service. The bar then renders exactly as it did before
   * voice existed, rather than offering a button that fails when pressed.
   */
  onVoicePress?: () => void;
  voice?: { listening: boolean; starting: boolean; level: number };
};

export const ComposeBar = forwardRef<TextInput, ComposeBarProps>(function ComposeBar(
  { value, onChangeText, onSubmit, placeholder = 'I want to...', submitting, onVoicePress, voice },
  ref,
) {
  const theme = useTheme();
  const tokens = useTokens();
  const listening = !!voice?.listening;
  // Sending mid-sentence would commit half of what was said, so the button
  // waits for the microphone to finish.
  const canSubmit = value.trim().length > 0 && !submitting && !listening;

  return (
    <ThemedView style={[styles.container, { gap: tokens.spacing.two }]}>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={listening ? 'Listening…' : placeholder}
        placeholderTextColor={theme.textSecondary}
        onSubmitEditing={() => canSubmit && onSubmit()}
        blurOnSubmit={false}
        returnKeyType="send"
        // While the recognizer is feeding the field, the text on screen is not
        // this component's to edit — it belongs to the sentence being spoken.
        editable={!listening}
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: listening ? theme.danger : theme.border,
            backgroundColor: theme.backgroundElement,
            borderWidth: tokens.borderWidth,
            borderRadius: tokens.radii.pill,
            paddingHorizontal: tokens.spacing.three,
            paddingVertical: tokens.spacing.two,
          },
        ]}
      />
      {onVoicePress ? (
        <MicButton
          listening={listening}
          starting={!!voice?.starting}
          level={voice?.level ?? 0}
          onPress={onVoicePress}
          disabled={submitting}
        />
      ) : null}
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
