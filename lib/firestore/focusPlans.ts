import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { firebaseFirestore } from '@/lib/firebase/client';
import type { FocusPlan, FocusPlanConfig, FocusPlanStatus } from '@/lib/types/focusPlan';
import { generateFocusDayPlans, RampValidationError, NoTrainingDaysError } from '@/lib/focus/ramp';
import type { TrainingDayOfWeek } from '@/lib/focus/ramp';
import { createFocusDaysForPlan } from './focusDays';

const FOCUS_PLANS_COLLECTION = 'focusPlans';

/**
 * Custom error for plan creation failures
 */
export class PlanCreationError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'PlanCreationError';
  }
}

export async function createFocusPlan(
  userId: string,
  config: FocusPlanConfig
): Promise<string> {
  try {
    const now = Timestamp.now();
    const startDate = new Date().toISOString().split('T')[0];

    // Validate config before creating plan document
    const rampConfig = {
      startDate,
      targetDailyMinutes: config.targetDailyMinutes,
      trainingDaysPerWeek: config.trainingDaysPerWeek as TrainingDayOfWeek[],
      startingDailyMinutes: config.startingDailyMinutes || 10,
      endDate: config.endDate,
      trainingDaysCount: config.trainingDaysCount,
    };

    // Generate day plans first to validate configuration
    // This will throw RampValidationError or NoTrainingDaysError if invalid
    const dayPlans = generateFocusDayPlans(rampConfig);

    const planData: Omit<FocusPlan, 'id'> = {
      userId,
      createdAt: now,
      updatedAt: now,
      startDate,
      targetDailyMinutes: config.targetDailyMinutes,
      trainingDaysPerWeek: config.trainingDaysPerWeek,
      status: 'active',
      startingDailyMinutes: config.startingDailyMinutes || 10,
    };

    if (config.endDate) {
      planData.endDate = config.endDate;
    }

    if (config.trainingDaysCount) {
      planData.trainingDaysCount = config.trainingDaysCount;
    }

    // Create the plan document
    const docRef = await addDoc(
      collection(firebaseFirestore, FOCUS_PLANS_COLLECTION),
      {
        ...planData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );

    const planId = docRef.id;

    // Store all Focus Days for this plan
    try {
      await createFocusDaysForPlan(userId, planId, dayPlans);
    } catch (error) {
      console.error('Error creating focus days:', error);
      // Mark plan as broken so user knows there's an issue
      await updateDoc(doc(firebaseFirestore, FOCUS_PLANS_COLLECTION, planId), {
        status: 'archived',
        updatedAt: serverTimestamp(),
      });
      throw new PlanCreationError(
        'Failed to create training days for your plan. Please try again.',
        error
      );
    }

    return planId;
  } catch (error) {
    // Re-throw validation errors with user-friendly messages
    if (error instanceof RampValidationError || error instanceof NoTrainingDaysError) {
      throw error;
    }
    
    if (error instanceof PlanCreationError) {
      throw error;
    }
    
    // Wrap other errors
    console.error('Error creating focus plan:', error);
    throw new PlanCreationError(
      'Failed to create your focus plan. Please check your connection and try again.',
      error
    );
  }
}

export async function getActiveFocusPlanForUser(
  userId: string
): Promise<FocusPlan | null> {
  try {
    const q = query(
      collection(firebaseFirestore, FOCUS_PLANS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const docSnapshot = querySnapshot.docs[0];
    const data = docSnapshot.data();
    
    // Runtime validation: ensure required fields exist
    if (!data.userId || !data.targetDailyMinutes || !data.trainingDaysPerWeek) {
      console.error('Invalid plan data:', data);
      return null;
    }
    
    return {
      id: docSnapshot.id,
      ...data,
    } as FocusPlan;
  } catch (error) {
    console.error('Error fetching active focus plan:', error);
    throw new Error('Failed to load your active plan. Please try again.');
  }
}

export async function getAllPlansForUser(
  userId: string
): Promise<FocusPlan[]> {
  try {
    const q = query(
      collection(firebaseFirestore, FOCUS_PLANS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs
      .map((doc) => {
        const data = doc.data();
        // Basic validation
        if (!data.userId || !data.targetDailyMinutes) {
          console.warn('Skipping invalid plan:', doc.id);
          return null;
        }
        return {
          id: doc.id,
          ...data,
        } as FocusPlan;
      })
      .filter((plan): plan is FocusPlan => plan !== null);
  } catch (error) {
    console.error('Error fetching all plans:', error);
    throw new Error('Failed to load your plans. Please try again.');
  }
}

export async function setFocusPlanStatus(
  userId: string,
  planId: string,
  status: FocusPlanStatus
): Promise<void> {
  try {
    const planRef = doc(firebaseFirestore, FOCUS_PLANS_COLLECTION, planId);
    
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === 'completed') {
      updateData.completedAt = serverTimestamp();
    }

    await updateDoc(planRef, updateData);
  } catch (error) {
    console.error('Error updating plan status:', error);
    throw new Error('Failed to update plan status. Please try again.');
  }
}

export async function createNewActivePlanForUser(
  userId: string,
  config: FocusPlanConfig
): Promise<FocusPlan> {
  try {
    // Deactivate any currently active plans for this user
    const activePlan = await getActiveFocusPlanForUser(userId);
    if (activePlan && activePlan.id) {
      // Archive the old plan when creating a new one
      try {
        await setFocusPlanStatus(userId, activePlan.id, 'archived');
      } catch (error) {
        console.error('Error archiving old plan:', error);
        // Continue anyway - creating new plan is more important
      }
    }

    // Create the new active plan (will throw validation errors if config is invalid)
    const planId = await createFocusPlan(userId, config);

    // Fetch and return the newly created plan
    const newPlan = await getActiveFocusPlanForUser(userId);
    
    if (!newPlan) {
      throw new PlanCreationError('Failed to retrieve newly created plan');
    }

    return newPlan;
  } catch (error) {
    // Re-throw validation and creation errors
    if (
      error instanceof RampValidationError ||
      error instanceof NoTrainingDaysError ||
      error instanceof PlanCreationError
    ) {
      throw error;
    }
    
    console.error('Error creating new active plan:', error);
    throw new PlanCreationError(
      'Failed to create your new plan. Please try again.',
      error
    );
  }
}

