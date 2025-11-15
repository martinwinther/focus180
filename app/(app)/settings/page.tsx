'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { canUseNotifications, requestNotificationPermission } from '@/lib/focus/notifications';
import {
  getActiveFocusPlanForUser,
  pauseFocusPlan,
  resumeFocusPlan,
} from '@/lib/firestore/focusPlans';
import { getAllFocusDaysForPlan } from '@/lib/firestore/focusDays';
import { getUserPreferences, updateUserPreferences } from '@/lib/firestore/userPreferences';
import { updateTrainingDaysPerWeekForFuture } from '@/lib/focus/planAdjustments';
import { GlassCard, LoadingSpinner, Button } from '@/components/ui';
import type { FocusPlan } from '@/lib/types/focusPlan';
import type { UserPreferences } from '@/lib/firestore/userPreferences';
import type { TrainingDayOfWeek } from '@/lib/focus/ramp';

const ALL_DAYS: TrainingDayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [plan, setPlan] = useState<FocusPlan | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pauseResumeLoading, setPauseResumeLoading] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [error, setError] = useState<string>('');
  const [scheduleError, setScheduleError] = useState<string>('');
  const [selectedTrainingDays, setSelectedTrainingDays] = useState<TrainingDayOfWeek[]>([]);
  const [dayCount, setDayCount] = useState<{ completed: number; total: number } | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationsSupported, setNotificationsSupported] = useState(true);

  useEffect(() => {
    // Check notification support
    const supported = canUseNotifications();
    setNotificationsSupported(supported);
    
    if (supported && typeof window !== 'undefined') {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        const [activePlan, userPrefs] = await Promise.all([
          getActiveFocusPlanForUser(user.uid),
          getUserPreferences(user.uid),
        ]);

        setPlan(activePlan);
        setPreferences(userPrefs);

        if (activePlan && activePlan.id) {
          setSelectedTrainingDays(activePlan.trainingDaysPerWeek as TrainingDayOfWeek[]);
          
          // Load day count for progress
          try {
            const allDays = await getAllFocusDaysForPlan(activePlan.id, user.uid);
            const today = new Date().toISOString().split('T')[0];
            const completed = allDays.filter((day) => day.date < today).length;
            setDayCount({ completed, total: allDays.length });
          } catch (dayError) {
            console.error('Error loading day count:', dayError);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setError('Failed to load settings. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const handlePreferenceChange = async (
    key: keyof Omit<UserPreferences, 'userId' | 'createdAt' | 'updatedAt'>,
    value: boolean
  ) => {
    if (!user || !preferences) return;

    // Handle notification permission request
    if (key === 'notificationsEnabled' && value) {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      
      if (permission !== 'granted') {
        // Don't save if permission was denied
        return;
      }
    }

    setSaving(true);
    try {
      await updateUserPreferences(user.uid, { [key]: value });
      setPreferences({ ...preferences, [key]: value });
    } catch (error) {
      console.error('Error updating preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePausePlan = async () => {
    if (!user || !plan || !plan.id) return;

    setPauseResumeLoading(true);
    setError('');
    try {
      await pauseFocusPlan(user.uid, plan.id);
      setPlan({ ...plan, status: 'paused' });
    } catch (err) {
      console.error('Error pausing plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to pause plan');
    } finally {
      setPauseResumeLoading(false);
    }
  };

  const handleResumePlan = async () => {
    if (!user || !plan || !plan.id) return;

    setPauseResumeLoading(true);
    setError('');
    try {
      await resumeFocusPlan(user.uid, plan.id);
      setPlan({ ...plan, status: 'active' });
    } catch (err) {
      console.error('Error resuming plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to resume plan');
    } finally {
      setPauseResumeLoading(false);
    }
  };

  const handleToggleTrainingDay = (day: TrainingDayOfWeek) => {
    const isSelected = selectedTrainingDays.includes(day);
    
    if (isSelected) {
      // Don't allow deselecting if it's the last day
      if (selectedTrainingDays.length === 1) {
        return;
      }
      setSelectedTrainingDays(selectedTrainingDays.filter((d) => d !== day));
    } else {
      setSelectedTrainingDays([...selectedTrainingDays, day]);
    }
    setScheduleError('');
  };

  const handleSaveSchedule = async () => {
    if (!user || !plan || !plan.id) return;

    // Check if there's any change
    const currentDays = [...plan.trainingDaysPerWeek].sort();
    const newDays = [...selectedTrainingDays].sort();
    if (currentDays.join(',') === newDays.join(',')) {
      return; // No change
    }

    setSavingSchedule(true);
    setScheduleError('');
    try {
      await updateTrainingDaysPerWeekForFuture(user.uid, plan.id, selectedTrainingDays);
      setPlan({ ...plan, trainingDaysPerWeek: selectedTrainingDays });
    } catch (err) {
      console.error('Error updating schedule:', err);
      setScheduleError(err instanceof Error ? err.message : 'Failed to update schedule');
    } finally {
      setSavingSchedule(false);
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
      return 'Monday – Friday';
    }
    return days.join(', ');
  };

  const hasScheduleChanged = () => {
    if (!plan) return false;
    const currentDays = [...plan.trainingDaysPerWeek].sort();
    const newDays = [...selectedTrainingDays].sort();
    return currentDays.join(',') !== newDays.join(',');
  };

  if (loading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="mb-2 text-4xl font-bold text-white">Settings</h1>
        <p className="text-lg text-white/70">
          Manage your focus plan and preferences
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-red-500/20 px-4 py-3 text-red-200">
          {error}
        </div>
      )}

      {plan ? (
        <>
          <GlassCard>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Current Plan</h2>
                {plan.status === 'paused' && (
                  <p className="mt-1 text-sm text-yellow-300">
                    Your plan is paused. Resume it to continue training.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {plan.status === 'active' && (
                  <span className="flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-300">
                    <span className="h-2 w-2 rounded-full bg-green-400"></span>
                    Active
                  </span>
                )}
                {plan.status === 'paused' && (
                  <span className="flex items-center gap-2 rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-medium text-yellow-300">
                    <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                    Paused
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between border-b border-white/10 pb-3">
                <span className="text-white/70">Target daily focus time</span>
                <span className="font-medium text-white">
                  {plan.targetDailyMinutes} minutes
                </span>
              </div>

              <div className="flex justify-between border-b border-white/10 pb-3">
                <span className="text-white/70">Started</span>
                <span className="font-medium text-white">
                  {formatDate(plan.startDate)}
                </span>
              </div>

              {plan.endDate && (
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-white/70">End date</span>
                  <span className="font-medium text-white">
                    {formatDate(plan.endDate)}
                  </span>
                </div>
              )}

              {dayCount && (
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-white/70">Progress</span>
                  <span className="font-medium text-white">
                    Day {dayCount.completed} of {dayCount.total}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-white/70">Training days</span>
                <span className="font-medium text-white">
                  {formatTrainingDays(plan.trainingDaysPerWeek)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex gap-3">
                {plan.status === 'active' && (
                  <>
                    <Link href="/today" className="btn-primary flex-1">
                      Continue training
                    </Link>
                    <Button
                      variant="secondary"
                      onClick={handlePausePlan}
                      disabled={pauseResumeLoading}
                    >
                      {pauseResumeLoading ? 'Pausing...' : 'Pause plan'}
                    </Button>
                  </>
                )}
                {plan.status === 'paused' && (
                  <Button
                    onClick={handleResumePlan}
                    disabled={pauseResumeLoading}
                    className="flex-1"
                  >
                    {pauseResumeLoading ? 'Resuming...' : 'Resume plan'}
                  </Button>
                )}
              </div>
              {plan.status === 'paused' && (
                <p className="text-center text-sm text-white/60">
                  When paused, the Today page won&apos;t schedule training days
                </p>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="mb-4 text-xl font-semibold text-white">
              Training Schedule
            </h2>

            {scheduleError && (
              <div className="mb-4 rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-200">
                {scheduleError}
              </div>
            )}

            <p className="mb-4 text-sm text-white/60">
              Select which days of the week you want to train. Changes only affect
              future training days—completed days stay as they are.
            </p>

            <div className="mb-6 grid grid-cols-7 gap-2">
              {ALL_DAYS.map((day) => {
                const isSelected = selectedTrainingDays.includes(day);
                const isLastSelected = isSelected && selectedTrainingDays.length === 1;

                return (
                  <button
                    key={day}
                    onClick={() => handleToggleTrainingDay(day)}
                    disabled={isLastSelected}
                    className={`rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-blue-500/80 text-white shadow-md'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    } ${isLastSelected ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={handleSaveSchedule}
              disabled={!hasScheduleChanged() || savingSchedule}
              className="w-full"
            >
              {savingSchedule ? 'Saving...' : 'Save schedule'}
            </Button>

            {selectedTrainingDays.length === 1 && (
              <p className="mt-2 text-center text-xs text-white/50">
                At least one training day must be selected
              </p>
            )}
          </GlassCard>
        </>
      ) : (
        <GlassCard>
          <div className="text-center">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">No active focus plan</h2>
            <p className="mb-6 text-white/70">
              Create a plan to start building your focus capacity
            </p>
            <Link href="/onboarding">
              <Button>Create your plan</Button>
            </Link>
          </div>
        </GlassCard>
      )}

      {preferences && (
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">
            Timer preferences
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div className="flex-1">
                <div className="font-medium text-white">Sound notifications</div>
                <div className="mt-1 text-sm text-white/60">
                  Play a soft sound when a session finishes
                </div>
              </div>
              <button
                onClick={() =>
                  handlePreferenceChange('soundEnabled', !preferences.soundEnabled)
                }
                disabled={saving}
                className={`relative h-8 w-14 rounded-full transition-colors ${
                  preferences.soundEnabled ? 'bg-green-500/80' : 'bg-white/20'
                }`}
                aria-label="Toggle sound notifications"
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                    preferences.soundEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                ></span>
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div className="flex-1">
                <div className="font-medium text-white">Desktop notifications</div>
                <div className="mt-1 text-sm text-white/60">
                  Show a notification when a focus or break session ends
                </div>
                {!notificationsSupported && (
                  <div className="mt-2 text-xs text-red-300">
                    Notifications are not supported in this browser
                  </div>
                )}
                {notificationsSupported && notificationPermission === 'denied' && preferences.notificationsEnabled && (
                  <div className="mt-2 text-xs text-yellow-300">
                    Notifications are blocked in your browser settings. You can enable them in your browser and then try again.
                  </div>
                )}
              </div>
              <button
                onClick={() =>
                  handlePreferenceChange('notificationsEnabled', !preferences.notificationsEnabled)
                }
                disabled={saving || !notificationsSupported}
                className={`relative h-8 w-14 rounded-full transition-colors ${
                  preferences.notificationsEnabled && notificationsSupported ? 'bg-green-500/80' : 'bg-white/20'
                } ${!notificationsSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Toggle desktop notifications"
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                    preferences.notificationsEnabled && notificationsSupported
                      ? 'translate-x-7'
                      : 'translate-x-1'
                  }`}
                ></span>
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
              <div className="flex-1">
                <div className="font-medium text-white">Auto-start next session</div>
                <div className="mt-1 text-sm text-white/60">
                  Automatically start the next session after one completes
                </div>
              </div>
              <button
                onClick={() =>
                  handlePreferenceChange(
                    'autoStartNextSegment',
                    !preferences.autoStartNextSegment
                  )
                }
                disabled={saving}
                className={`relative h-8 w-14 rounded-full transition-colors ${
                  preferences.autoStartNextSegment ? 'bg-green-500/80' : 'bg-white/20'
                }`}
                aria-label="Toggle auto-start next session"
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                    preferences.autoStartNextSegment
                      ? 'translate-x-7'
                      : 'translate-x-1'
                  }`}
                ></span>
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <h2 className="mb-4 text-xl font-semibold text-white">Account</h2>

        <div className="space-y-4">
          <div className="flex justify-between rounded-xl bg-white/5 p-4">
            <span className="text-white/70">Email</span>
            <span className="font-medium text-white">{user?.email}</span>
          </div>

          <button
            onClick={signOut}
            className="btn-secondary w-full justify-start text-white/90"
          >
            Sign out
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
