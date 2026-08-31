import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

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
