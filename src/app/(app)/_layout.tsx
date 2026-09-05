import { Stack } from 'expo-router';

import { GroupProvider } from '@/contexts/group-context';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const colors = useTheme();

  return (
    <GroupProvider>
      <NotificationsProvider>
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
          <Stack.Screen name="about" options={{ title: 'About' }} />
          <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
          <Stack.Screen name="terms" options={{ title: 'Terms of Service' }} />
        </Stack>
      </NotificationsProvider>
    </GroupProvider>
  );
}
