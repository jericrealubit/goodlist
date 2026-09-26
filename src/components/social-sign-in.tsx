import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ActionIcons, type IconName } from '@/constants/icons';
import { type OAuthProvider, useSession } from '@/contexts/session-context';
import { useTheme } from '@/hooks/use-theme';
import { useTokens } from '@/hooks/use-tokens';
import { getErrorMessage } from '@/lib/errors';

type SocialSignInProps = {
  /** Set while the email form is submitting, so only one sign-in runs at a time. */
  disabled?: boolean;
  /** Receives a message to show, or null when a new attempt starts. */
  onError: (message: string | null) => void;
};

const PROVIDERS: { provider: OAuthProvider; title: string; icon: IconName }[] = [
  { provider: 'google', title: 'Continue with Google', icon: ActionIcons.google },
  { provider: 'facebook', title: 'Continue with Facebook', icon: ActionIcons.facebook },
];

export function SocialSignIn({ disabled, onError }: SocialSignInProps) {
  const { signInWithProvider } = useSession();
  const theme = useTheme();
  const tokens = useTokens();
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  async function handlePress(provider: OAuthProvider) {
    onError(null);
    setPending(provider);
    try {
      await signInWithProvider(provider);
    } catch (err) {
      onError(getErrorMessage(err, 'Could not sign in.'));
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={{ gap: tokens.spacing.three }}>
      <View style={[styles.divider, { gap: tokens.spacing.two }]}>
        <View style={[styles.rule, { backgroundColor: theme.border }]} />
        <ThemedText type="small" themeColor="textSecondary">
          or continue with
        </ThemedText>
        <View style={[styles.rule, { backgroundColor: theme.border }]} />
      </View>
      {PROVIDERS.map(({ provider, title, icon }) => (
        <PrimaryButton
          key={provider}
          title={title}
          icon={icon}
          variant="secondary"
          onPress={() => handlePress(provider)}
          loading={pending === provider}
          disabled={disabled || (pending !== null && pending !== provider)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
