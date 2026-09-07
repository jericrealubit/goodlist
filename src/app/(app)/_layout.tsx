import { Stack } from 'expo-router';

import { useSyncDeviceLocale } from '@/hooks/use-sync-device-locale';
import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const colors = useTheme();
  // Records the device's region/time zone once per signed-in session. Renders
  // nothing and never blocks — see the hook for why it's a no-op when the user
  // has opted out.
  useSyncDeviceLocale();

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
      <Stack.Screen name="distribution" options={{ title: 'User distribution' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="terms" options={{ title: 'Terms of Service' }} />
    </Stack>
  );
}
