import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { HouseholdProvider } from '@/contexts/household-context';

export default function AppLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : (scheme ?? 'light')];

  return (
    <HouseholdProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="task/new" options={{ title: 'Add task' }} />
        <Stack.Screen name="task/request" options={{ title: 'Request task' }} />
        <Stack.Screen name="task/[id]" options={{ title: 'Edit task' }} />
        <Stack.Screen name="household/create" options={{ title: 'Create household' }} />
        <Stack.Screen name="household/join" options={{ title: 'Join household' }} />
      </Stack>
    </HouseholdProvider>
  );
}
