'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { LoadingSpinner } from '@/components/ui';
import { logger } from '@/lib/utils/logger';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DEFAULT_TRAINING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const MIN_TARGET_MINUTES = 5;
const MAX_TARGET_MINUTES = 300;
const MIN_TRAINING_DAYS_COUNT = 1;
const MAX_TRAINING_DAYS_COUNT = 200;

type ConfigMode = 'endDate' | 'trainingDaysCount';

interface ValidationErrors {
  targetDailyMinutes?: string;
  endDate?: string;
  trainingDaysCount?: string;
  trainingDaysPerWeek?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, isVerified } = useAuth();
  const [isClient, setIsClient] = useState(false);

  const [targetDailyMinutes, setTargetDailyMinutes] = useState(180);
  const [configMode, setConfigMode] = useState<ConfigMode>('endDate');
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 180);
    return date.toISOString().split('T')[0];
  });
  const [trainingDaysCount, setTrainingDaysCount] = useState(180);
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<string[]>(
    DEFAULT_TRAINING_DAYS
  );
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // When switching configuration mode, clear errors that are not relevant
  // to the newly selected mode to avoid keeping the button disabled.
  useEffect(() => {
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (configMode === 'endDate') {
        next.trainingDaysCount = undefined;
      } else {
        next.endDate = undefined;
      }
      return next;
    });
  }, [configMode]);

  useEffect(() => {
    // Only redirect on client side after auth has finished loading to avoid SSR issues
    if (!isClient || typeof window === 'undefined') return;
    if (authLoading) return;

    try {
      if (!user) {
        // Not authenticated, redirect to signup
        router.push('/auth/signup');
        return;
      }

      if (!isVerified) {
        // Not verified, redirect to signin
        router.push('/auth/signin');
        return;
      }
    } catch (error) {
      logger.error('Error in onboarding redirect:', error);
      // Fallback: if redirect fails, try window.location
      if (typeof window !== 'undefined' && !user) {
        window.location.href = '/auth/signup';
      }
    }
  }, [isClient, user, authLoading, isVerified, router]);

  const toggleTrainingDay = (day: string) => {
    if (trainingDaysPerWeek.includes(day)) {
      const newDays = trainingDaysPerWeek.filter((d) => d !== day);
      setTrainingDaysPerWeek(newDays);
      // Clear validation error if at least one day selected
      if (newDays.length > 0) {
        setValidationErrors((prev) => ({ ...prev, trainingDaysPerWeek: undefined }));
      }
    } else {
      setTrainingDaysPerWeek([...trainingDaysPerWeek, day]);
      setValidationErrors((prev) => ({ ...prev, trainingDaysPerWeek: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Validate targetDailyMinutes
    if (!targetDailyMinutes || targetDailyMinutes < MIN_TARGET_MINUTES) {
      errors.targetDailyMinutes = `Must be at least ${MIN_TARGET_MINUTES} minutes`;
    } else if (targetDailyMinutes > MAX_TARGET_MINUTES) {
      errors.targetDailyMinutes = `Cannot exceed ${MAX_TARGET_MINUTES} minutes (5 hours)`;
    }

    // Validate trainingDaysPerWeek
    if (trainingDaysPerWeek.length === 0) {
      errors.trainingDaysPerWeek = 'Select at least one training day';
    }

    // Validate based on config mode
    if (configMode === 'endDate') {
      if (!endDate) {
        errors.endDate = 'Please select an end date';
      } else {
        const selectedDate = new Date(endDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        if (selectedDate < tomorrow) {
          errors.endDate = 'End date must be in the future';
        } else {
          // Check if at least one training day falls within the date range
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const daysDiff = Math.ceil(
            (selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysDiff < 1) {
            errors.endDate = 'Date range must allow at least 1 training day';
          }
        }
      }
    } else {
      if (!trainingDaysCount || trainingDaysCount < MIN_TRAINING_DAYS_COUNT) {
        errors.trainingDaysCount = `Must be at least ${MIN_TRAINING_DAYS_COUNT} day`;
      } else if (trainingDaysCount > MAX_TRAINING_DAYS_COUNT) {
        errors.trainingDaysCount = `Cannot exceed ${MAX_TRAINING_DAYS_COUNT} days`;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Only treat errors relevant to the currently selected configuration mode
  // as blocking for the submit button.
  const hasBlockingErrors = (): boolean => {
    const { targetDailyMinutes, trainingDaysPerWeek, endDate: endDateErr, trainingDaysCount: daysCountErr } =
      validationErrors;
    if (targetDailyMinutes || trainingDaysPerWeek) return true;
    if (configMode === 'endDate') {
      return Boolean(endDateErr);
    }
    return Boolean(daysCountErr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    if (!user || !isVerified) {
      setError('Please sign in and verify your email to create a plan.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Dynamically import to avoid SSR issues
      const { createNewActivePlanForUser } = await import('@/lib/firestore/focusPlans');
      
      const config = {
        targetDailyMinutes,
        trainingDaysPerWeek,
        ...(configMode === 'endDate' ? { endDate } : { trainingDaysCount }),
      };

      await createNewActivePlanForUser(user.uid, config);
      router.push('/today');
    } catch (err) {
      logger.error('Error creating plan:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create your plan. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  const getMinEndDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Wait for client-side hydration before rendering anything
  // Also ensure we're not in SSR
  if (typeof window === 'undefined' || !isClient || authLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  // Don't render anything while redirecting (prevents flash of content)
  if (!user || !isVerified) {
    return <LoadingSpinner message="Redirecting..." />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-card w-full max-w-2xl">
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </Link>
        </div>

        <h1 className="mb-2 text-center text-3xl font-bold text-white">
          Create your focus plan
        </h1>
        <p className="mb-8 text-center text-white/80">
          We&apos;ll slowly ramp up your daily focus time from a small start to your goal
        </p>

        {error && (
          <div
            id="onboarding-error"
            role="alert"
            aria-live="assertive"
            className="mb-6 rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200 backdrop-blur-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" aria-describedby={error ? 'onboarding-error' : undefined}>
          <div>
            <label
              htmlFor="targetDailyMinutes"
              className="mb-2 block text-sm font-medium text-white/90"
            >
              Target daily focus time (minutes)
            </label>
            <input
              id="targetDailyMinutes"
              type="number"
              min={MIN_TARGET_MINUTES}
              max={MAX_TARGET_MINUTES}
              value={targetDailyMinutes}
              onChange={(e) => {
                setTargetDailyMinutes(Number(e.target.value));
                setValidationErrors((prev) => ({ ...prev, targetDailyMinutes: undefined }));
              }}
              onBlur={validateForm}
              className={`input-field ${
                validationErrors.targetDailyMinutes ? 'ring-2 ring-red-400' : ''
              }`}
              disabled={isSubmitting}
              required
              aria-describedby={validationErrors.targetDailyMinutes ? 'targetDailyMinutes-error' : 'targetDailyMinutes-help'}
              aria-invalid={!!validationErrors.targetDailyMinutes}
            />
            {validationErrors.targetDailyMinutes ? (
              <p id="targetDailyMinutes-error" role="alert" className="mt-1 text-xs text-red-300">
                {validationErrors.targetDailyMinutes}
              </p>
            ) : (
              <p id="targetDailyMinutes-help" className="mt-1 text-xs text-white/60">
                Your end goal for daily focus time (e.g., 180 minutes = 3 hours)
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-white/90">
              Plan duration
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfigMode('endDate')}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  configMode === 'endDate'
                    ? 'bg-white/20 text-white ring-2 ring-white/30'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Set end date
              </button>
              <button
                type="button"
                onClick={() => setConfigMode('trainingDaysCount')}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  configMode === 'trainingDaysCount'
                    ? 'bg-white/20 text-white ring-2 ring-white/30'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                Set number of days
              </button>
            </div>

            {configMode === 'endDate' ? (
              <div>
                <label
                  htmlFor="endDate"
                  className="mb-2 block text-sm font-medium text-white/90"
                >
                  End date
                </label>
                <input
                  id="endDate"
                  type="date"
                  min={getMinEndDate()}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setValidationErrors((prev) => ({ ...prev, endDate: undefined }));
                  }}
                  onBlur={validateForm}
                  className={`input-field ${
                    validationErrors.endDate ? 'ring-2 ring-red-400' : ''
                  }`}
                  disabled={isSubmitting}
                  required={configMode === 'endDate'}
                  aria-describedby={validationErrors.endDate ? 'endDate-error' : undefined}
                  aria-invalid={!!validationErrors.endDate}
                />
                {validationErrors.endDate && (
                  <p id="endDate-error" role="alert" className="mt-1 text-xs text-red-300">{validationErrors.endDate}</p>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="trainingDaysCount"
                  className="mb-2 block text-sm font-medium text-white/90"
                >
                  Number of training days
                </label>
                <input
                  id="trainingDaysCount"
                  type="number"
                  min={MIN_TRAINING_DAYS_COUNT}
                  max={MAX_TRAINING_DAYS_COUNT}
                  value={trainingDaysCount}
                  onChange={(e) => {
                    setTrainingDaysCount(Number(e.target.value));
                    setValidationErrors((prev) => ({
                      ...prev,
                      trainingDaysCount: undefined,
                    }));
                  }}
                  onBlur={validateForm}
                  className={`input-field ${
                    validationErrors.trainingDaysCount ? 'ring-2 ring-red-400' : ''
                  }`}
                  disabled={isSubmitting}
                  required={configMode === 'trainingDaysCount'}
                  aria-describedby={validationErrors.trainingDaysCount ? 'trainingDaysCount-error' : undefined}
                  aria-invalid={!!validationErrors.trainingDaysCount}
                />
                {validationErrors.trainingDaysCount && (
                  <p id="trainingDaysCount-error" role="alert" className="mt-1 text-xs text-red-300">
                    {validationErrors.trainingDaysCount}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label id="trainingDays-label" className="mb-3 block text-sm font-medium text-white/90">
              Training days per week
            </label>
            <div
              role="group"
              aria-labelledby="trainingDays-label"
              aria-describedby={validationErrors.trainingDaysPerWeek ? 'trainingDays-error' : 'trainingDays-help'}
              className={`flex flex-wrap gap-2 ${
                validationErrors.trainingDaysPerWeek ? 'rounded-lg ring-2 ring-red-400 p-2' : ''
              }`}
            >
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleTrainingDay(day)}
                  disabled={isSubmitting}
                  aria-pressed={trainingDaysPerWeek.includes(day)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                    trainingDaysPerWeek.includes(day)
                      ? 'bg-white/20 text-white ring-2 ring-white/30'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            {validationErrors.trainingDaysPerWeek ? (
              <p id="trainingDays-error" role="alert" className="mt-2 text-xs text-red-300">
                {validationErrors.trainingDaysPerWeek}
              </p>
            ) : (
              <p id="trainingDays-help" className="mt-2 text-xs text-white/60">
                Choose which days you&apos;ll train (we recommend starting with weekdays)
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/today" className="btn-secondary flex-1">
              Back
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || hasBlockingErrors()}
              aria-busy={isSubmitting}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating plan...' : 'Create plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

