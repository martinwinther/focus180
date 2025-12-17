import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { logger } from '@/lib/utils/logger';

// Try to get config from build-time env vars first, fallback to fetching from API
let firebaseConfig: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
} | null = null;

// Initialize config from environment variables (available at build time)
const envConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// If we have the essential values from env, use them
if (envConfig.apiKey && envConfig.projectId) {
  firebaseConfig = envConfig;
}

let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;
let firebaseFirestore: Firestore | undefined;
let firebaseAnalytics: Analytics | undefined;

async function fetchFirebaseConfig(): Promise<typeof firebaseConfig> {
  try {
    // Use absolute URL to ensure it works in all environments
    const apiUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/firebase-config`
      : '/api/firebase-config';
    
    logger.info('Fetching Firebase config from:', apiUrl);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Failed to fetch Firebase config:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`Failed to fetch Firebase config: ${response.status} ${errorData.error || 'Unknown error'}`);
    }
    
    const config = await response.json();
    if (config.error) {
      logger.error('API returned error:', config);
      return null;
    }
    
    logger.info('Successfully fetched Firebase config from API');
    return config;
  } catch (error) {
    logger.error('Error fetching Firebase config from API:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message, error.stack);
    }
    return null;
  }
}

async function initializeFirebase() {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if already initialized
  if (firebaseApp) {
    return;
  }

  try {
    // If config is not available from env vars, fetch from API
    let config = firebaseConfig;
    if (!config || !config.apiKey || !config.projectId) {
      logger.info('Firebase config not available from env vars, fetching from API...');
      config = await fetchFirebaseConfig();
      if (config) {
        firebaseConfig = config;
      }
    }

    if (getApps().length === 0) {
      // Check if config values are available
      if (!config || !config.apiKey || !config.projectId) {
        logger.error('Firebase configuration is missing:', {
          hasApiKey: !!config?.apiKey,
          hasProjectId: !!config?.projectId,
          hasAuthDomain: !!config?.authDomain,
          hasStorageBucket: !!config?.storageBucket,
          hasMessagingSenderId: !!config?.messagingSenderId,
          hasAppId: !!config?.appId,
        });
        logger.error('Make sure NEXT_PUBLIC_FIREBASE_* environment variables are set in Vercel.');
        return;
      }
      
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApps()[0];
    }

    if (firebaseApp) {
      firebaseAuth = getAuth(firebaseApp);
      firebaseFirestore = getFirestore(firebaseApp);
      
      // Initialize Analytics only in browser and if supported
      try {
        const analyticsSupported = await isSupported();
        if (analyticsSupported) {
          firebaseAnalytics = getAnalytics(firebaseApp);
          logger.info('Firebase Analytics initialized');
        } else {
          logger.info('Firebase Analytics not supported in this environment');
        }
      } catch (analyticsError) {
        // Analytics might fail in some environments (e.g., ad blockers)
        logger.warn('Failed to initialize Firebase Analytics:', analyticsError);
      }
    } else {
      logger.error('Failed to create Firebase app instance');
    }
  } catch (error) {
    logger.error('Error initializing Firebase:', error);
    if (error instanceof Error) {
      logger.error('Error details:', error.message, error.stack);
    }
  }
}

// Initialize on client side only
// Wrap in try-catch to prevent module evaluation errors
try {
  if (typeof window !== 'undefined') {
    initializeFirebase();
  }
} catch (error) {
  // Silently fail during module evaluation
  // Firebase will be initialized when actually used via the getters
  if (typeof window !== 'undefined') {
    logger.error('Failed to initialize Firebase during module load:', error);
  }
}

// Export getters that ensure initialization
export async function getFirebaseApp(): Promise<FirebaseApp> {
  // Only work on client side
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be used on the client side.');
  }
  
  if (!firebaseApp) {
    await initializeFirebase();
  }
  
  if (!firebaseApp) {
    throw new Error('Firebase app is not initialized. Please check your environment variables.');
  }
  return firebaseApp;
}

export async function getFirebaseAuth(): Promise<Auth> {
  // Only work on client side
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be used on the client side.');
  }
  
  if (!firebaseAuth) {
    await initializeFirebase();
  }
  
  if (!firebaseAuth) {
    throw new Error('Firebase auth is not initialized. Please check your environment variables.');
  }
  return firebaseAuth;
}

export async function getFirebaseFirestore(): Promise<Firestore> {
  // Only work on client side
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be used on the client side.');
  }
  
  if (!firebaseFirestore) {
    await initializeFirebase();
  }
  
  if (!firebaseFirestore) {
    throw new Error('Firebase firestore is not initialized. Please check your environment variables.');
  }
  return firebaseFirestore;
}

/**
 * Get Firebase Analytics instance.
 * Returns undefined if analytics is not supported or not initialized.
 */
export async function getFirebaseAnalytics(): Promise<Analytics | undefined> {
  // Only work on client side
  if (typeof window === 'undefined') {
    return undefined;
  }
  
  if (!firebaseAnalytics) {
    await initializeFirebase();
  }
  
  return firebaseAnalytics;
}

// Export direct references for backward compatibility (will be undefined on server)
export { firebaseApp, firebaseAuth, firebaseFirestore, firebaseAnalytics };

