// Worked examples A–H from PLAN.md 4.8.
import { observedTdee } from '../adaptiveTdee';
import { cardioCredit, effectiveTarget, extraStepBurn, metFor } from '../cardio';
import { computePace } from '../pace';
import { computeStepPace } from '../stepPace';
import { computePlan } from '../targets';
import { addDays } from '../dates';
import { computeTrend } from '../trend';
import { ftInToCm, kgToLb, lbToKg } from '../units';

const marcus = {
  sex: 'male',
  age: 32,
  heightCm: ftInToCm(5, 10),
  weightKg: lbToKg(230),
  goalWeightKg: lbToKg(185),
  mode: 'lose',
  rateKgPerWeek: lbToKg(1.5),
  baselineSteps: 4500,
} as const;

const dana = {
  sex: 'female',
  age: 29,
  heightCm: ftInToCm(5, 4),
  weightKg: lbToKg(165),
  goalWeightKg: lbToKg(140),
  mode: 'lose',
  rateKgPerWeek: lbToKg(1.5),
  baselineSteps: 3800,
} as const;

describe('Example A: Marcus', () => {
  const plan = computePlan(marcus);

  it('computes energy', () => {
    expect(plan.bmr).toBeCloseTo(2000, 0);
    expect(plan.tdeeBase).toBeCloseTo(2399, 0);
    expect(plan.deficit).toBeCloseTo(750, 5);
    expect(plan.kcalPerStep).toBeCloseTo(0.0385, 4);
  });

  it('computes the step goal and calorie target', () => {
    expect(plan.stepGoal).toBe(7000);
    expect(plan.stepKcal).toBeCloseTo(154, 0);
    expect(plan.kcal).toBe(1800);
    expect(plan.floorApplied).toBe(false);
    expect(plan.recommendation).toBeUndefined();
  });

  it('computes macros', () => {
    expect(plan.macros.proteinG).toBe(148);
    expect(plan.macros.fatG).toBe(56);
    expect(plan.macros.carbsG).toBe(176);
  });

  it('projects 30 weeks to goal', () => {
    expect(plan.weeksToGoal).toBeCloseTo(30, 5);
  });
});

describe('Example B: Dana asks for 1.5 lb/week', () => {
  const plan = computePlan(dana);

  it('raises the step goal until the floor is met', () => {
    expect(plan.bmr).toBeCloseTo(1458, 0);
    expect(plan.tdeeBase).toBeCloseTo(1750, 0);
    expect(plan.kcalPerStep).toBeCloseTo(0.0251, 4);
    expect(plan.stepGoal).toBe(11000);
    expect(plan.kcal).toBe(1200);
    expect(plan.stepGoalRaised).toBe(true);
  });

  it('recommends 1 lb/week with the default step goal', () => {
    const rec = plan.recommendation!;
    expect(kgToLb(rec.rateKgPerWeek)).toBeCloseTo(1, 5);
    expect(rec.stepGoal).toBe(7000);
    expect(rec.kcal).toBe(1350);
    expect(rec.macros).toMatchObject({ proteinG: 112, fatG: 42, carbsG: 131 });
    expect(rec.weeksToGoal).toBeCloseTo(25, 5);
  });
});

describe('Example C: pace badge', () => {
  // The plan gives only the endpoints and resulting trend, so this noisy series was chosen to
  // start at 230.0, end at 225.7, and land on the same trend.
  const pounds = [
    230, 230.2, 230, 229.7, 229.2, 228.2, 228.2, 228.3, 227, 227.4, 226.4, 226.9, 225.9, 225.7,
  ];
  const startDate = '2026-10-18';
  const weighIns = pounds.map((lb, i) => ({
    localDate: addDays(startDate, i),
    weightKg: lbToKg(lb),
  }));

  const pace = computePace({
    weighIns,
    plan: {
      startDate,
      rateKgPerWeek: lbToKg(1.5),
      goalWeightKg: lbToKg(185),
      mode: 'lose',
    },
    today: addDays(startDate, 13),
  });

  it('matches the expected trend', () => {
    const last = computeTrend(weighIns).at(-1)!;
    expect(kgToLb(last.trendKg)).toBeCloseTo(228.05, 2);
  });

  it('compares against the lag-matched line', () => {
    expect(kgToLb(pace.expectedKg)).toBeCloseTo(228.65, 1);
    expect(pace.status).toBe('ahead');
    expect(pace.deltaDays).toBeCloseTo(2.8, 0);
    expect(pace.deltaDays).toBeGreaterThan(2.7);
    expect(pace.deltaDays).toBeLessThan(2.9);
  });
});

describe('Example D: steps at risk', () => {
  const pace = computeStepPace({
    steps: 5800,
    goal: 10000,
    nowMinutes: 18 * 60,
    activeWindow: [7 * 60, 21 * 60],
    typicalHourlyRate: 600,
  });

  it('flags the shortfall', () => {
    expect(pace.remaining).toBe(4200);
    expect(pace.neededPerHour).toBeCloseTo(1400, 5);
    expect(pace.walkMinutes).toBe(42);
    expect(pace.status).toBe('at_risk');
  });
});

describe('Example E: adaptive TDEE', () => {
  it('derives burn from intake and trend change', () => {
    const observed = observedTdee({
      meanIntakeKcal: 2050,
      meanCardioCreditKcal: 0,
      trendChangeKg: lbToKg(-2.4),
      days: 14,
    });
    expect(observed).toBeCloseTo(2650, 5);
  });
});

describe('Example F: cycling', () => {
  it('adds the net burn to the target', () => {
    const credit = cardioCredit({
      met: metFor('cycle', 'moderate'),
      weightKg: marcus.weightKg,
      durationS: 30 * 60,
    });
    expect(credit.netKcal).toBeCloseTo(313, 0);
    expect(credit.creditKcal).toBeCloseTo(313, 0);
    expect(effectiveTarget(1800, [credit.creditKcal])).toBe(2110);
  });
});

describe('Example G: running', () => {
  it('subtracts step energy already counted', () => {
    const { kcalPerStep } = computePlan(marcus);
    const credit = cardioCredit({
      met: metFor('run', 'moderate'),
      weightKg: marcus.weightKg,
      durationS: 30 * 60,
      onFootSteps: 4500,
      kcalPerStep,
    });
    expect(credit.netKcal).toBeCloseTo(459, 0);
    expect(credit.creditKcal).toBeCloseTo(286, 0);
    expect(effectiveTarget(1800, [credit.creditKcal])).toBe(2090);
  });
});

describe('Example H: step surplus', () => {
  it('reports extra burn from steps over goal', () => {
    const { kcalPerStep } = computePlan(marcus);
    expect(extraStepBurn({ steps: 10000, stepGoal: 7000, kcalPerStep })).toEqual({
      surplusSteps: 3000,
      extraKcal: 115,
    });
  });
});
