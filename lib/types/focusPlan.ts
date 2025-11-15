import { Timestamp } from 'firebase/firestore';

export type FocusPlanStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface FocusPlan {
  id?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startDate: string;
  targetDailyMinutes: number;
  endDate?: string;
  trainingDaysCount?: number;
  trainingDaysPerWeek: string[];
  status: FocusPlanStatus;
  completedAt?: Timestamp | null;
  pausedAt?: Timestamp | null;
  startingDailyMinutes?: number;
}

export interface FocusPlanConfig {
  targetDailyMinutes: number;
  endDate?: string;
  trainingDaysCount?: number;
  trainingDaysPerWeek: string[];
  startingDailyMinutes?: number;
}

export interface FocusSegment {
  type: 'work' | 'break';
  minutes: number;
}

export type FocusDayStatus = 'pending' | 'completed' | 'missed';

export interface FocusDay {
  id?: string;
  planId: string;
  userId: string;
  index: number;
  date: string;
  dailyTargetMinutes: number;
  segments: FocusSegment[];
  status?: FocusDayStatus;
  completedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

