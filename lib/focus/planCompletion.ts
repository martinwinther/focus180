import { getAllFocusDaysForPlan } from '@/lib/firestore/focusDays';
import { setFocusPlanStatus } from '@/lib/firestore/focusPlans';
import type { FocusDay } from '@/lib/types/focusPlan';

export interface PlanCompletionEvaluation {
  isFinishedByCalendar: boolean;
  lastDayDate: string | null;
  totalDays: number;
  completedDays: number;
}

/**
 * Evaluates whether a plan has reached its calendar end.
 * Returns information about the plan's completion status based on dates.
 * 
 * A plan is "finished by calendar" if today's date is past the last scheduled training day.
 */
export async function evaluatePlanCompletion(
  userId: string,
  planId: string
): Promise<PlanCompletionEvaluation> {
  try {
    // Fetch all days for the plan
    const allDays = await getAllFocusDaysForPlan(planId, userId);
    
    if (allDays.length === 0) {
      return {
        isFinishedByCalendar: false,
        lastDayDate: null,
        totalDays: 0,
        completedDays: 0,
      };
    }
    
    // Find the last scheduled training day (maximum date)
    const lastDay = allDays.reduce((latest, day) => {
      return day.date > latest.date ? day : latest;
    }, allDays[0]);
    
    const lastDayDate = lastDay.date;
    
    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    // Plan is finished by calendar if today is after the last training day
    const isFinishedByCalendar = today > lastDayDate;
    
    // Count completed days
    const completedDays = allDays.filter(
      (day) => day.status === 'completed'
    ).length;
    
    return {
      isFinishedByCalendar,
      lastDayDate,
      totalDays: allDays.length,
      completedDays,
    };
  } catch (error) {
    console.error('Error evaluating plan completion:', error);
    throw new Error('Failed to evaluate plan completion status');
  }
}

/**
 * Marks a plan as completed in Firestore.
 * Sets status = "completed" and completedAt = serverTimestamp().
 * 
 * @throws {Error} If update fails
 */
export async function completePlan(
  userId: string,
  planId: string
): Promise<void> {
  try {
    await setFocusPlanStatus(userId, planId, 'completed');
  } catch (error) {
    console.error('Error completing plan:', error);
    throw new Error('Failed to mark plan as completed. Please try again.');
  }
}

/**
 * Checks if a plan should be completed and completes it if so.
 * Returns true if the plan was completed, false otherwise.
 * 
 * This is a convenience function that combines evaluation and completion.
 */
export async function checkAndCompletePlanIfFinished(
  userId: string,
  planId: string
): Promise<boolean> {
  try {
    const evaluation = await evaluatePlanCompletion(userId, planId);
    
    if (evaluation.isFinishedByCalendar) {
      await completePlan(userId, planId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking and completing plan:', error);
    // Don't throw - this is a convenience function
    // Return false to indicate plan was not completed
    return false;
  }
}

/**
 * Checks if a specific day is the last scheduled training day in its plan.
 */
export async function isLastTrainingDay(
  planId: string,
  dayDate: string,
  userId: string
): Promise<boolean> {
  try {
    const allDays = await getAllFocusDaysForPlan(planId, userId);
    
    if (allDays.length === 0) {
      return false;
    }
    
    // Find the maximum date
    const maxDate = allDays.reduce((max, day) => {
      return day.date > max ? day.date : max;
    }, allDays[0].date);
    
    return dayDate === maxDate;
  } catch (error) {
    console.error('Error checking if last training day:', error);
    return false;
  }
}

/**
 * Gets completion statistics for a plan.
 * Useful for displaying on the completion screen.
 */
export async function getPlanCompletionStats(planId: string, userId: string) {
  try {
    const allDays = await getAllFocusDaysForPlan(planId, userId);
    
    const completedDays = allDays.filter(
      (day) => day.status === 'completed'
    ).length;
    
    const totalPlannedMinutes = allDays.reduce(
      (sum, day) => sum + day.dailyTargetMinutes,
      0
    );
    
    // Calculate longest streak of completed days
    let longestStreak = 0;
    let currentStreak = 0;
    
    const sortedDays = [...allDays].sort((a, b) => a.date.localeCompare(b.date));
    
    for (const day of sortedDays) {
      if (day.status === 'completed') {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return {
      totalDays: allDays.length,
      completedDays,
      totalPlannedMinutes,
      longestStreak,
      completionRate: allDays.length > 0 ? completedDays / allDays.length : 0,
    };
  } catch (error) {
    console.error('Error getting plan completion stats:', error);
    return {
      totalDays: 0,
      completedDays: 0,
      totalPlannedMinutes: 0,
      longestStreak: 0,
      completionRate: 0,
    };
  }
}

