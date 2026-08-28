import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/loading-state';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, WebTopNavInset } from '@/constants/theme';
import { useSession } from '@/contexts/session-context';
import { updateDisplayName } from '@/lib/mutations/profile';
import { getMyProfile } from '@/lib/queries/profile';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
      setError(err instanceof Error ? err.message : 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <LoadingState />;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedView
        style={[
          styles.content,
          {
            paddingTop: insets.top + WebTopNavInset + Spacing.five,
            paddingBottom: insets.bottom + BottomTabInset,
          },
        ]}>
        <ThemedText type="title">Settings</ThemedText>

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

        <PrimaryButton title="Sign out" onPress={signOut} variant="danger" />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  form: {
    gap: Spacing.three,
  },
});
