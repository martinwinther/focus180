'use client';

import { useState, useEffect } from 'react';
import { getSessionLogsForDay } from '@/lib/firestore/sessionLogs';
import { buildDailySummary, type DailySummary } from '@/lib/focus/history';
import type { FocusDay } from '@/lib/types/focusPlan';

interface TodayProgressProps {
  userId: string;
  planId: string;
  focusDay: FocusDay;
  refreshKey?: number;
}

export function TodayProgress({
  userId,
  planId,
  focusDay,
  refreshKey = 0,
}: TodayProgressProps) {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProgress() {
      setLoading(true);
      try {
        const logs = await getSessionLogsForDay(planId, focusDay.id || focusDay.date);
        const dailySummary = buildDailySummary(focusDay, logs);
        setSummary(dailySummary);
      } catch (error) {
        console.error('Error fetching today progress:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, [userId, planId, focusDay, refreshKey]);

  if (loading || !summary || summary.actualWorkMinutes === 0) {
    return null;
  }

  const percentage = Math.round(summary.completionRatio * 100);
  const isComplete = summary.completionRatio >= 1.0;
  const isNearlyComplete = summary.completionRatio >= 0.8;

  return (
    <div className="glass-card border-2 border-white/20">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white/60">Today's Progress</div>
          <div className="mt-1 text-2xl font-bold text-white">
            {summary.actualWorkMinutes} / {summary.plannedMinutes} min
          </div>
        </div>
        <div className="text-right">
          <div
            className={`text-3xl font-bold ${
              isComplete
                ? 'text-green-400'
                : isNearlyComplete
                ? 'text-green-400'
                : 'text-white'
            }`}
          >
            {percentage}%
          </div>
          <div className="text-sm text-white/60">
            {isComplete
              ? 'Complete!'
              : isNearlyComplete
              ? 'Nearly done'
              : 'In progress'}
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete
              ? 'bg-green-500'
              : isNearlyComplete
              ? 'bg-green-500/80'
              : 'bg-white/60'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

