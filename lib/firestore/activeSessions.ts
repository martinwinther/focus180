import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import { logger } from '@/lib/utils/logger';
import type { FocusSegment } from '@/lib/focus/usePomodoroTimer';

const ACTIVE_SESSIONS_COLLECTION = 'activeSessions';

export type SessionStatus = 'running' | 'paused' | 'stopped';

export interface ActiveSessionState {
  planId: string;
  dayId: string;
  date: string;
  segmentIndex: number;
  segmentType: 'work' | 'break';
  segmentPlannedMinutes: number;
  status: SessionStatus;
  startedAt: Timestamp | null;
  pausedAt: Timestamp | null;
  accumulatedSeconds: number;
  lastUpdatedAt: Timestamp;
  deviceId: string;
}

export interface ActiveSessionCallback {
  (state: ActiveSessionState | null): void;
}

// Generate a unique device ID (persisted in localStorage)
function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  const STORAGE_KEY = 'focusRamp:deviceId';
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    // Generate a unique ID
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Calculate remaining seconds from Firestore session state.
 * Uses timestamp-based calculation for accurate cross-device sync.
 */
export function calculateRemainingSeconds(
  sessionState: ActiveSessionState,
  plannedSeconds: number
): number {
  if (sessionState.status === 'stopped') {
    return plannedSeconds;
  }

  if (sessionState.status === 'paused') {
    // When paused, use accumulatedSeconds
    return Math.max(0, plannedSeconds - sessionState.accumulatedSeconds);
  }

  // When running, calculate from startedAt timestamp
  if (sessionState.startedAt) {
    const now = Date.now();
    const startedAtMs = sessionState.startedAt.toMillis();
    const elapsedSeconds = Math.floor((now - startedAtMs) / 1000);
    return Math.max(0, plannedSeconds - elapsedSeconds);
  }

  // Fallback: use accumulatedSeconds if startedAt is missing
  return Math.max(0, plannedSeconds - sessionState.accumulatedSeconds);
}

/**
 * Sync timer state to Firestore (only called on control actions).
 * This is the source of truth for cross-device synchronization.
 */
export async function syncSessionStateToFirestore(
  userId: string,
  params: {
    planId: string;
    dayId: string;
    date: string;
    segmentIndex: number;
    segment: FocusSegment;
    status: SessionStatus;
    startedAt?: Date | null;
    pausedAt?: Date | null;
    accumulatedSeconds?: number;
  }
): Promise<void> {
  try {
    const db = await getFirebaseFirestore();
    const sessionRef = doc(db, ACTIVE_SESSIONS_COLLECTION, userId);

    const deviceId = getDeviceId();
    const now = Timestamp.now();

    const sessionData: Omit<ActiveSessionState, 'lastUpdatedAt'> & {
      lastUpdatedAt: ReturnType<typeof serverTimestamp>;
    } = {
      planId: params.planId,
      dayId: params.dayId,
      date: params.date,
      segmentIndex: params.segmentIndex,
      segmentType: params.segment.type,
      segmentPlannedMinutes: params.segment.minutes,
      status: params.status,
      startedAt: params.startedAt ? Timestamp.fromDate(params.startedAt) : null,
      pausedAt: params.pausedAt ? Timestamp.fromDate(params.pausedAt) : null,
      accumulatedSeconds: params.accumulatedSeconds ?? 0,
      deviceId,
      lastUpdatedAt: serverTimestamp(),
    };

    await setDoc(sessionRef, sessionData, { merge: true });
    logger.debug('Synced session state to Firestore', {
      userId,
      status: params.status,
      segmentIndex: params.segmentIndex,
      deviceId,
    });
  } catch (error) {
    logger.error('Error syncing session state to Firestore:', error);
    // Don't throw - allow timer to continue working locally
  }
}

/**
 * Clear active session from Firestore.
 * Called when timer finishes or user navigates away.
 */
export async function clearActiveSession(userId: string): Promise<void> {
  try {
    const db = await getFirebaseFirestore();
    const sessionRef = doc(db, ACTIVE_SESSIONS_COLLECTION, userId);
    await deleteDoc(sessionRef);
    logger.debug('Cleared active session from Firestore', { userId });
  } catch (error) {
    logger.error('Error clearing active session from Firestore:', error);
    // Don't throw - not critical
  }
}

/**
 * Subscribe to real-time updates for active session.
 * Returns unsubscribe function.
 */
export function subscribeToActiveSession(
  userId: string,
  callback: ActiveSessionCallback
): Unsubscribe {
  let unsubscribe: Unsubscribe | null = null;

  // Initialize Firestore and set up listener
  getFirebaseFirestore()
    .then((db) => {
      const sessionRef = doc(db, ACTIVE_SESSIONS_COLLECTION, userId);

      unsubscribe = onSnapshot(
        sessionRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            callback(null);
            return;
          }

          const data = snapshot.data();
          const sessionState: ActiveSessionState = {
            planId: data.planId,
            dayId: data.dayId,
            date: data.date,
            segmentIndex: data.segmentIndex,
            segmentType: data.segmentType,
            segmentPlannedMinutes: data.segmentPlannedMinutes,
            status: data.status,
            startedAt: data.startedAt || null,
            pausedAt: data.pausedAt || null,
            accumulatedSeconds: data.accumulatedSeconds ?? 0,
            lastUpdatedAt: data.lastUpdatedAt || Timestamp.now(),
            deviceId: data.deviceId || 'unknown',
          };

          callback(sessionState);
        },
        (error) => {
          logger.error('Error in active session listener:', error);
          callback(null);
        }
      );
    })
    .catch((error) => {
      logger.error('Error setting up active session listener:', error);
      callback(null);
    });

  // Return unsubscribe function
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}

