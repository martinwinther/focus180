'use client';

import { useState, useEffect } from 'react';
import type { FocusPlanConfig } from '@/lib/types/focusPlan';

const STORAGE_KEY = 'focus-ramp-plan-config';

export function usePlanConfig() {
  const [config, setConfig] = useState<FocusPlanConfig | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setConfig(JSON.parse(stored));
      } catch {
        // ignore invalid JSON
      }
    }
  }, []);

  const savePlanConfig = (newConfig: FocusPlanConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    setConfig(newConfig);
  };

  const clearPlanConfig = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(null);
  };

  return {
    config,
    savePlanConfig,
    clearPlanConfig,
  };
}


