import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;
let firebaseFirestore: Firestore | undefined;

function initializeFirebase() {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if already initialized
  if (firebaseApp) {
    return;
  }

  try {
    if (getApps().length === 0) {
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.warn('Firebase configuration is missing. Please check your environment variables.');
        return;
      }
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }

    if (firebaseApp) {
      firebaseAuth = getAuth(firebaseApp);
      firebaseFirestore = getFirestore(firebaseApp);
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
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
    console.error('Failed to initialize Firebase during module load:', error);
  }
}

// Export getters that ensure initialization
export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp && typeof window !== 'undefined') {
    initializeFirebase();
  }
  if (!firebaseApp) {
    throw new Error('Firebase app is not initialized. Make sure you are using this on the client side.');
  }
  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (!firebaseAuth && typeof window !== 'undefined') {
    initializeFirebase();
  }
  if (!firebaseAuth) {
    throw new Error('Firebase auth is not initialized. Make sure you are using this on the client side.');
  }
  return firebaseAuth;
}

export function getFirebaseFirestore(): Firestore {
  if (!firebaseFirestore && typeof window !== 'undefined') {
    initializeFirebase();
  }
  if (!firebaseFirestore) {
    throw new Error('Firebase firestore is not initialized. Make sure you are using this on the client side.');
  }
  return firebaseFirestore;
}

// Export direct references for backward compatibility (will be undefined on server)
export { firebaseApp, firebaseAuth, firebaseFirestore };

