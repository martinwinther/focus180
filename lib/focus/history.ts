import type { FocusDay } from '@/lib/types/focusPlan';
import type { SessionLog } from '@/lib/firestore/sessionLogs';

export interface DailySummary {
  planId: string;
  dayId: string;
  date: string;
  index: number;
  plannedMinutes: number;
  actualWorkSeconds: number;
  actualWorkMinutes: number;
  completionRatio: number;
  isTrainingDay: boolean;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Builds a daily summary from a focus day and its session logs.
 * Computes actual work time vs planned time and completion ratio.
 */
export function buildDailySummary(
  focusDay: FocusDay,
  sessionLogs: SessionLog[]
): DailySummary {
  // Sum up actual seconds for work segments only
  const actualWorkSeconds = sessionLogs
    .filter((log) => log.segmentType === 'work')
    .reduce((sum, log) => sum + log.actualSeconds, 0);

  // Convert to minutes, rounded to nearest integer
  const actualWorkMinutes = Math.round(actualWorkSeconds / 60);

  // Compute completion ratio (0-1, clamped to max 1.5 to allow slight overcompletion)
  const rawRatio = actualWorkMinutes / focusDay.dailyTargetMinutes;
  const completionRatio = Math.min(rawRatio, 1.5);

  return {
    planId: focusDay.planId,
    dayId: focusDay.id || focusDay.date,
    date: focusDay.date,
    index: focusDay.index,
    plannedMinutes: focusDay.dailyTargetMinutes,
    actualWorkSeconds,
    actualWorkMinutes,
    completionRatio,
    isTrainingDay: true, // All FocusDays in the system are training days
  };
}

/**
 * Computes streak information from daily summaries.
 * A day is considered "completed" if completion ratio >= threshold.
 * Only counts consecutive training days ending at the most recent summary.
 */
export function computePlanStreaks(
  dailySummaries: DailySummary[],
  completionThreshold: number = 0.8
): StreakInfo {
  if (dailySummaries.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort by date ascending to ensure proper order
  const sortedSummaries = [...dailySummaries].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  let longestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  // Get today's date for comparison
  const today = new Date().toISOString().split('T')[0];

  // Iterate through sorted summaries to compute streaks
  for (let i = 0; i < sortedSummaries.length; i++) {
    const summary = sortedSummaries[i];
    const isCompleted = summary.completionRatio >= completionThreshold;

    if (isCompleted) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Compute current streak (must end at or near today)
  // Work backwards from the end to find consecutive completed days
  for (let i = sortedSummaries.length - 1; i >= 0; i--) {
    const summary = sortedSummaries[i];
    const isCompleted = summary.completionRatio >= completionThreshold;

    // Only count streak if it includes today or recent past
    if (summary.date <= today && isCompleted) {
      currentStreak++;
    } else if (summary.date <= today) {
      // If we hit an incomplete day before today, stop counting
      break;
    }
  }

  return {
    currentStreak,
    longestStreak,
  };
}

/**
 * Computes total statistics from daily summaries.
 */
export function computeTotalStats(dailySummaries: DailySummary[]) {
  const totalPlannedMinutes = dailySummaries.reduce(
    (sum, summary) => sum + summary.plannedMinutes,
    0
  );

  const totalActualMinutes = dailySummaries.reduce(
    (sum, summary) => sum + summary.actualWorkMinutes,
    0
  );

  const completedDays = dailySummaries.filter(
    (summary) => summary.completionRatio >= 0.8
  ).length;

  const averageCompletionRatio =
    dailySummaries.length > 0
      ? dailySummaries.reduce((sum, s) => sum + s.completionRatio, 0) /
        dailySummaries.length
      : 0;

  return {
    totalPlannedMinutes,
    totalActualMinutes,
    completedDays,
    totalDays: dailySummaries.length,
    averageCompletionRatio,
  };
}

