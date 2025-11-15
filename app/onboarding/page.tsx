'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePlanConfig } from '@/lib/hooks/usePlanConfig';

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
  const { savePlanConfig } = usePlanConfig();

  const [targetDailyMinutes, setTargetDailyMinutes] = useState(180);
  const [configMode, setConfigMode] = useState<ConfigMode>('endDate');
  const [endDate, setEndDate] = useState('');
  const [trainingDaysCount, setTrainingDaysCount] = useState(30);
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState<string[]>(
    DEFAULT_TRAINING_DAYS
  );
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const config = {
        targetDailyMinutes,
        trainingDaysPerWeek,
        ...(configMode === 'endDate' ? { endDate } : { trainingDaysCount }),
      };

      savePlanConfig(config);
      router.push('/auth/signup');
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getMinEndDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

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
          We'll slowly ramp up your daily focus time from a small start to your goal
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-200 backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
            />
            {validationErrors.targetDailyMinutes ? (
              <p className="mt-1 text-xs text-red-300">
                {validationErrors.targetDailyMinutes}
              </p>
            ) : (
              <p className="mt-1 text-xs text-white/60">
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
                />
                {validationErrors.endDate && (
                  <p className="mt-1 text-xs text-red-300">{validationErrors.endDate}</p>
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
                />
                {validationErrors.trainingDaysCount && (
                  <p className="mt-1 text-xs text-red-300">
                    {validationErrors.trainingDaysCount}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-white/90">
              Training days per week
            </label>
            <div
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
              <p className="mt-2 text-xs text-red-300">
                {validationErrors.trainingDaysPerWeek}
              </p>
            ) : (
              <p className="mt-2 text-xs text-white/60">
                Choose which days you'll train (we recommend starting with weekdays)
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Link href="/" className="btn-secondary flex-1">
              Back
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(validationErrors).length > 0}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Continue to sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

