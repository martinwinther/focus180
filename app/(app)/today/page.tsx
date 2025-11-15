'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { usePlanConfig } from '@/lib/hooks/usePlanConfig';
import {
  getActiveFocusPlanForUser,
  createNewActivePlanForUser,
} from '@/lib/firestore/focusPlans';
import { getFocusDayForDate, getNextTrainingDay } from '@/lib/firestore/focusDays';
import type { FocusPlan, FocusDay } from '@/lib/types/focusPlan';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { TodayProgress } from '@/components/TodayProgress';
import { GlassCard, EmptyState, LoadingSpinner, Button } from '@/components/ui';

export default function TodayPage() {
  const { user } = useAuth();
  const { config, clearPlanConfig } = usePlanConfig();
  const [plan, setPlan] = useState<FocusPlan | null>(null);
  const [todayDay, setTodayDay] = useState<FocusDay | null>(null);
  const [nextDay, setNextDay] = useState<FocusDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>('');
  const [progressKey, setProgressKey] = useState(0);

  const loadPlan = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    
    try {
      const existingPlan = await getActiveFocusPlanForUser(user.uid);

      if (existingPlan) {
        setPlan(existingPlan);
        clearPlanConfig();
        
        const today = new Date().toISOString().split('T')[0];
        const dayData = await getFocusDayForDate(existingPlan.id!, today);
        setTodayDay(dayData);
        
        if (!dayData) {
          const upcoming = await getNextTrainingDay(existingPlan.id!);
          setNextDay(upcoming);
        }
      } else if (config) {
        setCreating(true);
        try {
          const newPlan = await createNewActivePlanForUser(user.uid, config);
          setPlan(newPlan);
          clearPlanConfig();
          
          if (newPlan) {
            const today = new Date().toISOString().split('T')[0];
            const dayData = await getFocusDayForDate(newPlan.id!, today);
            setTodayDay(dayData);
            
            if (!dayData) {
              const upcoming = await getNextTrainingDay(newPlan.id!);
              setNextDay(upcoming);
            }
          }
        } catch (planError: unknown) {
          console.error('Error creating plan:', planError);
          setError(
            planError instanceof Error
              ? planError.message
              : 'Failed to create your plan. Please try again.'
          );
          clearPlanConfig();
        } finally {
          setCreating(false);
        }
      }
    } catch (err: unknown) {
      console.error('Error loading plan:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load your plan. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [user, config]);

  useEffect(() => {
    if (!todayDay) return;

    const interval = setInterval(() => {
      setProgressKey((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [todayDay]);

  if (loading || creating) {
    return <LoadingSpinner message={creating ? 'Creating your plan...' : 'Loading...'} />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <GlassCard>
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20">
                <svg
                  className="h-8 w-8 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">
              Couldn't load your data
            </h2>
            <p className="mb-6 text-white/70">{error}</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => loadPlan()}>Try again</Button>
              <Link href="/onboarding">
                <Button variant="secondary">Create new plan</Button>
              </Link>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={
            <svg
              className="h-10 w-10 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
          title="No active focus plan"
          description="Create a plan to start building your focus capacity"
          action={
            <Link href="/onboarding">
              <Button>Create your plan</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const formatTrainingDays = (days: string[]) => {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) {
      return 'Weekdays';
    }
    return days.join(', ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (plan && !todayDay && nextDay) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={
            <svg
              className="h-10 w-10 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          title="Rest day"
          description="No training scheduled today. Take a break and come back stronger."
          action={
            <GlassCard className="mt-6">
              <div className="text-center">
                <div className="text-sm text-white/60">Next training day</div>
                <div className="mt-2 text-2xl font-bold text-white">
                  {formatDate(nextDay.date)}
                </div>
                <div className="mt-1 text-white/70">
                  Day {nextDay.index} • {nextDay.dailyTargetMinutes} minutes
                </div>
                <Link href="/history" className="mt-4 inline-block">
                  <Button variant="secondary">View history</Button>
                </Link>
              </div>
            </GlassCard>
          }
        />
      </div>
    );
  }

  if (plan && !todayDay && !nextDay) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={
            <svg
              className="h-10 w-10 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          title="Plan complete!"
          description="Congratulations! You've finished your training plan."
          action={
            <div className="flex gap-3">
              <Link href="/history">
                <Button variant="secondary">View history</Button>
              </Link>
              <Link href="/onboarding">
                <Button>Create new plan</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {todayDay && (
        <>
          <GlassCard>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white">Today's training</h1>
              <p className="mt-1 text-white/70">
                {formatDate(todayDay.date)} • Day {todayDay.index}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/60">Today's target</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {todayDay.dailyTargetMinutes} min
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/60">Plan goal</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {plan.targetDailyMinutes} min
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/60">Training days</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatTrainingDays(plan.trainingDaysPerWeek)}
                </div>
              </div>
            </div>
          </GlassCard>

          <TodayProgress
            userId={user!.uid}
            planId={plan.id!}
            focusDay={todayDay}
            refreshKey={progressKey}
          />

          <PomodoroTimer
            userId={user!.uid}
            planId={plan.id!}
            dayId={todayDay.id!}
            segments={todayDay.segments}
            dailyTargetMinutes={todayDay.dailyTargetMinutes}
            dayIndex={todayDay.index}
            date={todayDay.date}
          />
        </>
      )}
    </div>
  );
}
