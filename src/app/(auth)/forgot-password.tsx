import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { getErrorMessage } from '@/lib/errors';

export default function ForgotPasswordScreen() {
  const { resetPasswordForEmail } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setError(null);
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('reset-password');
      await resetPasswordForEmail(email.trim(), redirectTo);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send the reset email.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.centerText}>
                Reset your password
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                Enter your email and we&apos;ll send you a link to set a new password.
              </ThemedText>
            </ThemedView>

            {sent ? (
              <ThemedText type="small" themeColor="accent" style={styles.centerText}>
                Check your email for a link to reset your password.
              </ThemedText>
            ) : (
              <ThemedView style={styles.form}>
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                />
                {error ? (
                  <ThemedText type="small" themeColor="danger">
                    {error}
                  </ThemedText>
                ) : null}
                <PrimaryButton title="Send reset link" onPress={handleSend} loading={loading} disabled={!email.trim()} />
              </ThemedView>
            )}

            <Link href="/sign-in" replace style={styles.link}>
              <ThemedText type="linkPrimary">Back to log in</ThemedText>
            </Link>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.five,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  centerText: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  link: {
    alignSelf: 'center',
  },
});
