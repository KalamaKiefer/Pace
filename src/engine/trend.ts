import { TREND_ALPHA, TREND_RATE_WINDOW_DAYS } from './constants';
import { daysBetween } from './dates';
import type { LocalDate } from './types';

export type WeighInPoint = { localDate: LocalDate; weightKg: number };
export type TrendPoint = { localDate: LocalDate; trendKg: number };

// Time-aware smoothing, so a gap of n days counts the same as n daily steps toward the new value.
const alphaForGap = (days: number) => 1 - (1 - TREND_ALPHA) ** days;

export function emaStep(previous: number, value: number, gapDays: number) {
  return previous + alphaForGap(gapDays) * (value - previous);
}

export function computeTrend(weighIns: WeighInPoint[]): TrendPoint[] {
  const sorted = [...weighIns].sort((a, b) => a.localDate.localeCompare(b.localDate));
  const points: TrendPoint[] = [];
  for (const { localDate, weightKg } of sorted) {
    const previous = points.at(-1);
    points.push({
      localDate,
      trendKg: previous
        ? emaStep(previous.trendKg, weightKg, daysBetween(previous.localDate, localDate))
        : weightKg,
    });
  }
  return points;
}

// Slope of a linear fit over the last 21 days. Negative means losing.
export function trendRateKgPerWeek(points: TrendPoint[]) {
  const last = points.at(-1);
  if (!last) return null;
  const recent = points
    .map((p) => ({ x: daysBetween(last.localDate, p.localDate), y: p.trendKg }))
    .filter((p) => p.x >= -TREND_RATE_WINDOW_DAYS);
  if (recent.length < 2) return null;

  const meanX = recent.reduce((sum, p) => sum + p.x, 0) / recent.length;
  const meanY = recent.reduce((sum, p) => sum + p.y, 0) / recent.length;
  const numerator = recent.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
  const denominator = recent.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
  return (numerator / denominator) * 7;
}
