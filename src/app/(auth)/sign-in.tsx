import { Image } from 'expo-image';
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

export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
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
              <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
              <ThemedText type="title" style={styles.centerText}>
                Goodlist
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                A better place for your everyday tasks.
              </ThemedText>
            </ThemedView>

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
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                placeholder="••••••••"
              />
              {error ? (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              ) : null}
              <PrimaryButton title="Log in" onPress={handleSignIn} loading={loading} />
            </ThemedView>

            <Link href="/sign-up" style={styles.link}>
              <ThemedText type="linkPrimary">Create an account</ThemedText>
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
    gap: Spacing.five,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: Spacing.two,
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
