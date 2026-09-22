import { Stack } from 'expo-router';

import { useMedicationReminders } from '@/hooks/use-medication-reminders';
import { usePresenceHeartbeat } from '@/hooks/use-presence-heartbeat';
import { usePurchasesIdentity } from '@/hooks/use-purchases-identity';
import { useSyncDeviceLocale } from '@/hooks/use-sync-device-locale';
import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const colors = useTheme();
  // Mounted here, not on the stats screen: "live users" has to count everyone
  // with the app open, not just whoever is reading the statistics.
  usePresenceHeartbeat();
  // Records the device's region/time zone once per signed-in session. Renders
  // nothing and never blocks — see the hook for why it's a no-op when the user
  // has opted out.
  useSyncDeviceLocale();
  usePurchasesIdentity();
  // Here, not on the Meds tab: a reminder must be answerable whichever screen
  // the app opens on, and an edit from another device must reschedule here.
  useMedicationReminders();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="task/[id]" options={{ title: 'Edit task', presentation: 'modal' }} />
      <Stack.Screen name="group/create" options={{ title: 'Create group', presentation: 'modal' }} />
      <Stack.Screen name="group/join" options={{ title: 'Join group', presentation: 'modal' }} />
      <Stack.Screen name="medication/[id]" options={{ title: 'Medicine', presentation: 'modal' }} />
      <Stack.Screen name="history" options={{ title: 'Completed tasks' }} />
      <Stack.Screen name="premium" options={{ title: 'Premium' }} />
      <Stack.Screen name="guide" options={{ title: 'How to use Goodlist' }} />
      <Stack.Screen name="stats" options={{ title: 'User statistics' }} />
      <Stack.Screen name="distribution" options={{ title: 'User distribution' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="terms" options={{ title: 'Terms of Service' }} />
    </Stack>
  );
}
