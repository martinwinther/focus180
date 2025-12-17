'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/utils/logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isVerified: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only initialize on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    // Dynamically import Firebase to avoid SSR issues
    Promise.all([
      import('firebase/auth'),
      import('@/lib/firebase/client'),
    ])
      .then(async ([{ onAuthStateChanged }, { getFirebaseAuth }]) => {
        try {
          const auth = await getFirebaseAuth();
          unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);

            // Set Sentry user context
            if (user) {
              Sentry.setUser({
                id: user.uid,
                email: user.email || undefined,
              });
            } else {
              // Clear Sentry user context on sign out
              Sentry.setUser(null);
            }
          });
        } catch (error) {
          logger.error('Error initializing Firebase Auth:', error);
          setLoading(false);
        }
      })
      .catch((error) => {
        logger.error('Error loading Firebase modules:', error);
        setLoading(false);
      });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    try {
      const [{ signOut: firebaseSignOut }, { getFirebaseAuth }] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase/client'),
      ]);
      const auth = await getFirebaseAuth();
      await firebaseSignOut(auth);
      // Clear Sentry user context
      Sentry.setUser(null);
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  const isVerified = user?.emailVerified ?? false;

  return (
    <AuthContext.Provider value={{ user, loading, isVerified, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
