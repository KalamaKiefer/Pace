import { WALK_STEPS_PER_MINUTE } from './constants';
import type { StepStatus } from './types';

type Input = {
  steps: number;
  goal: number;
  nowMinutes: number; // Minutes from midnight.
  activeWindow: [number, number];
  hourlyShare?: number[]; // 24 entries from the user's 28-day pattern, summing to 1.
  typicalHourlyRate?: number;
};

export type StepPaceResult = {
  status: StepStatus;
  expectedByNow: number;
  remaining: number;
  hoursLeft: number;
  neededPerHour: number;
  walkMinutes: number;
};

const REACHABLE_RATE_FACTOR = 1.5;

function cumulativeShare(nowMinutes: number, [start, end]: [number, number], hourly?: number[]) {
  if (!hourly) return Math.min(1, Math.max(0, (nowMinutes - start) / (end - start)));
  const hour = Math.floor(nowMinutes / 60);
  const fullHours = hourly.slice(0, hour).reduce((sum, share) => sum + share, 0);
  return fullHours + (hourly[hour] ?? 0) * ((nowMinutes % 60) / 60);
}

export function computeStepPace({
  steps,
  goal,
  nowMinutes,
  activeWindow,
  hourlyShare,
  typicalHourlyRate,
}: Input): StepPaceResult {
  const [start, end] = activeWindow;
  const expectedByNow = goal * cumulativeShare(nowMinutes, activeWindow, hourlyShare);
  const remaining = Math.max(0, goal - steps);
  const hoursLeft = Math.max(0, (end - nowMinutes) / 60);
  const neededPerHour = hoursLeft > 0 ? remaining / hoursLeft : remaining;
  const walkMinutes = Math.ceil(remaining / WALK_STEPS_PER_MINUTE);
  const typical = typicalHourlyRate ?? goal / ((end - start) / 60);

  let status: StepStatus;
  if (remaining === 0) status = 'done';
  else if (steps >= expectedByNow) status = 'on_track';
  else if (hoursLeft > 0 && neededPerHour <= REACHABLE_RATE_FACTOR * typical)
    status = 'slightly_behind';
  else status = 'at_risk';

  return { status, expectedByNow, remaining, hoursLeft, neededPerHour, walkMinutes };
}
