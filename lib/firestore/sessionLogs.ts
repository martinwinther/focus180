import {
  collection,
  doc,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { firebaseFirestore } from '@/lib/firebase/client';

const FOCUS_PLANS_COLLECTION = 'focusPlans';
const DAYS_SUBCOLLECTION = 'days';
const SESSION_LOGS_SUBCOLLECTION = 'sessionLogs';

export interface SessionLog {
  id?: string;
  userId: string;
  planId: string;
  dayId: string;
  segmentIndex: number;
  segmentType: 'work' | 'break';
  plannedMinutes: number;
  actualSeconds: number;
  startedAt: Timestamp;
  endedAt: Timestamp;
  createdAt?: Timestamp;
}

export interface CreateSessionLogParams {
  userId: string;
  planId: string;
  dayId: string;
  segmentIndex: number;
  segmentType: 'work' | 'break';
  plannedMinutes: number;
  actualSeconds: number;
  startedAt: Date;
  endedAt: Date;
}

/**
 * Logs a completed work segment to Firestore.
 * Creates a document in /focusPlans/{planId}/days/{dayId}/sessionLogs
 * 
 * @throws {Error} If logging fails
 */
export async function logCompletedWorkSegment(
  params: CreateSessionLogParams
): Promise<string> {
  try {
    const {
      userId,
      planId,
      dayId,
      segmentIndex,
      segmentType,
      plannedMinutes,
      actualSeconds,
      startedAt,
      endedAt,
    } = params;

    // Validate required parameters
    if (!userId || !planId || !dayId) {
      throw new Error('Missing required parameters for logging');
    }

    if (actualSeconds < 0 || plannedMinutes < 0) {
      throw new Error('Invalid time values');
    }

    const planRef = doc(firebaseFirestore, FOCUS_PLANS_COLLECTION, planId);
    const dayRef = doc(planRef, DAYS_SUBCOLLECTION, dayId);
    const sessionLogsRef = collection(dayRef, SESSION_LOGS_SUBCOLLECTION);

    const sessionLogData = {
      userId,
      planId,
      dayId,
      segmentIndex,
      segmentType,
      plannedMinutes,
      actualSeconds,
      startedAt: Timestamp.fromDate(startedAt),
      endedAt: Timestamp.fromDate(endedAt),
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(sessionLogsRef, sessionLogData);
    return docRef.id;
  } catch (error) {
    console.error('Error logging work segment:', error);
    throw new Error('Failed to log work session. Please check your connection.');
  }
}

/**
 * Retrieves all session logs for a specific Focus Day.
 * Returns logs ordered by segment index.
 */
export async function getSessionLogsForDay(
  planId: string,
  dayId: string
): Promise<SessionLog[]> {
  const planRef = doc(firebaseFirestore, FOCUS_PLANS_COLLECTION, planId);
  const dayRef = doc(planRef, DAYS_SUBCOLLECTION, dayId);
  const sessionLogsRef = collection(dayRef, SESSION_LOGS_SUBCOLLECTION);

  const q = query(sessionLogsRef, orderBy('segmentIndex', 'asc'));

  try {
    const querySnapshot = await getDocs(q);
    const logs: SessionLog[] = [];

    querySnapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      } as SessionLog);
    });

    return logs;
  } catch (error) {
    console.error('Error fetching session logs:', error);
    return [];
  }
}

/**
 * Gets all work session logs for a user across all their plans.
 * Useful for history and statistics.
 */
export async function getWorkSessionLogsForUser(
  userId: string,
  planId: string,
  limit?: number
): Promise<SessionLog[]> {
  const planRef = doc(firebaseFirestore, FOCUS_PLANS_COLLECTION, planId);
  const daysRef = collection(planRef, DAYS_SUBCOLLECTION);

  try {
    const daysSnapshot = await getDocs(daysRef);
    const allLogs: SessionLog[] = [];

    // Iterate through each day to get its session logs
    for (const dayDoc of daysSnapshot.docs) {
      const sessionLogsRef = collection(dayDoc.ref, SESSION_LOGS_SUBCOLLECTION);
      const logsQuery = query(
        sessionLogsRef,
        where('userId', '==', userId),
        where('segmentType', '==', 'work')
      );

      const logsSnapshot = await getDocs(logsQuery);
      logsSnapshot.forEach((logDoc) => {
        allLogs.push({
          id: logDoc.id,
          ...logDoc.data(),
        } as SessionLog);
      });
    }

    // Sort by endedAt descending (most recent first)
    allLogs.sort((a, b) => b.endedAt.seconds - a.endedAt.seconds);

    // Apply limit if specified
    if (limit && allLogs.length > limit) {
      return allLogs.slice(0, limit);
    }

    return allLogs;
  } catch (error) {
    console.error('Error fetching work session logs for user:', error);
    return [];
  }
}

/**
 * Calculates total work minutes completed for a specific day.
 */
export async function getTotalWorkMinutesForDay(
  planId: string,
  dayId: string
): Promise<number> {
  const logs = await getSessionLogsForDay(planId, dayId);
  const workLogs = logs.filter((log) => log.segmentType === 'work');

  const totalSeconds = workLogs.reduce((sum, log) => sum + log.actualSeconds, 0);
  return Math.round(totalSeconds / 60);
}

