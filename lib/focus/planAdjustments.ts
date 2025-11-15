import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  where,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '@/lib/firebase/client';
import type { FocusPlan } from '@/lib/types/focusPlan';
import type { FocusDay } from '@/lib/types/focusPlan';
import type { TrainingDayOfWeek, FocusDayPlan } from './ramp';
import {
  generateFocusDayPlans,
  RampValidationError,
  NoTrainingDaysError,
} from './ramp';

const FOCUS_PLANS_COLLECTION = 'focusPlans';
const DAYS_SUBCOLLECTION = 'days';

export class PlanAdjustmentError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'PlanAdjustmentError';
  }
}

export async function updateTrainingDaysPerWeekForFuture(
  userId: string,
  planId: string,
  newTrainingDays: TrainingDayOfWeek[]
): Promise<void> {
  try {
    // Validate input
    if (!newTrainingDays || newTrainingDays.length === 0) {
      throw new PlanAdjustmentError('At least one training day must be selected');
    }

    // Fetch the plan and verify ownership
    const db = getFirebaseFirestore();
    const planRef = doc(db, FOCUS_PLANS_COLLECTION, planId);
    const planDoc = await getDoc(planRef);

    if (!planDoc.exists()) {
      throw new PlanAdjustmentError('Plan not found');
    }

    const plan = { id: planDoc.id, ...planDoc.data() } as FocusPlan;

    if (plan.userId !== userId) {
      throw new PlanAdjustmentError('Unauthorized: Plan does not belong to this user');
    }

    // Fetch all Focus Days for this plan
    const daysCollectionRef = collection(planRef, DAYS_SUBCOLLECTION);
    const allDaysQuery = query(daysCollectionRef);
    const allDaysSnapshot = await getDocs(allDaysQuery);

    const allDays: FocusDay[] = [];
    allDaysSnapshot.forEach((dayDoc) => {
      const data = dayDoc.data();
      if (data.date && data.dailyTargetMinutes && data.segments) {
        allDays.push({
          id: dayDoc.id,
          ...data,
        } as FocusDay);
      }
    });

    // Sort by index
    allDays.sort((a, b) => a.index - b.index);

    // Determine today in ISO format
    const today = new Date().toISOString().split('T')[0];

    // Partition days into past/today and future
    const pastOrTodayDays = allDays.filter((day) => day.date <= today);
    const futureDays = allDays.filter((day) => day.date > today);

    // Get the baseline for future days
    const lastPastDay = pastOrTodayDays[pastOrTodayDays.length - 1];
    const startingDailyMinutes = lastPastDay
      ? lastPastDay.dailyTargetMinutes
      : plan.startingDailyMinutes || 10;

    // Determine start date for future segment
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureStartDate = tomorrow.toISOString().split('T')[0];

    // Build config for future segment
    let futureDaysCount: number | undefined;
    let futureEndDate: string | undefined;

    if (plan.endDate) {
      // Use the plan's end date
      futureEndDate = plan.endDate;
    } else if (plan.trainingDaysCount && pastOrTodayDays.length > 0) {
      // Calculate remaining training days
      const completedCount = pastOrTodayDays.length;
      futureDaysCount = Math.max(0, plan.trainingDaysCount - completedCount);
    } else {
      // Fallback: use the number of future days that existed
      futureDaysCount = futureDays.length;
    }

    // Validate that we can generate future days
    if (futureEndDate) {
      const endDateObj = new Date(futureEndDate);
      const startDateObj = new Date(futureStartDate);
      if (endDateObj <= startDateObj) {
        throw new PlanAdjustmentError(
          'These training days don\'t leave any time before your plan ends. Try extending the plan or selecting more days.'
        );
      }
    }

    if (futureDaysCount !== undefined && futureDaysCount === 0) {
      throw new PlanAdjustmentError(
        'No future training days to adjust. Your plan is already complete.'
      );
    }

    // Generate new future days
    const rampConfig = {
      startDate: futureStartDate,
      targetDailyMinutes: plan.targetDailyMinutes,
      trainingDaysPerWeek: newTrainingDays,
      startingDailyMinutes,
      endDate: futureEndDate,
      trainingDaysCount: futureDaysCount,
    };

    let newFutureDayPlans: FocusDayPlan[];
    try {
      newFutureDayPlans = generateFocusDayPlans(rampConfig);
    } catch (error) {
      if (error instanceof NoTrainingDaysError) {
        throw new PlanAdjustmentError(
          'No training days could be generated with these settings. Try selecting more training days or adjusting your plan dates.'
        );
      }
      if (error instanceof RampValidationError) {
        throw new PlanAdjustmentError(error.message);
      }
      throw error;
    }

    // Adjust indexes: new days should continue from the last past/today day
    const lastPastIndex = pastOrTodayDays.length > 0
      ? Math.max(...pastOrTodayDays.map((d) => d.index))
      : 0;

    const adjustedFutureDayPlans = newFutureDayPlans.map((dayPlan, idx) => ({
      ...dayPlan,
      index: lastPastIndex + idx + 1,
    }));

    // Delete old future days and write new ones in batches
    const batch = writeBatch(db);

    // Delete old future days
    for (const futureDay of futureDays) {
      const dayDocRef = doc(daysCollectionRef, futureDay.id!);
      batch.delete(dayDocRef);
    }

    // Write new future days
    for (const dayPlan of adjustedFutureDayPlans) {
      const dayDocRef = doc(daysCollectionRef, dayPlan.date);
      batch.set(dayDocRef, {
        planId,
        userId,
        index: dayPlan.index,
        date: dayPlan.date,
        dailyTargetMinutes: dayPlan.dailyTargetMinutes,
        segments: dayPlan.segments,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Commit the batch
    await batch.commit();

    // Update the plan's trainingDaysPerWeek field
    await updateDoc(planRef, {
      trainingDaysPerWeek: newTrainingDays,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof PlanAdjustmentError) {
      throw error;
    }
    if (error instanceof RampValidationError || error instanceof NoTrainingDaysError) {
      throw new PlanAdjustmentError(error.message, error);
    }
    console.error('Error updating training days:', error);
    throw new PlanAdjustmentError(
      'Failed to update training days. Please try again.',
      error
    );
  }
}

