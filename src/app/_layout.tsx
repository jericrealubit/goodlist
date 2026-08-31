import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { ThemeProvider as AppThemeProvider } from '@/contexts/theme-context';
import { SessionProvider, useSession } from '@/contexts/session-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading, isRecovering } = useSession();
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
          session restore finishes, avoiding a sign-in flash before the guard
          above has a real session value to check. */}
      {!isLoading && <AnimatedSplashOverlay />}
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <AppThemeProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <SessionProvider>
                <RootNavigator />
              </SessionProvider>
            </ThemeProvider>
          </AppThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
