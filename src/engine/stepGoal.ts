import {
  BASELINE_STEPS,
  STEP_GOAL_BUMP,
  STEP_GOAL_MAX,
  STEP_GOAL_MIN,
  STEP_GOAL_STEP,
  STRIDE_FACTOR,
  WALK_NET_KCAL_PER_KG_PER_M,
} from './constants';
import type { Sex } from './types';

export const kcalPerStep = (sex: Sex, weightKg: number, heightCm: number) =>
  WALK_NET_KCAL_PER_KG_PER_M * weightKg * (heightCm / 100) * STRIDE_FACTOR[sex];

// Only steps above the baseline count: the sedentary factor already includes the rest.
export const stepKcal = (steps: number, perStep: number) =>
  Math.max(0, steps - BASELINE_STEPS) * perStep;

export function defaultStepGoal(baselineSteps: number) {
  const rounded = Math.ceil((baselineSteps + STEP_GOAL_BUMP) / STEP_GOAL_STEP) * STEP_GOAL_STEP;
  return Math.min(STEP_GOAL_MAX, Math.max(STEP_GOAL_MIN, rounded));
}
