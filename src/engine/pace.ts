import { MAINTAIN_BAND_LB, PROJECTION_CAP_DAYS, TREND_PAUSED_AFTER_DAYS } from './constants';
import { addDays, daysBetween } from './dates';
import { computeTrend, emaStep, trendRateKgPerWeek, type WeighInPoint } from './trend';
import type { GoalMode, LocalDate, PaceStatus } from './types';
import { lbToKg } from './units';

export type PaceInput = {
  weighIns: WeighInPoint[];
  plan: {
    startDate: LocalDate;
    rateKgPerWeek: number;
    goalWeightKg: number;
    mode: GoalMode;
  };
  today: LocalDate;
};

export type PaceResult = {
  status: PaceStatus;
  trendKg: number;
  expectedKg: number;
  deltaKg: number; // Positive means ahead of plan.
  deltaDays: number;
  rateKgPerWeek: number | null;
  projectedGoalDate: LocalDate | null;
  projectionCapped: boolean;
};

const MIN_TOLERANCE_KG = lbToKg(0.5);

export function computePace({ weighIns, plan, today }: PaceInput): PaceResult {
  const trend = computeTrend(weighIns);
  const last = trend.at(-1);
  if (!last) throw new Error('computePace needs at least one weigh-in');

  const { rateKgPerWeek, goalWeightKg, mode, startDate } = plan;
  const direction = mode === 'gain' ? 1 : -1;
  const trendKg = last.trendKg;

  // The trend lags the scale, so the plan line runs through the same smoothing on the same days.
  // Comparing against the straight line would make everyone look behind early on.
  const startTrend = trend[0].trendKg;
  const idealAt = (date: LocalDate) =>
    startTrend + direction * (rateKgPerWeek / 7) * daysBetween(startDate, date);
  let expectedKg = startTrend;
  for (let i = 1; i < trend.length; i++) {
    const { localDate } = trend[i];
    expectedKg = emaStep(
      expectedKg,
      idealAt(localDate),
      daysBetween(trend[i - 1].localDate, localDate),
    );
  }

  const rate = trendRateKgPerWeek(trend);
  const progressRate = rate === null ? null : rate * direction;

  let projectedGoalDate: LocalDate | null = null;
  let projectionCapped = false;
  if (progressRate !== null && progressRate > 0) {
    const days = (Math.abs(trendKg - goalWeightKg) / progressRate) * 7;
    if (days > PROJECTION_CAP_DAYS) projectionCapped = true;
    else projectedGoalDate = addDays(today, Math.ceil(days));
  }

  const deltaKg = mode === 'maintain' ? 0 : (trendKg - expectedKg) * direction;
  const deltaDays = rateKgPerWeek > 0 ? deltaKg / (rateKgPerWeek / 7) : 0;

  const shared = {
    trendKg,
    expectedKg,
    deltaKg,
    deltaDays,
    rateKgPerWeek: rate,
    projectedGoalDate,
    projectionCapped,
  };

  if (daysBetween(last.localDate, today) >= TREND_PAUSED_AFTER_DAYS) {
    return { ...shared, status: 'paused' };
  }
  if (mode === 'maintain') {
    const inBand = Math.abs(trendKg - goalWeightKg) <= lbToKg(MAINTAIN_BAND_LB);
    return { ...shared, expectedKg: goalWeightKg, status: inBand ? 'on_pace' : 'behind' };
  }

  const tolerance = Math.max(MIN_TOLERANCE_KG, 0.25 * rateKgPerWeek);
  const status = deltaKg > tolerance ? 'ahead' : deltaKg < -tolerance ? 'behind' : 'on_pace';
  return { ...shared, status };
}
