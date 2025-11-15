/**
 * Pure TypeScript ramp generator for Focus Ramp.
 * Generates training dates, daily targets, and Pomodoro segments.
 */

export type TrainingDayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

/**
 * Custom error types for ramp generation failures
 */
export class RampValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RampValidationError';
  }
}

export class NoTrainingDaysError extends RampValidationError {
  constructor(message: string = 'No training days could be generated with the provided configuration') {
    super(message);
    this.name = 'NoTrainingDaysError';
  }
}

export interface FocusSegment {
  type: 'work' | 'break';
  minutes: number;
}

export interface FocusDayPlan {
  index: number;
  date: string;
  dailyTargetMinutes: number;
  segments: FocusSegment[];
}

export interface FocusPlanConfig {
  startDate: string;
  targetDailyMinutes: number;
  trainingDaysPerWeek: TrainingDayOfWeek[];
  startingDailyMinutes?: number;
  endDate?: string;
  trainingDaysCount?: number;
}

const DAY_MAP: Record<TrainingDayOfWeek, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Computes all training dates between startDate and endDate (or until trainingDaysCount is reached).
 * Only includes dates that match the selected training days of the week.
 * 
 * @throws {RampValidationError} If configuration is invalid
 * @throws {NoTrainingDaysError} If no training dates can be generated
 */
export function getTrainingDates(config: FocusPlanConfig): string[] {
  const { startDate, trainingDaysPerWeek, endDate, trainingDaysCount } = config;
  
  // Validate training days per week is not empty
  if (!trainingDaysPerWeek || trainingDaysPerWeek.length === 0) {
    throw new RampValidationError('At least one training day per week must be selected');
  }
  
  const trainingDayIndices = trainingDaysPerWeek.map(day => DAY_MAP[day]);
  const start = new Date(startDate);
  const dates: string[] = [];
  
  let current = new Date(start);
  let maxDate: Date | null = null;
  
  if (endDate) {
    maxDate = new Date(endDate);
    
    // Validate end date is after start date
    if (maxDate <= start) {
      throw new RampValidationError('End date must be after start date');
    }
  }
  
  // Validate training days count if provided
  if (trainingDaysCount !== undefined && trainingDaysCount < 1) {
    throw new RampValidationError('Training days count must be at least 1');
  }
  
  // Generate dates until we hit the end date or reach the desired count
  const maxIterations = 1000;
  let iterations = 0;
  
  while (iterations < maxIterations) {
    const dayOfWeek = current.getDay();
    
    if (trainingDayIndices.includes(dayOfWeek)) {
      dates.push(current.toISOString().split('T')[0]);
      
      if (trainingDaysCount && dates.length >= trainingDaysCount) {
        break;
      }
    }
    
    if (maxDate && current >= maxDate) {
      break;
    }
    
    current.setDate(current.getDate() + 1);
    iterations++;
  }
  
  // Validate that at least one training date was generated
  if (dates.length === 0) {
    throw new NoTrainingDaysError(
      'No training days found in the specified date range with the selected days of week'
    );
  }
  
  return dates;
}

/**
 * Generates daily target minutes for each training date.
 * Creates a smooth, monotonic increase from starting level to target.
 * 
 * Edge cases handled:
 * - Single training day: returns target minutes directly
 * - Starting >= target: returns flat array at target level
 * - Very close values: ensures monotonic increase where mathematically possible
 */
export function generateDailyTargets(
  config: FocusPlanConfig,
  trainingDates: string[]
): number[] {
  const { targetDailyMinutes, startingDailyMinutes = 10 } = config;
  const n = trainingDates.length;
  
  // Edge case: no days (should not happen if getTrainingDates is used first)
  if (n === 0) return [];
  
  // Edge case: single training day - use target directly
  if (n === 1) return [targetDailyMinutes];
  
  const start = startingDailyMinutes;
  const target = targetDailyMinutes;
  
  // Edge case: already at or above target - use flat target for all days
  // This can happen if user sets a low target or high starting value
  if (start >= target) {
    return Array(n).fill(target);
  }
  
  // Standard case: linear ramp from start to target
  const totalIncrease = target - start;
  const increment = totalIncrease / (n - 1);
  
  const targets: number[] = [];
  
  for (let i = 0; i < n; i++) {
    const rawValue = start + (increment * i);
    // Round to nearest integer, but ensure the last day is exactly the target
    const value = i === n - 1 ? target : Math.round(rawValue);
    targets.push(value);
  }
  
  // Edge case: if rounding creates non-monotonic values (rare but possible),
  // ensure monotonicity by enforcing minimum increments
  for (let i = 1; i < targets.length; i++) {
    if (targets[i] < targets[i - 1]) {
      targets[i] = targets[i - 1];
    }
  }
  
  return targets;
}

/**
 * Builds a Pomodoro-style segment plan for a given daily target.
 * Rules:
 * - Work sessions are ≤ 25 minutes
 * - Standard break between work sessions is 5 minutes
 * - If totalMinutes < 20: no breaks, just work segments
 * - If totalMinutes ≥ 20: split into evenly distributed work segments with 5-min breaks between them
 * - Avoids tiny tail segments by distributing minutes evenly across all segments
 */
export function buildPomodoroSegmentsForDay(totalMinutes: number): FocusSegment[] {
  const MAX_SEGMENT_MIN = 25;
  const BREAK_MIN = 5;
  
  // Short days: no breaks, single work segment
  if (totalMinutes < 20) {
    return [{ type: 'work', minutes: totalMinutes }];
  }
  
  // Longer days: distribute evenly across N segments (each ≤ 25 minutes)
  const N = Math.max(1, Math.ceil(totalMinutes / MAX_SEGMENT_MIN));
  const base = Math.floor(totalMinutes / N);
  const remainder = totalMinutes % N;
  
  // Build work segment lengths: first 'remainder' segments get base + 1, rest get base
  const workSegmentMinutes: number[] = [];
  for (let i = 0; i < N; i++) {
    workSegmentMinutes.push(i < remainder ? base + 1 : base);
  }
  
  // Build segments array: work segments with breaks between them
  const segments: FocusSegment[] = [];
  for (let i = 0; i < N; i++) {
    segments.push({ type: 'work', minutes: workSegmentMinutes[i] });
    // Add break between work segments (not after the last one)
    if (i < N - 1) {
      segments.push({ type: 'break', minutes: BREAK_MIN });
    }
  }
  
  return segments;
}

/**
 * Generates the complete focus day plan for a given configuration.
 * Returns an array of FocusDayPlan with date, index, target minutes, and segments.
 * 
 * @throws {RampValidationError} If configuration is invalid
 * @throws {NoTrainingDaysError} If no training dates can be generated
 */
export function generateFocusDayPlans(config: FocusPlanConfig): FocusDayPlan[] {
  // Validate target daily minutes
  if (!config.targetDailyMinutes || config.targetDailyMinutes <= 0) {
    throw new RampValidationError('Target daily minutes must be greater than 0');
  }
  
  if (config.targetDailyMinutes > 480) {
    throw new RampValidationError('Target daily minutes cannot exceed 480 (8 hours)');
  }
  
  // Validate starting daily minutes if provided
  if (config.startingDailyMinutes !== undefined) {
    if (config.startingDailyMinutes < 0) {
      throw new RampValidationError('Starting daily minutes cannot be negative');
    }
    
    if (config.startingDailyMinutes > config.targetDailyMinutes) {
      throw new RampValidationError('Starting daily minutes cannot exceed target daily minutes');
    }
  }
  
  // Generate training dates (will throw if invalid)
  const trainingDates = getTrainingDates(config);
  const dailyTargets = generateDailyTargets(config, trainingDates);
  
  const dayPlans: FocusDayPlan[] = trainingDates.map((date, idx) => {
    const dailyTargetMinutes = dailyTargets[idx];
    const segments = buildPomodoroSegmentsForDay(dailyTargetMinutes);
    
    return {
      index: idx + 1, // 1-based day index
      date,
      dailyTargetMinutes,
      segments,
    };
  });
  
  return dayPlans;
}

