import { computeBmr, sedentaryTdee } from './bmr';
import {
  CALORIE_FLOOR,
  KCAL_PER_LB,
  MAX_LOSS_PCT_PER_WEEK,
  MIN_GOAL_BMI,
  STANDARD_LOSS_RATES_LB,
  STEP_GOAL_MAX,
  STEP_GOAL_STEP,
} from './constants';
import { computeMacros, type MacroOverride } from './macros';
import { defaultStepGoal, kcalPerStep, stepKcal } from './stepGoal';
import type { GoalMode, Macros, Sex } from './types';
import { kgToLb, lbToKg } from './units';

export type PlanInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  mode: GoalMode;
  rateKgPerWeek: number;
  baselineSteps: number;
  stepGoalOverride?: number;
  proteinGPerLbGoal?: number;
  macroOverride?: MacroOverride;
  tdeeBaseOverride?: number;
  trackingOnly?: boolean;
};

export type PlanRecommendation = {
  rateKgPerWeek: number;
  stepGoal: number;
  kcal: number;
  macros: Macros;
  weeksToGoal: number;
};

export type PlanResult = {
  bmr: number;
  tdeeBase: number;
  rateKgPerWeek: number;
  rateClamped: boolean;
  deficit: number; // Negative in gain mode.
  stepGoal: number;
  stepGoalRaised: boolean;
  kcalPerStep: number;
  stepKcal: number;
  kcal: number;
  floorApplied: boolean;
  infeasible: boolean;
  fastestSafeRateKgPerWeek?: number;
  recommendation?: PlanRecommendation;
  macros: Macros;
  weeksToGoal: number | null;
};

const round10 = (kcal: number) => Math.round(kcal / 10) * 10;
const kcalPerDay = (rateKgPerWeek: number) => (kgToLb(rateKgPerWeek) * KCAL_PER_LB) / 7;
const weeksBetween = (fromKg: number, toKg: number, rateKgPerWeek: number) =>
  rateKgPerWeek > 0 ? Math.abs(fromKg - toKg) / rateKgPerWeek : null;

export function computePlan(input: PlanInput): PlanResult {
  const { sex, age, heightCm, weightKg, goalWeightKg, baselineSteps, stepGoalOverride } = input;
  const mode = input.trackingOnly ? 'maintain' : input.mode;
  const floor = CALORIE_FLOOR[sex];
  const perStep = kcalPerStep(sex, weightKg, heightCm);
  const bmr = computeBmr(sex, weightKg, heightCm, age);
  const tdeeBase = input.tdeeBaseOverride ?? sedentaryTdee(bmr);

  const maxRate = weightKg * MAX_LOSS_PCT_PER_WEEK;
  const requestedRate = mode === 'maintain' ? 0 : input.rateKgPerWeek;
  const rateClamped = mode === 'lose' && requestedRate > maxRate;
  const rateKgPerWeek = rateClamped ? maxRate : requestedRate;
  const deficit = mode === 'gain' ? -kcalPerDay(rateKgPerWeek) : kcalPerDay(rateKgPerWeek);

  const targetAt = (steps: number, dailyDeficit: number) =>
    tdeeBase + stepKcal(steps, perStep) - dailyDeficit;
  const macrosFor = (kcal: number) =>
    computeMacros({
      kcal,
      goalWeightKg,
      proteinGPerLbGoal: input.proteinGPerLbGoal,
      override: input.macroOverride,
    });

  const startingStepGoal = stepGoalOverride ?? defaultStepGoal(baselineSteps);
  let stepGoal = startingStepGoal;
  if (stepGoalOverride === undefined) {
    while (targetAt(stepGoal, deficit) < floor && stepGoal < STEP_GOAL_MAX) {
      stepGoal += STEP_GOAL_STEP;
    }
  }
  const stepGoalRaised = stepGoal !== startingStepGoal;

  const unclamped = targetAt(stepGoal, deficit);
  const floorApplied = unclamped < floor;
  const infeasible = floorApplied && stepGoalOverride === undefined;
  const kcal = Math.max(floor, round10(unclamped));

  const fastestSafeRateKgPerWeek = infeasible
    ? lbToKg(((targetAt(STEP_GOAL_MAX, 0) - floor) * 7) / KCAL_PER_LB)
    : undefined;

  let recommendation: PlanRecommendation | undefined;
  if (mode === 'lose' && (stepGoalRaised || infeasible)) {
    const defaultGoal = defaultStepGoal(baselineSteps);
    const rateLb = STANDARD_LOSS_RATES_LB.find(
      (lb) => lbToKg(lb) < rateKgPerWeek && targetAt(defaultGoal, kcalPerDay(lbToKg(lb))) >= floor,
    );
    if (rateLb !== undefined) {
      const rate = lbToKg(rateLb);
      const recommendedKcal = round10(targetAt(defaultGoal, kcalPerDay(rate)));
      recommendation = {
        rateKgPerWeek: rate,
        stepGoal: defaultGoal,
        kcal: recommendedKcal,
        macros: macrosFor(recommendedKcal),
        weeksToGoal: Math.abs(weightKg - goalWeightKg) / rate,
      };
    }
  }

  return {
    bmr,
    tdeeBase,
    rateKgPerWeek,
    rateClamped,
    deficit,
    stepGoal,
    stepGoalRaised,
    kcalPerStep: perStep,
    stepKcal: stepKcal(stepGoal, perStep),
    kcal,
    floorApplied,
    infeasible,
    fastestSafeRateKgPerWeek,
    recommendation,
    macros: macrosFor(kcal),
    weeksToGoal: weeksBetween(weightKg, goalWeightKg, rateKgPerWeek),
  };
}

export function validateGoalWeight({
  goalWeightKg,
  heightCm,
}: {
  goalWeightKg: number;
  heightCm: number;
}): { ok: true } | { ok: false; minGoalWeightKg: number } {
  const minGoalWeightKg = MIN_GOAL_BMI * (heightCm / 100) ** 2;
  return goalWeightKg >= minGoalWeightKg ? { ok: true } : { ok: false, minGoalWeightKg };
}
