import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { GroupProvider } from '@/contexts/group-context';
import { NotificationsProvider } from '@/contexts/notifications-context';

export default function AppLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : (scheme ?? 'light')];

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
        </Stack>
      </NotificationsProvider>
    </GroupProvider>
  );
}
