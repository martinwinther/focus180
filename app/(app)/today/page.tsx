'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  getActiveFocusPlanForUser,
  getAllPlansForUser,
} from '@/lib/firestore/focusPlans';
import { getFocusDayForDate, getNextTrainingDay } from '@/lib/firestore/focusDays';
import {
  checkAndCompletePlanIfFinished,
  getPlanCompletionStats,
} from '@/lib/focus/planCompletion';
import type { FocusPlan, FocusDay } from '@/lib/types/focusPlan';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { TodayProgress } from '@/components/TodayProgress';
import { GlassCard, EmptyState, LoadingSpinner, Button } from '@/components/ui';

export default function TodayPage() {
  const { user, isVerified } = useAuth();
  const router = useRouter();
  const [plan, setPlan] = useState<FocusPlan | null>(null);
  const [pausedPlan, setPausedPlan] = useState<FocusPlan | null>(null);
  const [completedPlan, setCompletedPlan] = useState<FocusPlan | null>(null);
  const [todayDay, setTodayDay] = useState<FocusDay | null>(null);
  const [nextDay, setNextDay] = useState<FocusDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [progressKey, setProgressKey] = useState(0);

  const loadPlan = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    
    try {
      let existingPlan = await getActiveFocusPlanForUser(user.uid);

      if (existingPlan) {
        // Check if the plan should be completed based on calendar
        const wasCompleted = await checkAndCompletePlanIfFinished(
          user.uid,
          existingPlan.id!
        );

        if (wasCompleted) {
          // Reload the plan to get updated status
          const allPlans = await getAllPlansForUser(user.uid);
          const completedPlanData = allPlans.find((p) => p.id === existingPlan!.id);
          
          if (completedPlanData && completedPlanData.status === 'completed') {
            setCompletedPlan(completedPlanData);
            setPlan(null);
            setPausedPlan(null);
            setLoading(false);
            return;
          }
        }

        setPlan(existingPlan);
        setPausedPlan(null);
        setCompletedPlan(null);
        
        const today = new Date().toISOString().split('T')[0];
        const dayData = await getFocusDayForDate(existingPlan.id!, today);
        setTodayDay(dayData);
        
        if (!dayData) {
          const upcoming = await getNextTrainingDay(existingPlan.id!, user.uid);
          setNextDay(upcoming);
        }
      } else {
        // No active plan, check if there's a paused or completed plan
        const allPlans = await getAllPlansForUser(user.uid);
        const paused = allPlans.find((p) => p.status === 'paused');
        const completed = allPlans.find((p) => p.status === 'completed');
        
        if (completed) {
          setCompletedPlan(completed);
          setPlan(null);
          setPausedPlan(null);
        } else if (paused) {
          setPausedPlan(paused);
          setPlan(null);
          setCompletedPlan(null);
        } else {
          // No plans at all (no active, paused, or completed), redirect to onboarding
          if (isVerified) {
            router.push('/onboarding');
            return;
          }
          // If not verified, show empty state (shouldn't happen due to layout check)
          setPlan(null);
          setPausedPlan(null);
          setCompletedPlan(null);
        }
      }
    } catch (err: unknown) {
      console.error('Error loading plan:', err);
      
      // If error is likely due to no plan existing, redirect to onboarding
      // Otherwise show error state
      const errorMessage = err instanceof Error ? err.message : 'Failed to load your plan. Please check your connection and try again.';
      
      // Check if this is a "no plan" scenario vs a real error
      // If user is verified, assume no plan exists and redirect
      if (isVerified) {
        router.push('/onboarding');
        return;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, isVerified, router]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (!todayDay) return;

    const interval = setInterval(() => {
      setProgressKey((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [todayDay]);

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
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
              Couldn&apos;t load your data
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

  // Show completed plan state
  if (completedPlan && !plan) {
    return <PlanCompletedView plan={completedPlan} userId={user!.uid} />;
  }

  // Show paused plan state
  if (pausedPlan && !plan) {
    return (
      <div className="mx-auto max-w-3xl">
        <GlassCard>
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/20">
                <svg
                  className="h-8 w-8 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">Your plan is paused</h2>
            <p className="mb-6 text-white/70">
              Resume your plan from Settings to continue training, or create a new plan.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/settings">
                <Button>Go to Settings</Button>
              </Link>
              <Link href="/onboarding">
                <Button variant="secondary">Create new plan</Button>
              </Link>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  // If no plan and no paused/completed plan, should have redirected already
  // This is a fallback in case redirect didn't happen
  if (!plan && !pausedPlan && !completedPlan && isVerified) {
    // Redirect to onboarding instead of showing empty state
    router.push('/onboarding');
    return <LoadingSpinner message="Redirecting..." />;
  }

  // Show empty state only if there are paused/completed plans or user not verified
  if (!plan && !pausedPlan && !completedPlan) {
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
          description="Congratulations! You&apos;ve finished your training plan."
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

  // Ensure plan exists if we have todayDay (they should always be paired)
  if (!plan || !todayDay) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <GlassCard>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Today&apos;s training</h1>
          <p className="mt-1 text-white/70">
            {formatDate(todayDay.date)} • Day {todayDay.index}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-sm text-white/60">Today&apos;s target</div>
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
    </div>
  );
}

interface PlanCompletedViewProps {
  plan: FocusPlan;
  userId: string;
}

function PlanCompletedView({ plan, userId }: PlanCompletedViewProps) {
  const [stats, setStats] = useState<{
    totalDays: number;
    completedDays: number;
    totalPlannedMinutes: number;
    longestStreak: number;
    completionRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!plan.id) return;
      
      setLoading(true);
      try {
        const planStats = await getPlanCompletionStats(plan.id, userId);
        setStats(planStats);
      } catch (error) {
        console.error('Error loading plan stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [plan.id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <GlassCard>
          <div className="text-center py-8">
            <div className="text-white/60">Loading completion details...</div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <GlassCard>
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-500/20 border-2 border-green-500/30">
              <svg
                className="h-10 w-10 text-green-400"
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
            </div>
          </div>

          <h1 className="mb-3 text-4xl font-bold text-white">
            You completed your focus ramp!
          </h1>

          <p className="mb-8 text-lg text-white/70">
            You reached the end of this focus plan. Nice work building up your daily focus time.
          </p>

          {stats && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/60">Days completed</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {stats.completedDays} / {stats.totalDays}
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/60">Completion rate</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {Math.round(stats.completionRate * 100)}%
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/60">Total focus time</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {Math.round(stats.totalPlannedMinutes / 60)}h
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/60">Longest streak</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {stats.longestStreak} {stats.longestStreak === 1 ? 'day' : 'days'}
                </div>
              </div>
            </div>
          )}

          {plan.completedAt && (
            <p className="mb-6 text-sm text-white/50">
              Completed on {formatDate(plan.completedAt.toDate().toISOString().split('T')[0])}
            </p>
          )}

          <div className="flex justify-center gap-3">
            <Link href="/onboarding">
              <Button>Start a new plan</Button>
            </Link>
            <Link href="/history">
              <Button variant="secondary">View history</Button>
            </Link>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-white">What&apos;s next?</h2>
          <p className="text-white/70">
            Keep building your focus capacity with a new plan, or take a break and maintain your current level.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
