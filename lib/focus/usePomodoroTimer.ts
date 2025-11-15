'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface FocusSegment {
  type: 'work' | 'break';
  minutes: number;
}

export interface UsePomodoroTimerOptions {
  segments: FocusSegment[];
  autoStartFirstWorkSegment?: boolean;
  onSegmentComplete?: (segmentIndex: number, segment: FocusSegment) => void;
  onWorkSegmentStart?: (segmentIndex: number, segment: FocusSegment) => void;
}

export interface PomodoroTimerState {
  currentIndex: number;
  currentSegment: FocusSegment | null;
  secondsRemaining: number;
  isRunning: boolean;
  isFinished: boolean;
  completedSegments: number[];
}

export interface PomodoroTimerControls {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skipSegment: () => void;
  goToSegment: (index: number) => void;
}

export function usePomodoroTimer(
  options: UsePomodoroTimerOptions
): { state: PomodoroTimerState; controls: PomodoroTimerControls } {
  const { segments, autoStartFirstWorkSegment = false, onSegmentComplete, onWorkSegmentStart } = options;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(
    segments.length > 0 ? segments[0].minutes * 60 : 0
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [completedSegments, setCompletedSegments] = useState<number[]>([]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const segmentStartTimeRef = useRef<Date | null>(null);

  const currentSegment = segments[currentIndex] || null;

  // Clean up interval on unmount or component navigation
  // TODO: In a future enhancement, persist mid-segment state to allow
  // resuming if user navigates away during an active session
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Handle timer tick
  useEffect(() => {
    if (isRunning && secondsRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Segment completed
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, secondsRemaining]);

  // Handle segment completion and auto-advance
  useEffect(() => {
    if (isRunning && secondsRemaining === 0) {
      // Current segment is complete
      const completedIndex = currentIndex;
      const completedSegment = segments[completedIndex];

      // Mark segment as completed
      setCompletedSegments((prev) => [...prev, completedIndex]);

      // Notify completion
      if (onSegmentComplete) {
        onSegmentComplete(completedIndex, completedSegment);
      }

      // Check if there are more segments
      if (currentIndex < segments.length - 1) {
        const nextIndex = currentIndex + 1;
        const nextSegment = segments[nextIndex];
        
        setCurrentIndex(nextIndex);
        setSecondsRemaining(nextSegment.minutes * 60);
        
        // Auto-start the next segment if it's a work segment or a break
        // For now, auto-start all segments for smooth UX
        setIsRunning(true);
        segmentStartTimeRef.current = new Date();
        
        // Notify if starting a work segment
        if (nextSegment.type === 'work' && onWorkSegmentStart) {
          onWorkSegmentStart(nextIndex, nextSegment);
        }
      } else {
        // No more segments
        setIsRunning(false);
        setIsFinished(true);
      }
    }
  }, [isRunning, secondsRemaining, currentIndex, segments, onSegmentComplete, onWorkSegmentStart]);

  const start = useCallback(() => {
    if (isFinished) return;
    
    setIsRunning(true);
    segmentStartTimeRef.current = new Date();
    
    // Notify if starting a work segment
    if (currentSegment?.type === 'work' && onWorkSegmentStart) {
      onWorkSegmentStart(currentIndex, currentSegment);
    }
  }, [isFinished, currentSegment, currentIndex, onWorkSegmentStart]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (!isFinished) {
      setIsRunning(true);
    }
  }, [isFinished]);

  const reset = useCallback(() => {
    setCurrentIndex(0);
    setSecondsRemaining(segments.length > 0 ? segments[0].minutes * 60 : 0);
    setIsRunning(false);
    setIsFinished(false);
    setCompletedSegments([]);
    segmentStartTimeRef.current = null;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [segments]);

  const skipSegment = useCallback(() => {
    if (isFinished) return;

    // Note: Skipped segments are NOT logged as completed work sessions
    // They are only marked in the UI as "completed" for progress tracking
    // The onSegmentComplete callback is not called for skipped segments
    if (!completedSegments.includes(currentIndex)) {
      setCompletedSegments((prev) => [...prev, currentIndex]);
    }

    if (currentIndex < segments.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextSegment = segments[nextIndex];
      
      setCurrentIndex(nextIndex);
      setSecondsRemaining(nextSegment.minutes * 60);
      segmentStartTimeRef.current = new Date();
      
      // Keep running state if timer was running
      if (isRunning && nextSegment.type === 'work' && onWorkSegmentStart) {
        onWorkSegmentStart(nextIndex, nextSegment);
      }
    } else {
      setIsRunning(false);
      setIsFinished(true);
    }
  }, [currentIndex, segments, completedSegments, isFinished, isRunning, onWorkSegmentStart]);

  const goToSegment = useCallback(
    (index: number) => {
      if (index < 0 || index >= segments.length) return;

      setCurrentIndex(index);
      setSecondsRemaining(segments[index].minutes * 60);
      setIsRunning(false);
      setIsFinished(false);
      segmentStartTimeRef.current = null;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    },
    [segments]
  );

  // Auto-start first segment if configured
  useEffect(() => {
    if (autoStartFirstWorkSegment && segments.length > 0 && segments[0].type === 'work') {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    state: {
      currentIndex,
      currentSegment,
      secondsRemaining,
      isRunning,
      isFinished,
      completedSegments,
    },
    controls: {
      start,
      pause,
      resume,
      reset,
      skipSegment,
      goToSegment,
    },
  };
}

