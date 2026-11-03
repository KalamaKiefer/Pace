import { CARDIO_CREDIT_MAX_KCAL_PER_DAY } from './constants';
import type { CardioActivity, CardioIntensity, Macros } from './types';

// Approximate values based on the Compendium of Physical Activities.
const MET: Record<CardioActivity, Record<CardioIntensity, number>> = {
  walk: { easy: 3, moderate: 3.8, hard: 5 },
  run: { easy: 8.3, moderate: 9.8, hard: 11.8 },
  cycle: { easy: 5.5, moderate: 7, hard: 10 },
  row: { easy: 4.8, moderate: 7, hard: 8.5 },
  elliptical: { easy: 5, moderate: 7, hard: 9 },
  stairs: { easy: 4, moderate: 8.8, hard: 9 },
  swim: { easy: 5.8, moderate: 7, hard: 9.8 },
  hike: { easy: 5.3, moderate: 6, hard: 7.8 },
  hiit: { easy: 6, moderate: 8, hard: 10 },
  other: { easy: 4, moderate: 6, hard: 8 },
};

const STEPS_PER_MINUTE: Partial<Record<CardioActivity, number>> = {
  walk: 100,
  run: 160,
  hike: 90,
};

export const metFor = (activity: CardioActivity, intensity: CardioIntensity) =>
  MET[activity][intensity];

// Fallback for sessions when Apple Health can't give the steps for that time range.
export const estimateOnFootSteps = (activity: CardioActivity, durationS: number) =>
  Math.round(((STEPS_PER_MINUTE[activity] ?? 0) * durationS) / 60);

export function cardioCredit({
  met,
  weightKg,
  durationS,
  onFootSteps = 0,
  kcalPerStep = 0,
}: {
  met: number;
  weightKg: number;
  durationS: number;
  onFootSteps?: number;
  kcalPerStep?: number;
}) {
  // MET − 1 removes resting burn, which BMR already covers.
  const netKcal = (met - 1) * weightKg * (durationS / 3600);
  // Step energy is already counted through the step total, so one walk can't count twice.
  const creditKcal = Math.max(0, netKcal - onFootSteps * kcalPerStep);
  return { netKcal, creditKcal };
}

export const dayCredit = (credits: number[]) =>
  Math.min(
    CARDIO_CREDIT_MAX_KCAL_PER_DAY,
    credits.reduce((sum, credit) => sum + credit, 0),
  );

export const effectiveTarget = (baseKcal: number, credits: number[]) =>
  Math.round((baseKcal + dayCredit(credits)) / 10) * 10;

export const macrosWithCredit = (macros: Macros, creditKcal: number): Macros => ({
  ...macros,
  carbsG: macros.carbsG + Math.round(creditKcal / 4),
});

// Display only. Going over the step goal never changes the calorie target.
export function extraStepBurn({
  steps,
  stepGoal,
  kcalPerStep,
}: {
  steps: number;
  stepGoal: number;
  kcalPerStep: number;
}) {
  const surplusSteps = Math.max(0, steps - stepGoal);
  return { surplusSteps, extraKcal: Math.round(surplusSteps * kcalPerStep) };
}
