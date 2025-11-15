'use client';

import { useState, useEffect, useRef } from 'react';
import { usePomodoroTimer } from '@/lib/focus/usePomodoroTimer';
import { logCompletedWorkSegment, getSessionLogsForDay } from '@/lib/firestore/sessionLogs';
import { getUserPreferences } from '@/lib/firestore/userPreferences';
import { markDayCompleted } from '@/lib/firestore/focusDays';
import { isLastTrainingDay, completePlan } from '@/lib/focus/planCompletion';
import {
  canUseNotifications,
  requestNotificationPermission,
  showSessionNotification,
} from '@/lib/focus/notifications';
import {
  saveSessionState,
  clearSessionState,
  loadSessionState,
  calculateEffectiveSecondsRemaining,
  type PersistedSessionState,
} from '@/lib/focus/sessionPersistence';
import { GlassCard, Button } from '@/components/ui';
import type { FocusSegment } from '@/lib/types/focusPlan';
import type { UserPreferences } from '@/lib/firestore/userPreferences';
import type { PomodoroTimerState } from '@/lib/focus/usePomodoroTimer';

interface PomodoroTimerProps {
  userId: string;
  planId: string;
  dayId: string;
  segments: FocusSegment[];
  dailyTargetMinutes: number;
  dayIndex: number;
  date: string;
}

type ResumeDecision = 'pending' | 'resume' | 'restart' | null;

export function PomodoroTimer({
  userId,
  planId,
  dayId,
  segments,
  dailyTargetMinutes,
  dayIndex,
  date,
}: PomodoroTimerProps) {
  const [isLoggingError, setIsLoggingError] = useState(false);
  const [loggingErrorMessage, setLoggingErrorMessage] = useState<string>('');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loggedSegmentIndices, setLoggedSegmentIndices] = useState<Set<number>>(new Set());
  const [resumeDecision, setResumeDecision] = useState<ResumeDecision>(null);
  const [persistedState, setPersistedState] = useState<PersistedSessionState | null>(null);
  const [initialTimerOptions, setInitialTimerOptions] = useState<{
    initialSegmentIndex: number;
    initialSecondsRemaining: number;
    initialIsRunning: boolean;
  } | null>(null);

  const segmentStartTimesRef = useRef<Map<number, Date>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitializedRef = useRef(false);

  // Load preferences and already-logged segments
  useEffect(() => {
    async function loadInitialData() {
      try {
        const prefs = await getUserPreferences(userId);
        setPreferences(prefs);

        // Request notification permission if notifications are enabled
        if (prefs.notificationsEnabled && canUseNotifications()) {
          const permission = await requestNotificationPermission();
          console.log('Notification permission:', permission);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }

      try {
        const existingLogs = await getSessionLogsForDay(planId, dayId);
        const loggedIndices = new Set(existingLogs.map((log) => log.segmentIndex));
        setLoggedSegmentIndices(loggedIndices);
      } catch (error) {
        console.error('Error loading session logs:', error);
      }
    }

    loadInitialData();

    // Create audio element for completion sound
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.src =
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuAzPLZiTYIG2m98OGpTAoQU6rm8LNlHQU2kdry0H4sBS2Aycy93ogzBxdqvfDnr1YJDVW06e+wXhwE';
    }
  }, [userId, planId, dayId]);

  // Check for persisted state on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const persisted = loadSessionState(userId);
    
    if (!persisted) {
      // No persisted state, start fresh
      setResumeDecision(null);
      setInitialTimerOptions({
        initialSegmentIndex: 0,
        initialSecondsRemaining: segments[0]?.minutes * 60 || 0,
        initialIsRunning: false,
      });
      return;
    }

    // Validate that persisted state matches current context
    const isMatchingPlan = persisted.planId === planId;
    const isMatchingDay = persisted.dayId === dayId;
    const isMatchingDate = persisted.date === date;

    if (!isMatchingPlan || !isMatchingDay || !isMatchingDate) {
      console.log('Persisted state is stale (different plan/day/date), clearing');
      clearSessionState(userId);
      setResumeDecision(null);
      setInitialTimerOptions({
        initialSegmentIndex: 0,
        initialSecondsRemaining: segments[0]?.minutes * 60 || 0,
        initialIsRunning: false,
      });
      return;
    }

    // Calculate effective seconds remaining
    const effectiveSeconds = calculateEffectiveSecondsRemaining(persisted);

    // Check if segment index is valid
    if (persisted.segmentIndex >= segments.length) {
      console.log('Persisted segment index out of range, clearing');
      clearSessionState(userId);
      setResumeDecision(null);
      setInitialTimerOptions({
        initialSegmentIndex: 0,
        initialSecondsRemaining: segments[0]?.minutes * 60 || 0,
        initialIsRunning: false,
      });
      return;
    }

    // If segment time expired while away, show resume dialog with 0 seconds.
    // Future enhancement: Could auto-advance segments if multiple have elapsed.
    if (effectiveSeconds <= 0) {
      console.log('Segment time expired while away, treating as completed but not logged');
      setPersistedState({ ...persisted, secondsRemaining: 0 });
      setResumeDecision('pending');
      return;
    }

    // Valid persisted state found
    setPersistedState(persisted);
    setResumeDecision('pending');
  }, [userId, planId, dayId, date, segments]);

  // Handle resume decision
  const handleResume = () => {
    if (!persistedState) return;

    const effectiveSeconds = calculateEffectiveSecondsRemaining(persistedState);

    setInitialTimerOptions({
      initialSegmentIndex: persistedState.segmentIndex,
      initialSecondsRemaining: effectiveSeconds,
      initialIsRunning: false, // Start paused for better UX
    });
    setResumeDecision('resume');
  };

  const handleRestart = () => {
    clearSessionState(userId);
    setPersistedState(null);
    setInitialTimerOptions({
      initialSegmentIndex: 0,
      initialSecondsRemaining: segments[0]?.minutes * 60 || 0,
      initialIsRunning: false,
    });
    setResumeDecision('restart');
  };

  const playCompletionSound = () => {
    if (preferences?.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error('Error playing sound:', error);
      });
    }
  };

  const showSegmentNotification = (segmentType: 'work' | 'break', isLastSegment: boolean) => {
    // Only show notification if:
    // 1. User has enabled notifications
    // 2. Browser permission is granted
    // 3. Tab is not in focus (document is hidden)
    if (
      !preferences?.notificationsEnabled ||
      !canUseNotifications() ||
      typeof document === 'undefined' ||
      document.visibilityState === 'visible'
    ) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    // Determine notification message based on what just finished
    if (isLastSegment) {
      showSessionNotification({
        title: "Today's training done",
        body: "You've completed today's focus plan.",
      });
    } else if (segmentType === 'work') {
      // Work segment just finished, about to enter break
      showSessionNotification({
        title: 'Work session complete',
        body: 'Take a 5-minute break.',
      });
    } else {
      // Break segment just finished, about to enter work
      showSessionNotification({
        title: 'Break over',
        body: 'Next focus session is ready.',
      });
    }
  };

  const handleWorkSegmentStart = (segmentIndex: number, segment: FocusSegment) => {
    segmentStartTimesRef.current.set(segmentIndex, new Date());
  };

  const handleSegmentComplete = async (segmentIndex: number, segment: FocusSegment) => {
    playCompletionSound();

    // Check if this is the last segment
    const isLastSegment = segmentIndex === segments.length - 1;

    // Show notification for segment completion
    showSegmentNotification(segment.type, isLastSegment);

    // Only log work segments
    if (segment.type !== 'work') return;

    // Check if already logged (prevent double-logging on resume)
    if (loggedSegmentIndices.has(segmentIndex)) {
      console.warn('Segment already logged, skipping:', segmentIndex);
      return;
    }

    const startTime = segmentStartTimesRef.current.get(segmentIndex);
    if (!startTime) {
      console.error('No start time found for segment:', segmentIndex);
      return;
    }

    const endTime = new Date();
    const actualSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    if (actualSeconds < 0 || actualSeconds > segment.minutes * 120) {
      console.error('Invalid actual seconds:', actualSeconds, 'for segment:', segmentIndex);
      setIsLoggingError(true);
      setLoggingErrorMessage('Timer data looks incorrect. Session may not have been logged.');
      return;
    }

    try {
      await logCompletedWorkSegment({
        userId,
        planId,
        dayId,
        segmentIndex,
        segmentType: 'work',
        plannedMinutes: segment.minutes,
        actualSeconds,
        startedAt: startTime,
        endedAt: endTime,
      });

      // Mark as logged
      setLoggedSegmentIndices((prev) => new Set([...prev, segmentIndex]));
      segmentStartTimesRef.current.delete(segmentIndex);
      setIsLoggingError(false);
      setLoggingErrorMessage('');

      // If this is the last segment, mark the day as completed.
      // Future enhancement: Could use completion ratio thresholds (e.g., ≥80%) for partial credit.
      if (isLastSegment) {
        try {
          await markDayCompleted(userId, planId, dayId);
          console.log('Day marked as completed');

          // Check if this is the last training day in the plan
          const isLastDay = await isLastTrainingDay(planId, date, userId);
          if (isLastDay) {
            await completePlan(userId, planId);
            console.log('Plan completed - user finished the last training day');
          }
        } catch (error) {
          console.error('Error marking day/plan as completed:', error);
          // Don't show error to user - their progress is already logged
          // The day completion status can be fixed later if needed
        }
      }
    } catch (error) {
      console.error('Error logging work segment:', error);
      setIsLoggingError(true);
      setLoggingErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not save this session. Your timer still worked, but this session might not appear in history.'
      );
    }
  };

  const handleStateChange = (state: PomodoroTimerState) => {
    // Save state to localStorage for persistence
    const currentSegment = segments[state.currentIndex];
    
    if (!currentSegment) return;

    // Only save if not finished
    if (state.isFinished) {
      clearSessionState(userId);
      return;
    }

    const persistState: PersistedSessionState = {
      userId,
      planId,
      dayId,
      date,
      segmentIndex: state.currentIndex,
      segmentType: currentSegment.type,
      segmentPlannedMinutes: currentSegment.minutes,
      secondsRemaining: state.secondsRemaining,
      isRunning: state.isRunning,
      lastUpdatedAt: Date.now(),
    };

    saveSessionState(persistState);
  };

  // Show resume/restart dialog if needed
  if (resumeDecision === 'pending' && persistedState) {
    const effectiveSeconds = calculateEffectiveSecondsRemaining(persistedState);
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <GlassCard>
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/20">
              <svg
                className="h-8 w-8 text-blue-400"
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
            </div>
          </div>
          
          <h2 className="mb-2 text-2xl font-bold text-white">
            Session in progress
          </h2>
          
          <p className="mb-6 text-white/70">
            You have an active session for today.
          </p>

          <div className="mb-6 rounded-xl bg-white/5 p-4">
            <div className="text-sm text-white/60 mb-1">Current segment</div>
            <div className="text-lg font-semibold text-white mb-2">
              {persistedState.segmentType === 'work' ? 'Work session' : 'Break time'} •{' '}
              Session {persistedState.segmentIndex + 1} of {segments.length}
            </div>
            {effectiveSeconds > 0 && (
              <>
                <div className="text-sm text-white/60 mb-1">Time remaining</div>
                <div className="text-3xl font-bold text-blue-300">
                  {formatTime(effectiveSeconds)}
                </div>
              </>
            )}
            {effectiveSeconds <= 0 && (
              <div className="text-sm text-yellow-400">
                Time expired while away
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={handleResume}>Resume</Button>
            <Button variant="secondary" onClick={handleRestart}>
              Restart today
            </Button>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Wait for initialization
  if (!initialTimerOptions) {
    return (
      <GlassCard>
        <div className="text-center py-8">
          <div className="text-white/60">Loading timer...</div>
        </div>
      </GlassCard>
    );
  }

  // Render main timer
  return (
    <TimerDisplay
      userId={userId}
      planId={planId}
      dayId={dayId}
      segments={segments}
      dailyTargetMinutes={dailyTargetMinutes}
      initialTimerOptions={initialTimerOptions}
      onWorkSegmentStart={handleWorkSegmentStart}
      onSegmentComplete={handleSegmentComplete}
      onStateChange={handleStateChange}
      isLoggingError={isLoggingError}
      loggingErrorMessage={loggingErrorMessage}
    />
  );
}

interface TimerDisplayProps {
  userId: string;
  planId: string;
  dayId: string;
  segments: FocusSegment[];
  dailyTargetMinutes: number;
  initialTimerOptions: {
    initialSegmentIndex: number;
    initialSecondsRemaining: number;
    initialIsRunning: boolean;
  };
  onWorkSegmentStart: (segmentIndex: number, segment: FocusSegment) => void;
  onSegmentComplete: (segmentIndex: number, segment: FocusSegment) => void;
  onStateChange: (state: PomodoroTimerState) => void;
  isLoggingError: boolean;
  loggingErrorMessage: string;
}

function TimerDisplay({
  userId,
  segments,
  initialTimerOptions,
  onWorkSegmentStart,
  onSegmentComplete,
  onStateChange,
  isLoggingError,
  loggingErrorMessage,
}: TimerDisplayProps) {
  const { state, controls } = usePomodoroTimer({
    segments,
    autoStartFirstWorkSegment: false,
    onSegmentComplete,
    onWorkSegmentStart,
    onStateChange,
    ...initialTimerOptions,
  });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getSegmentIcon = (segment: FocusSegment, isActive: boolean, isCompleted: boolean) => {
    if (isCompleted) {
      return (
        <svg
          className="h-5 w-5 text-green-400"
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
      );
    }

    if (isActive) {
      return <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>;
    }

    if (segment.type === 'work') {
      return (
        <svg
          className="h-5 w-5 text-white/60"
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
      );
    }

    return (
      <svg
        className="h-5 w-5 text-white/40"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  };

  const completedWorkMinutes = segments
    .filter((_, idx) => state.completedSegments.includes(idx))
    .filter((seg) => seg.type === 'work')
    .reduce((sum, seg) => sum + seg.minutes, 0);

  const totalWorkMinutes = segments
    .filter((seg) => seg.type === 'work')
    .reduce((sum, seg) => sum + seg.minutes, 0);

  const progressPercentage = (completedWorkMinutes / totalWorkMinutes) * 100;
  const currentSegment = segments[state.currentIndex];
  const isWorkSegment = currentSegment?.type === 'work';

  return (
    <div className="space-y-6">
      {/* Main Timer Display */}
      <GlassCard className="text-center transition-all duration-300 hover:scale-[1.01]">
        {/* Session Type Label */}
        <div className="mb-4">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
              isWorkSegment
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-green-500/20 text-green-300 border border-green-500/30'
            }`}
          >
            {isWorkSegment ? (
              <>
                <svg
                  className="h-4 w-4"
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
                Work session
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Break time
              </>
            )}
          </div>
        </div>

        {/* Timer Display */}
        <div
          className={`mb-6 text-8xl font-bold tabular-nums transition-colors duration-300 ${
            isWorkSegment ? 'text-blue-300' : 'text-green-300'
          }`}
        >
          {formatTime(state.secondsRemaining)}
        </div>

        {/* Segment Progress */}
        <div className="mb-6 text-white/70">
          Session {state.currentIndex + 1} of {segments.length}
        </div>

        {/* Work Progress Bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-white/60">Work completed today</span>
            <span className="font-semibold text-white">
              {completedWorkMinutes} / {totalWorkMinutes} min
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-white/50">
            {Math.round(progressPercentage)}% complete
          </div>
        </div>

        {/* Controls */}
        {!state.isFinished ? (
          <div className="flex justify-center gap-3">
            {!state.isRunning ? (
              <button
                onClick={
                  state.currentIndex === 0 &&
                  state.secondsRemaining === segments[0]?.minutes * 60
                    ? controls.start
                    : controls.resume
                }
                className="btn-primary transition-all duration-150 hover:scale-105 hover:shadow-lg"
                aria-label={
                  state.currentIndex === 0 &&
                  state.secondsRemaining === segments[0]?.minutes * 60
                    ? 'Start session'
                    : 'Resume session'
                }
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {state.currentIndex === 0 &&
                state.secondsRemaining === segments[0]?.minutes * 60
                  ? 'Start'
                  : 'Resume'}
              </button>
            ) : (
              <button
                onClick={controls.pause}
                className="btn-primary transition-all duration-150 hover:scale-105 hover:shadow-lg"
                aria-label="Pause session"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Pause
              </button>
            )}

            <button
              onClick={controls.skipSegment}
              className="btn-secondary transition-all duration-150 hover:scale-105"
              aria-label="Skip to next session"
            >
              Skip
            </button>

            <button
              onClick={controls.reset}
              className="btn-ghost transition-all duration-150 hover:scale-105"
              aria-label="Reset timer"
            >
              Reset
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <h3 className="mb-2 text-3xl font-bold text-white">
              All sessions complete!
            </h3>
            <p className="mb-6 text-lg text-white/70">
              Great work today. You completed {totalWorkMinutes} minutes of focused work.
            </p>
            <button onClick={controls.reset} className="btn-secondary transition-all duration-150 hover:scale-105">
              Review sessions
            </button>
          </div>
        )}

        {isLoggingError && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
            <div className="flex items-start gap-2">
              <svg
                className="h-5 w-5 flex-shrink-0 text-red-400"
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
              <div>
                <div className="font-medium">Logging issue</div>
                <div className="mt-1 text-xs text-red-200">
                  {loggingErrorMessage || 'Some work sessions may not have been logged properly.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Segment List */}
      <GlassCard>
        <h3 className="mb-4 text-lg font-semibold text-white">Today&apos;s sessions</h3>
        <p className="mb-4 text-sm text-white/60">
          Work through each session at your own pace
        </p>
        <div className="space-y-2">
          {segments.map((segment, index) => {
            const isActive = index === state.currentIndex;
            const isCompleted = state.completedSegments.includes(index);

            return (
              <div
                key={index}
                className={`flex items-center justify-between rounded-xl p-4 transition-all duration-300 ${
                  isActive
                    ? 'bg-white/20 ring-2 ring-white/30 scale-[1.02] animate-pulse'
                    : isCompleted
                    ? 'bg-white/5 opacity-60'
                    : 'bg-white/5 hover:bg-white/10 hover:scale-[1.01]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                      isCompleted
                        ? 'bg-green-500/20'
                        : segment.type === 'work'
                        ? 'bg-blue-500/20'
                        : 'bg-white/10'
                    }`}
                  >
                    {getSegmentIcon(segment, isActive, isCompleted)}
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {segment.type === 'work' ? 'Work session' : 'Break'}
                    </div>
                    <div className="text-sm text-white/60">{segment.minutes} minutes</div>
                  </div>
                </div>
                {isActive && state.isRunning && (
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse"></span>
                    In progress
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
