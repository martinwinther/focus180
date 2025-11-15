import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { firebaseFirestore } from '@/lib/firebase/client';
import type { FocusDay } from '@/lib/types/focusPlan';
import type { SessionLog } from './sessionLogs';
import { buildDailySummary, type DailySummary } from '@/lib/focus/history';

const FOCUS_PLANS_COLLECTION = 'focusPlans';
const DAYS_SUBCOLLECTION = 'days';
const SESSION_LOGS_SUBCOLLECTION = 'sessionLogs';

/**
 * Fetches all focus days for a specific plan.
 * Validates that days belong to the given user and returns them sorted by index.
 */
export async function getFocusDaysForPlan(
  userId: string,
  planId: string
): Promise<FocusDay[]> {
  const planRef = doc(firebaseFirestore, FOCUS_PLANS_COLLECTION, planId);
  const daysCollectionRef = collection(planRef, DAYS_SUBCOLLECTION);

  const q = query(daysCollectionRef, where('userId', '==', userId));

  try {
    const querySnapshot = await getDocs(q);
    const days: FocusDay[] = [];

    querySnapshot.forEach((doc) => {
      days.push({
        id: doc.id,
        ...doc.data(),
      } as FocusDay);
    });

    // Sort by index ascending for chronological order
    days.sort((a, b) => a.index - b.index);

    return days;
  } catch (error) {
    console.error('Error fetching focus days for plan:', error);
    return [];
  }
}

/**
 * Fetches all session logs for a specific day.
 * Validates that logs belong to the given user.
 */
export async function getSessionLogsForDay(
  userId: string,
  planId: string,
  dayId: string
): Promise<SessionLog[]> {
  const planRef = doc(firebaseFirestore, FOCUS_PLANS_COLLECTION, planId);
  const dayRef = doc(planRef, DAYS_SUBCOLLECTION, dayId);
  const sessionLogsRef = collection(dayRef, SESSION_LOGS_SUBCOLLECTION);

  const q = query(
    sessionLogsRef,
    where('userId', '==', userId),
    orderBy('segmentIndex', 'asc')
  );

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
    console.error('Error fetching session logs for day:', error);
    return [];
  }
}

/**
 * Fetches and computes daily summaries for all days in a plan.
 * This performs N+1 queries (one for days, then one per day for logs).
 * Acceptable for v1, but could be optimized with batch queries or aggregation.
 */
export async function getDailySummariesForPlan(
  userId: string,
  planId: string
): Promise<DailySummary[]> {
  // Fetch all focus days for the plan
  const focusDays = await getFocusDaysForPlan(userId, planId);

  if (focusDays.length === 0) {
    return [];
  }

  // TODO: Consider batching these queries for better performance
  // For now, fetch logs for each day individually
  const summariesPromises = focusDays.map(async (day) => {
    const logs = await getSessionLogsForDay(userId, planId, day.id || day.date);
    return buildDailySummary(day, logs);
  });

  const summaries = await Promise.all(summariesPromises);

  // Sort by date ascending
  summaries.sort((a, b) => a.date.localeCompare(b.date));

  return summaries;
}

/**
 * Fetches daily summaries up to and including today.
 * Useful for filtering out future days when computing current progress.
 */
export async function getDailySummariesUpToToday(
  userId: string,
  planId: string
): Promise<DailySummary[]> {
  const allSummaries = await getDailySummariesForPlan(userId, planId);
  const today = new Date().toISOString().split('T')[0];

  return allSummaries.filter((summary) => summary.date <= today);
}

