import { KCAL_PER_LB } from './constants';
import { kgToLb } from './units';

const SMOOTHING = 0.2;
const MAX_WEEKLY_CHANGE_KCAL = 100;

export function observedTdee({
  meanIntakeKcal,
  meanCardioCreditKcal,
  trendChangeKg,
  days,
}: {
  meanIntakeKcal: number;
  meanCardioCreditKcal: number;
  trendChangeKg: number;
  days: number;
}) {
  // Cardio credit comes out so it isn't counted again when added to each day's target.
  return meanIntakeKcal - meanCardioCreditKcal - (kgToLb(trendChangeKg) * KCAL_PER_LB) / days;
}

export function nextTdeeEstimate(previous: number, observed: number) {
  const smoothed = (1 - SMOOTHING) * previous + SMOOTHING * observed;
  return Math.min(
    previous + MAX_WEEKLY_CHANGE_KCAL,
    Math.max(previous - MAX_WEEKLY_CHANGE_KCAL, smoothed),
  );
}
