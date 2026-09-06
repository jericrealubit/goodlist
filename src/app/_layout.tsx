import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { ThemeProvider as AppThemeProvider } from '@/contexts/theme-context';
import { SessionProvider, useSession } from '@/contexts/session-context';
import { registerMutationDefaults } from '@/lib/mutation-defaults';
import { setupOnlineManager } from '@/lib/network';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();
setupOnlineManager();
registerMutationDefaults(queryClient);

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'goodlist.query-cache',
});

function RootNavigator() {
  const { session, isLoading, isRecovering } = useSession();
  const isRestoring = useIsRestoring();
  // A password-recovery deep link hands us a valid session before the user
  // has set a new password — keep them on (auth)/reset-password until
  // endPasswordRecovery() fires instead of guard-redirecting into (app).
  const isSignedIn = !!session && !isRecovering;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>

        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {/* Keeps the native splash screen up (via preventAutoHideAsync) until the
          session restore AND the persisted query cache restore both finish,
          avoiding a sign-in flash and an empty-list flash before either has a
          real value to check. */}
      {!isLoading && !isRestoring && <AnimatedSplashOverlay />}
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.flex}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
          onSuccess={() => queryClient.resumePausedMutations()}>
          <KeyboardProvider>
            <SafeAreaProvider>
              <AppThemeProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <SessionProvider>
                    <RootNavigator />
                  </SessionProvider>
                </ThemeProvider>
              </AppThemeProvider>
            </SafeAreaProvider>
          </KeyboardProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
