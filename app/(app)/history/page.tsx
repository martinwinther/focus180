'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getActiveFocusPlanForUser } from '@/lib/firestore/focusPlans';
import { getDailySummariesUpToToday } from '@/lib/firestore/history';
import {
  computePlanStreaks,
  computeTotalStats,
  type DailySummary,
  type StreakInfo,
} from '@/lib/focus/history';
import { GlassCard, EmptyState, LoadingSpinner, Button } from '@/components/ui';
import type { FocusPlan } from '@/lib/types/focusPlan';

export default function HistoryPage() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<FocusPlan | null>(null);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [streaks, setStreaks] = useState<StreakInfo>({
    currentStreak: 0,
    longestStreak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const loadHistory = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    
    try {
      const activePlan = await getActiveFocusPlanForUser(user.uid);

      if (activePlan && activePlan.id) {
        setPlan(activePlan);

        const dailySummaries = await getDailySummariesUpToToday(
          user.uid,
          activePlan.id
        );

        setSummaries(dailySummaries);

        const streakInfo = computePlanStreaks(dailySummaries);
        setStreaks(streakInfo);
      }
    } catch (err: unknown) {
      console.error('Error loading history:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load your history. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  if (loading) {
    return <LoadingSpinner message="Loading history..." />;
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
              Couldn't load your history
            </h2>
            <p className="mb-6 text-white/70">{error}</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => loadHistory()}>Try again</Button>
              <Link href="/today">
                <Button variant="secondary">Go to today</Button>
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
          description="Create a plan to start tracking your progress"
          action={
            <Link href="/onboarding">
              <Button>Create your plan</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const stats = computeTotalStats(summaries);
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCompletionColor = (ratio: number) => {
    if (ratio >= 1.0) return 'text-green-400';
    if (ratio >= 0.8) return 'text-green-400';
    if (ratio >= 0.5) return 'text-yellow-400';
    return 'text-white/60';
  };

  const getCompletionBgColor = (ratio: number) => {
    if (ratio >= 1.0) return 'bg-green-500/80';
    if (ratio >= 0.8) return 'bg-green-500/60';
    if (ratio >= 0.5) return 'bg-yellow-500/60';
    return 'bg-white/30';
  };

  const getCompletionLabel = (ratio: number) => {
    if (ratio >= 1.0) return 'Complete';
    if (ratio >= 0.8) return 'Nearly done';
    if (ratio > 0) return 'In progress';
    return 'Not started';
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-4xl font-bold text-white">Training history</h1>
        <p className="mt-2 text-lg text-white/70">
          Track your progress and maintain your streak
        </p>
      </header>

      <GlassCard>
        <h2 className="mb-4 text-xl font-semibold text-white">Overview</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-sm text-white/60">Current streak</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {streaks.currentStreak}
              </span>
              <span className="text-white/60">days</span>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-sm text-white/60">Longest streak</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {streaks.longestStreak}
              </span>
              <span className="text-white/60">days</span>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-sm text-white/60">Days completed</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {stats.completedDays}
              </span>
              <span className="text-white/60">/ {stats.totalDays}</span>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-sm text-white/60">Total focus time</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {stats.totalActualMinutes}
              </span>
              <span className="text-white/60">min</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-white/60">Plan goal</div>
              <div className="mt-1 text-2xl font-bold text-white">
                {plan.targetDailyMinutes} min/day
              </div>
            </div>
            <div>
              <div className="text-sm text-white/60">Started</div>
              <div className="mt-1 text-lg text-white">
                {formatFullDate(plan.startDate)}
              </div>
            </div>
            {stats.totalDays > 0 && (
              <div>
                <div className="text-sm text-white/60">Avg completion</div>
                <div className="mt-1 text-lg text-white">
                  {Math.round(stats.averageCompletionRatio * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h2 className="mb-4 text-xl font-semibold text-white">
          Daily progress
        </h2>

        {summaries.length === 0 ? (
          <div className="rounded-xl bg-white/5 p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                <svg
                  className="h-8 w-8 text-white/60"
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
              </div>
            </div>
            <p className="mb-4 text-lg text-white/70">
              You haven't started any training days yet
            </p>
            <p className="mb-6 text-sm text-white/60">
              Complete your first work session to see your progress here
            </p>
            <Link href="/today">
              <Button>Start today's training</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {summaries.map((summary) => {
              const progressPercent = Math.min(
                (summary.completionRatio * 100),
                100
              );
              const isToday =
                summary.date === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={summary.dayId}
                  className={`rounded-xl p-4 transition-all ${
                    isToday
                      ? 'bg-white/15 ring-2 ring-white/30'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          summary.completionRatio >= 0.8
                            ? 'bg-green-500/20'
                            : summary.actualWorkMinutes > 0
                            ? 'bg-yellow-500/20'
                            : 'bg-white/10'
                        }`}
                      >
                        {summary.completionRatio >= 0.8 ? (
                          <svg
                            className="h-6 w-6 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : summary.actualWorkMinutes > 0 ? (
                          <svg
                            className="h-6 w-6 text-yellow-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-6 w-6 text-white/40"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-white">
                          {formatDate(summary.date)}
                          {isToday && (
                            <span className="ml-2 rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-white/60">
                          Day {summary.index}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 sm:mx-6">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-white/60">
                          {summary.actualWorkMinutes} / {summary.plannedMinutes}{' '}
                          min
                        </span>
                        <span
                          className={`font-medium ${getCompletionColor(
                            summary.completionRatio
                          )}`}
                        >
                          {Math.round(summary.completionRatio * 100)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getCompletionBgColor(
                            summary.completionRatio
                          )}`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-medium ${getCompletionColor(
                          summary.completionRatio
                        )}`}
                      >
                        {getCompletionLabel(summary.completionRatio)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {summaries.length > 0 && (
        <div className="flex justify-center">
          <Link href="/today">
            <Button>Continue training</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
