import type { Session, User } from '@supabase/supabase-js';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import { queryClient } from '@/lib/query-client';
import { cancelAllAlarmFollowUps } from '@/lib/alarms/alarm-notifications';
import { clearMarks } from '@/lib/alarms/marks';
import { cancelAllReminders } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';
import { cancelAllTaskReminders } from '@/lib/task-reminders';

export type OAuthProvider = 'google' | 'facebook';

/**
 * Turns the URL an OAuth provider redirected back to into a Supabase session.
 * Returns false when the URL carries no tokens (an ordinary visit to the
 * screen), and throws when the provider reported an error — e.g. the user
 * declined on the consent page.
 */
export async function createSessionFromUrl(url: string): Promise<boolean> {
  const { params, errorCode } = getQueryParams(url);
  // Supabase reports failures as error / error_description in the query or hash.
  if (errorCode || params.error) {
    throw new Error(params.error_description || 'Could not sign in.');
  }
  const { access_token, refresh_token } = params;
  if (!access_token || !refresh_token) return false;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return true;
}

type SessionContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  // True from the moment a password-reset deep link hands us a recovery
  // session until the user finishes setting a new password. The root
  // layout's auth guard checks this so a valid recovery session doesn't
  // immediately redirect the user into the app before they've set a new
  // password (see src/app/(auth)/reset-password.tsx).
  isRecovering: boolean;
  beginPasswordRecovery: () => void;
  endPasswordRecovery: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  // Resolves without a session when the user closes the browser sheet — that
  // is a change of mind, not an error. On web the page navigates away instead.
  signInWithProvider: (provider: OAuthProvider) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string, redirectTo: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        // A device switching accounts (or a mutation queued offline by the
        // previous user and still paused) must never leak into the next
        // signed-in session's cache or replay under its identity.
        queryClient.clear();
        queryClient.getMutationCache().clear();
        // Reminders are scheduled on the device, not the account: without
        // this, the next person to sign in here gets the last one's medicine
        // names — or task alarms — on their lock screen.
        cancelAllReminders().catch(() => {});
        cancelAllTaskReminders().catch(() => {});
        cancelAllAlarmFollowUps().catch(() => {});
        clearMarks();
      } else if (nextSession) {
        setSession(nextSession);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: SessionContextValue = {
    session,
    user: session?.user ?? null,
    isLoading,
    isRecovering,
    beginPasswordRecovery: () => setIsRecovering(true),
    endPasswordRecovery: () => setIsRecovering(false),
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signInWithProvider: async (provider) => {
      // goodlist://sign-in on device, <origin>/sign-in on web. Both must be in
      // Supabase's Auth → URL Configuration → Redirect URLs allowlist.
      const redirectTo = Linking.createURL('sign-in');

      if (Platform.OS === 'web') {
        // A full-page redirect rather than a popup: popups get blocked, and
        // the sign-in screen picks the tokens up from the URL on return.
        const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
        if (error) throw error;
        return;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return;
      await createSessionFromUrl(result.url);
    },
    signUp: async (email, password, displayName) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: displayName ? { data: { display_name: displayName } } : undefined,
      });
      if (error) throw error;
      return { needsEmailConfirmation: !data.session };
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    resetPasswordForEmail: async (email, redirectTo) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
    },
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
