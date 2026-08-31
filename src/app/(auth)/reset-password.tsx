import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const { beginPasswordRecovery, endPasswordRecovery, updatePassword } = useSession();
  const url = Linking.useLinkingURL();
  const handledUrl = useRef<string | null>(null);

  const [linkError, setLinkError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url || handledUrl.current === url) {
      return;
    }
    handledUrl.current = url;

    const { params, errorCode } = getQueryParams(url);
    if (errorCode || !params.access_token || !params.refresh_token) {
      queueMicrotask(() => setLinkError('This reset link is invalid or has expired. Request a new one.'));
      return;
    }

    beginPasswordRecovery();
    supabase.auth
      .setSession({ access_token: params.access_token, refresh_token: params.refresh_token })
      .then(({ error }) => {
        if (error) {
          setLinkError(getErrorMessage(error, 'This reset link is invalid or has expired. Request a new one.'));
          endPasswordRecovery();
          return;
        }
        setSessionReady(true);
      });
  }, [url, beginPasswordRecovery, endPasswordRecovery]);

  async function handleSubmit() {
    setFormError(null);

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      // Session is already valid — clearing recovery mode lets the root
      // guard route into (app) on its own, same as every other auth flow.
      endPasswordRecovery();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not update your password.'));
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
                Set a new password
              </ThemedText>
              {!linkError ? (
                <ThemedText themeColor="textSecondary" style={styles.centerText}>
                  Choose a new password for your account.
                </ThemedText>
              ) : null}
            </ThemedView>

            {linkError ? (
              <ThemedView style={styles.form}>
                <ThemedText type="small" themeColor="danger" style={styles.centerText}>
                  {linkError}
                </ThemedText>
                <Link href="/forgot-password" replace style={styles.link}>
                  <ThemedText type="linkPrimary">Request a new link</ThemedText>
                </Link>
              </ThemedView>
            ) : sessionReady ? (
              <ThemedView style={styles.form}>
                <TextField
                  label="New password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password-new"
                  placeholder="••••••••"
                />
                <TextField
                  label="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoComplete="password-new"
                  placeholder="••••••••"
                />
                {formError ? (
                  <ThemedText type="small" themeColor="danger">
                    {formError}
                  </ThemedText>
                ) : null}
                <PrimaryButton title="Update password" onPress={handleSubmit} loading={loading} />
              </ThemedView>
            ) : (
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                Verifying your reset link…
              </ThemedText>
            )}
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
