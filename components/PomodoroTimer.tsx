'use client';

import { useState, useEffect, useRef } from 'react';
import { usePomodoroTimer } from '@/lib/focus/usePomodoroTimer';
import { logCompletedWorkSegment } from '@/lib/firestore/sessionLogs';
import { getUserPreferences } from '@/lib/firestore/userPreferences';
import { GlassCard } from '@/components/ui';
import type { FocusSegment } from '@/lib/types/focusPlan';
import type { UserPreferences } from '@/lib/firestore/userPreferences';

interface PomodoroTimerProps {
  userId: string;
  planId: string;
  dayId: string;
  segments: FocusSegment[];
  dailyTargetMinutes: number;
  dayIndex: number;
  date: string;
}

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
  const segmentStartTimesRef = useRef<Map<number, Date>>(new Map());
  const lastLoggedSegmentRef = useRef<number>(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const prefs = await getUserPreferences(userId);
        setPreferences(prefs);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }

    loadPreferences();

    // Create audio element for completion sound
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      // Simple notification sound using data URI (a pleasant chime)
      audioRef.current.src =
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuAzPLZiTYIG2m98OGpTAoQU6rm8LNlHQU2kdry0H4sBS2Aycy93ogzBxdqvfDnr1YJDVW06e+wXhwE';
    }
  }, [userId]);

  const playCompletionSound = () => {
    if (preferences?.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error('Error playing sound:', error);
      });
    }
  };

  const handleWorkSegmentStart = (segmentIndex: number, segment: FocusSegment) => {
    segmentStartTimesRef.current.set(segmentIndex, new Date());
  };

  const handleSegmentComplete = async (segmentIndex: number, segment: FocusSegment) => {
    // Play sound for any segment completion
    playCompletionSound();

    // Only log work segments
    if (segment.type !== 'work') return;

    // Guard against multiple logs for the same segment
    if (lastLoggedSegmentRef.current === segmentIndex) {
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

    // Validate that actualSeconds is reasonable (not negative or absurdly large)
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

      // Mark this segment as logged
      lastLoggedSegmentRef.current = segmentIndex;
      segmentStartTimesRef.current.delete(segmentIndex);
      setIsLoggingError(false);
      setLoggingErrorMessage('');
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

  const { state, controls } = usePomodoroTimer({
    segments,
    autoStartFirstWorkSegment: false,
    onSegmentComplete: handleSegmentComplete,
    onWorkSegmentStart: handleWorkSegmentStart,
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
      <GlassCard className="text-center">
        {/* Session Type Label */}
        <div className="mb-4">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
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
          className={`mb-6 text-8xl font-bold tabular-nums transition-colors ${
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
                className="btn-primary"
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
                className="btn-primary"
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
              className="btn-secondary"
              aria-label="Skip to next session"
            >
              Skip
            </button>

            <button
              onClick={controls.reset}
              className="btn-ghost"
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
            <button onClick={controls.reset} className="btn-secondary">
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
        <h3 className="mb-4 text-lg font-semibold text-white">Today's sessions</h3>
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
                className={`flex items-center justify-between rounded-xl p-4 transition-all ${
                  isActive
                    ? 'bg-white/20 ring-2 ring-white/30 scale-[1.02]'
                    : isCompleted
                    ? 'bg-white/5 opacity-60'
                    : 'bg-white/5 hover:bg-white/10'
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
