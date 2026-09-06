import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useProfileQuery } from '@/hooks/use-profile-query';
import { useUpdateDisplayNameMutation } from '@/hooks/use-profile-mutations';
import { useTabScreenInsets } from '@/hooks/use-tab-screen-insets';
import { getErrorMessage } from '@/lib/errors';
import { deleteMyAccount } from '@/lib/mutations/account';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { topInset, bottomInset } = useTabScreenInsets();
  const { user, signOut } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfileQuery();
  const updateDisplayNameMutation = useUpdateDisplayNameMutation();
  const isOnline = useOnlineStatus();
  const [displayName, setDisplayName] = useState('');
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Seed the editable field from the fetched profile exactly once (not on
  // every background refetch, which would clobber an in-progress edit).
  // Adjusting state during render like this — rather than in a useEffect —
  // is the pattern React recommends for "reset state when a prop changes":
  // https://react.dev/learn/you-might-not-need-an-effect
  if (profile && loadedProfileId !== profile.id) {
    setLoadedProfileId(profile.id);
    setDisplayName(profile.display_name ?? '');
  }

  function handleSave() {
    if (!user) return;
    setError(null);
    updateDisplayNameMutation.mutate(
      { userId: user.id, displayName },
      {
        onError: (err) => {
          setError(getErrorMessage(err, 'Could not save your changes.'));
          setSaved(false);
        },
      },
    );
    setSaved(true);
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
    // Wipe the cache (including any paused offline mutations) before signing
    // out — the account is already gone server-side, so nothing queued for
    // it should ever be replayed.
    queryClient.clear();
    queryClient.getMutationCache().clear();
    // The account row is already gone server-side at this point, so a normal
    // signOut() may fail validating a session whose user no longer exists.
    // scope: 'local' just clears on-device storage without that round trip,
    // which is all that's needed to land back on the sign-in screen.
    await supabase.auth.signOut({ scope: 'local' });
  }

  if (profileLoading) {
    return <LoadingState />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset + Spacing.four,
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
          <PrimaryButton title="Save" onPress={handleSave} />
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
              {!isOnline ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Deleting your account requires an internet connection.
                </ThemedText>
              ) : null}
              <PrimaryButton
                title="Yes, delete my account"
                onPress={handleDeleteAccount}
                loading={deleting}
                disabled={!isOnline}
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
