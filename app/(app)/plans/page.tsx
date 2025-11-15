'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  getAllPlansForUser,
  getActiveFocusPlanForUser,
  setFocusPlanStatus,
} from '@/lib/firestore/focusPlans';
import type { FocusPlan } from '@/lib/types/focusPlan';
import { GlassCard, EmptyState, LoadingSpinner, Button, Badge } from '@/components/ui';

export default function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<FocusPlan[]>([]);
  const [activePlan, setActivePlan] = useState<FocusPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [completingPlanId, setCompletingPlanId] = useState<string | null>(null);

  const loadPlans = async () => {
    if (!user) return;

    setLoading(true);
    setError('');
    
    try {
      const [allPlans, active] = await Promise.all([
        getAllPlansForUser(user.uid),
        getActiveFocusPlanForUser(user.uid),
      ]);

      setPlans(allPlans);
      setActivePlan(active);
    } catch (err: unknown) {
      console.error('Error loading plans:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load your plans. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [user]);

  const handleMarkAsCompleted = async (planId: string) => {
    if (!user || !window.confirm('Mark this plan as completed?')) return;

    setCompletingPlanId(planId);
    try {
      await setFocusPlanStatus(user.uid, planId, 'completed');
      await loadPlans();
    } catch (error) {
      console.error('Error completing plan:', error);
      alert('Failed to mark plan as completed. Please try again.');
    } finally {
      setCompletingPlanId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTrainingDays = (days: string[]) => {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) {
      return 'Weekdays';
    }
    return days.join(', ');
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'secondary' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'default';
      case 'archived':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading plans..." />;
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
              Couldn't load your plans
            </h2>
            <p className="mb-6 text-white/70">{error}</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => loadPlans()}>Try again</Button>
              <Link href="/today">
                <Button variant="secondary">Go to today</Button>
              </Link>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (plans.length === 0) {
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
          title="No focus plans yet"
          description="Create your first plan to start building your focus capacity"
          action={
            <Link href="/onboarding">
              <Button>Create your first plan</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Focus Plans</h1>
        <Link href="/onboarding">
          <Button>Create new plan</Button>
        </Link>
      </div>

      {activePlan && (
        <GlassCard>
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Active Plan</h2>
                <Badge variant="success">Active</Badge>
              </div>
              <p className="mt-1 text-sm text-white/60">
                Started {formatDate(activePlan.startDate)}
              </p>
            </div>
            <button
              onClick={() => handleMarkAsCompleted(activePlan.id!)}
              disabled={completingPlanId === activePlan.id}
              className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              {completingPlanId === activePlan.id ? 'Marking...' : 'Mark as completed'}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-sm text-white/60">Target</div>
              <div className="mt-1 text-2xl font-bold text-white">
                {activePlan.targetDailyMinutes} min
              </div>
            </div>

            <div className="rounded-xl bg-white/5 p-4">
              <div className="text-sm text-white/60">Training days</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {formatTrainingDays(activePlan.trainingDaysPerWeek)}
              </div>
            </div>

            {activePlan.endDate && (
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/60">End date</div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatDate(activePlan.endDate)}
                </div>
              </div>
            )}

            {activePlan.trainingDaysCount && (
              <div className="rounded-xl bg-white/5 p-4">
                <div className="text-sm text-white/60">Training days</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {activePlan.trainingDaysCount}
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      <div>
        <h2 className="mb-4 text-xl font-bold text-white">
          {activePlan ? 'Plan History' : 'All Plans'}
        </h2>

        <div className="space-y-4">
          {plans.map((plan) => (
            <GlassCard key={plan.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(plan.status)}>
                      {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                    </Badge>
                    <span className="text-sm text-white/60">
                      Started {formatDate(plan.startDate)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-white/50">Target</div>
                      <div className="text-sm font-semibold text-white">
                        {plan.targetDailyMinutes} min/day
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-white/50">Training days</div>
                      <div className="text-sm font-semibold text-white">
                        {formatTrainingDays(plan.trainingDaysPerWeek)}
                      </div>
                    </div>

                    {plan.endDate ? (
                      <div>
                        <div className="text-xs text-white/50">End date</div>
                        <div className="text-sm font-semibold text-white">
                          {formatDate(plan.endDate)}
                        </div>
                      </div>
                    ) : plan.trainingDaysCount ? (
                      <div>
                        <div className="text-xs text-white/50">Duration</div>
                        <div className="text-sm font-semibold text-white">
                          {plan.trainingDaysCount} days
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {plan.status === 'active' && (
                  <button
                    onClick={() => handleMarkAsCompleted(plan.id!)}
                    disabled={completingPlanId === plan.id}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    {completingPlanId === plan.id ? 'Marking...' : 'Mark as completed'}
                  </button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}

