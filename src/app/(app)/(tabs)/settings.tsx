import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';
import { getErrorMessage } from '@/lib/errors';
import { deleteMyAccount } from '@/lib/mutations/account';
import { updateDisplayName } from '@/lib/mutations/profile';
import { getMyProfile } from '@/lib/queries/profile';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const { topInset, bottomInset } = useTabScreenInsets();
  const { user, signOut } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getMyProfile().then((profile) => {
        if (!cancelled) {
          setDisplayName(profile?.display_name ?? '');
          setLoaded(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  async function handleSave() {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateDisplayName(displayName);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your changes.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteMyAccount();
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Could not delete your account.'));
      setDeleting(false);
      return;
    }
    // The account row is already gone server-side at this point, so a normal
    // signOut() may fail validating a session whose user no longer exists.
    // scope: 'local' just clears on-device storage without that round trip,
    // which is all that's needed to land back on the sign-in screen.
    await supabase.auth.signOut({ scope: 'local' });
  }

  if (!loaded) {
    return <LoadingState />;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={[styles.header, { paddingTop: topInset + Spacing.two }]}>
        <ThemedText type="header">{user?.email ?? ''}</ThemedText>
      </ThemedView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.four,
            paddingBottom: bottomInset + Spacing.four,
          },
        ]}
        keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.form}>
          <TextField label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
          <TextField label="Email" value={user?.email ?? ''} editable={false} />
          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
          {saved ? (
            <ThemedText type="small" themeColor="accent">
              Saved.
            </ThemedText>
          ) : null}
          <PrimaryButton title="Save" onPress={handleSave} loading={saving} />
        </ThemedView>

        <ThemedView style={styles.appearance}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Theme
          </ThemedText>
          <ThemeSwitcher />
        </ThemedView>

        <PrimaryButton title="Sign out" onPress={signOut} variant="danger" />

        <ThemedView style={styles.dangerZone}>
          {deleteError ? (
            <ThemedText type="small" themeColor="danger">
              {deleteError}
            </ThemedText>
          ) : null}
          {confirmingDelete ? (
            <>
              <ThemedText type="small" themeColor="danger">
                This permanently deletes your account and all of your tasks. This can&apos;t be
                undone. If you own a household with other members, transfer ownership or remove
                them first — you won&apos;t be able to delete your account until you do.
              </ThemedText>
              <PrimaryButton
                title="Yes, delete my account"
                onPress={handleDeleteAccount}
                loading={deleting}
                variant="danger"
              />
              <PrimaryButton
                title="Cancel"
                onPress={() => setConfirmingDelete(false)}
                disabled={deleting}
                variant="secondary"
              />
            </>
          ) : (
            <PrimaryButton title="Delete account" onPress={() => setConfirmingDelete(true)} variant="secondary" />
          )}
        </ThemedView>

        <ThemedView style={styles.legal}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Legal
          </ThemedText>
          <Pressable onPress={() => router.push('/about')}>
            <ThemedText type="link" themeColor="textSecondary">
              About
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/privacy')}>
            <ThemedText type="link" themeColor="textSecondary">
              Privacy Policy
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => router.push('/terms')}>
            <ThemedText type="link" themeColor="textSecondary">
              Terms of Service
            </ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.half,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  form: {
    gap: Spacing.three,
  },
  appearance: {
    gap: Spacing.two,
  },
  dangerZone: {
    gap: Spacing.two,
  },
  legal: {
    gap: Spacing.two,
  },
});
