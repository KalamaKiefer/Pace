import * as fc from 'fast-check';

import { nextTdeeEstimate } from '../adaptiveTdee';
import {
  cardioCredit,
  effectiveTarget,
  estimateOnFootSteps,
  extraStepBurn,
  macrosWithCredit,
} from '../cardio';
import { addDays, ageOn, daysBetween } from '../dates';
import { computeMacros } from '../macros';
import { computePace, type PaceInput } from '../pace';
import { computeStepPace } from '../stepPace';
import { computePlan, validateGoalWeight } from '../targets';
import { computeTrend, trendRateKgPerWeek } from '../trend';
import { cmToIn, inToCm, kgToLb, lbToKg } from '../units';

const base = {
  sex: 'male',
  age: 32,
  heightCm: 177.8,
  weightKg: lbToKg(230),
  goalWeightKg: lbToKg(185),
  mode: 'lose',
  rateKgPerWeek: lbToKg(1),
  baselineSteps: 4500,
} as const;

describe('units', () => {
  it('round-trips weight and length', () => {
    fc.assert(
      fc.property(fc.double({ min: 1, max: 500, noNaN: true }), (v) => {
        expect(lbToKg(kgToLb(v))).toBeCloseTo(v, 8);
        expect(inToCm(cmToIn(v))).toBeCloseTo(v, 8);
      }),
    );
  });
});

describe('dates', () => {
  it('counts days across a daylight-saving change', () => {
    expect(daysBetween('2026-11-01', '2026-11-02')).toBe(1);
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
  });

  it('turns a year older on the birthday, not before', () => {
    expect(ageOn('1990-06-15', '2026-06-14')).toBe(35);
    expect(ageOn('1990-06-15', '2026-06-15')).toBe(36);
  });
});

describe('computePlan guardrails', () => {
  it('clamps the rate to 1% of body weight per week', () => {
    const plan = computePlan({ ...base, weightKg: lbToKg(150), rateKgPerWeek: lbToKg(2) });
    expect(kgToLb(plan.rateKgPerWeek)).toBeCloseTo(1.5, 5);
    expect(plan.rateClamped).toBe(true);
  });

  it('never sets a target below the floor', () => {
    const plan = computePlan({
      ...base,
      sex: 'female',
      age: 60,
      heightCm: 150,
      weightKg: lbToKg(125),
      goalWeightKg: lbToKg(110),
      rateKgPerWeek: lbToKg(1.25),
    });
    expect(plan.kcal).toBe(1200);
    expect(plan.floorApplied).toBe(true);
  });

  it('offers the fastest safe rate when max steps cannot reach the floor', () => {
    const plan = computePlan({
      ...base,
      sex: 'female',
      age: 60,
      heightCm: 150,
      weightKg: lbToKg(125),
      goalWeightKg: lbToKg(110),
      rateKgPerWeek: lbToKg(1.25),
    });
    expect(plan.stepGoal).toBe(12500);
    expect(plan.infeasible).toBe(true);
    expect(plan.fastestSafeRateKgPerWeek).toBeGreaterThan(0);
    expect(plan.fastestSafeRateKgPerWeek!).toBeLessThan(lbToKg(1.25));
  });

  it('keeps a step goal override instead of raising it', () => {
    const plan = computePlan({ ...base, stepGoalOverride: 8000 });
    expect(plan.stepGoal).toBe(8000);
    expect(plan.stepGoalRaised).toBe(false);
  });

  it('adds a surplus in gain mode', () => {
    const plan = computePlan({ ...base, mode: 'gain', rateKgPerWeek: lbToKg(0.5) });
    expect(plan.deficit).toBeCloseTo(-250, 5);
    expect(plan.kcal).toBeGreaterThan(plan.tdeeBase);
  });

  it('removes the deficit in tracking-only mode', () => {
    const plan = computePlan({ ...base, trackingOnly: true });
    expect(plan.deficit).toBe(0);
  });

  it('uses a measured TDEE when given one', () => {
    expect(computePlan({ ...base, tdeeBaseOverride: 2600 }).tdeeBase).toBe(2600);
  });

  it('holds across inputs: at or above the floor, and within the rate limit', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('male' as const, 'female' as const),
        fc.integer({ min: 18, max: 90 }),
        fc.double({ min: 140, max: 210, noNaN: true }),
        fc.double({ min: 45, max: 220, noNaN: true }),
        fc.double({ min: 0.1, max: 1, noNaN: true }),
        fc.integer({ min: 0, max: 20000 }),
        (sex, age, heightCm, weightKg, rateKgPerWeek, baselineSteps) => {
          const plan = computePlan({
            sex,
            age,
            heightCm,
            weightKg,
            goalWeightKg: weightKg * 0.8,
            mode: 'lose',
            rateKgPerWeek,
            baselineSteps,
          });
          expect(plan.kcal).toBeGreaterThanOrEqual(sex === 'male' ? 1500 : 1200);
          expect(plan.rateKgPerWeek).toBeLessThanOrEqual(weightKg * 0.01 + 1e-9);
          expect(plan.stepGoal).toBeGreaterThanOrEqual(7000);
          expect(plan.stepGoal).toBeLessThanOrEqual(12500);
          expect(plan.kcal % 10).toBe(0);
        },
      ),
    );
  });
});

describe('validateGoalWeight', () => {
  it('blocks a goal below BMI 18.5', () => {
    expect(validateGoalWeight({ goalWeightKg: 50, heightCm: 177.8 })).toEqual({
      ok: false,
      minGoalWeightKg: expect.closeTo(58.48, 1),
    });
    expect(validateGoalWeight({ goalWeightKg: 70, heightCm: 177.8 })).toEqual({ ok: true });
  });
});

describe('computeMacros', () => {
  it('keeps at least 50 g of carbs by lowering fat first', () => {
    const macros = computeMacros({ kcal: 1200, goalWeightKg: lbToKg(200), proteinGPerLbGoal: 1 });
    expect(macros.carbsG).toBeGreaterThanOrEqual(50);
    expect(macros.fatG).toBeLessThan(0.3 * 200);
  });

  it('clamps protein to 0.6–1.0 g per lb', () => {
    const goalWeightKg = lbToKg(100);
    expect(computeMacros({ kcal: 2000, goalWeightKg, proteinGPerLbGoal: 2 }).proteinG).toBe(100);
    expect(computeMacros({ kcal: 2000, goalWeightKg, proteinGPerLbGoal: 0.1 }).proteinG).toBe(60);
  });

  it('recomputes carbs around a macro override', () => {
    const macros = computeMacros({
      kcal: 2000,
      goalWeightKg: lbToKg(150),
      override: { proteinG: 200, fatG: 50 },
    });
    expect(macros).toMatchObject({ proteinG: 200, fatG: 50, carbsG: 188 });
  });

  it('sets fiber from calories', () => {
    expect(computeMacros({ kcal: 2000, goalWeightKg: lbToKg(150) }).fiberG).toBe(28);
  });
});

describe('computeTrend', () => {
  it('starts at the first weigh-in', () => {
    expect(computeTrend([{ localDate: '2026-01-01', weightKg: 100 }])[0].trendKg).toBe(100);
  });

  it('applies more weight after a longer gap', () => {
    const daily = computeTrend([
      { localDate: '2026-01-01', weightKg: 100 },
      { localDate: '2026-01-02', weightKg: 90 },
    ]);
    const gap = computeTrend([
      { localDate: '2026-01-01', weightKg: 100 },
      { localDate: '2026-01-11', weightKg: 90 },
    ]);
    expect(daily[1].trendKg).toBeCloseTo(99, 8);
    expect(gap[1].trendKg).toBeCloseTo(100 - 10 * (1 - 0.9 ** 10), 8);
  });

  it('sorts input by date', () => {
    const trend = computeTrend([
      { localDate: '2026-01-02', weightKg: 90 },
      { localDate: '2026-01-01', weightKg: 100 },
    ]);
    expect(trend[0].localDate).toBe('2026-01-01');
  });

  it('always stays between the lowest and highest weigh-in', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            gap: fc.integer({ min: 1, max: 30 }),
            weightKg: fc.double({ min: 40, max: 250, noNaN: true }),
          }),
          { minLength: 1, maxLength: 60 },
        ),
        (rows) => {
          let date = '2026-01-01';
          const weighIns = rows.map(({ gap, weightKg }) => {
            date = addDays(date, gap);
            return { localDate: date, weightKg };
          });
          const weights = weighIns.map((w) => w.weightKg);
          for (const { trendKg } of computeTrend(weighIns)) {
            expect(trendKg).toBeGreaterThanOrEqual(Math.min(...weights) - 1e-9);
            expect(trendKg).toBeLessThanOrEqual(Math.max(...weights) + 1e-9);
          }
        },
      ),
    );
  });
});

describe('trendRateKgPerWeek', () => {
  it('measures a steady loss', () => {
    const points = Array.from({ length: 21 }, (_, i) => ({
      localDate: addDays('2026-01-01', i),
      trendKg: 100 - (0.5 / 7) * i,
    }));
    expect(trendRateKgPerWeek(points)).toBeCloseTo(-0.5, 8);
  });

  it('ignores points older than 21 days', () => {
    const points = [
      { localDate: '2026-01-01', trendKg: 200 },
      { localDate: '2026-03-01', trendKg: 100 },
      { localDate: '2026-03-08', trendKg: 99 },
    ];
    expect(trendRateKgPerWeek(points)).toBeCloseTo(-1, 8);
  });

  it('returns null with fewer than two points', () => {
    expect(trendRateKgPerWeek([{ localDate: '2026-01-01', trendKg: 100 }])).toBeNull();
  });
});

describe('computePace', () => {
  const rateKgPerWeek = lbToKg(1);
  const startDate = '2026-01-01';
  const plan: PaceInput['plan'] = {
    startDate,
    rateKgPerWeek,
    goalWeightKg: lbToKg(180),
    mode: 'lose',
  };
  const series = (days: number, weight: (d: number) => number) =>
    Array.from({ length: days }, (_, d) => ({
      localDate: addDays(startDate, d),
      weightKg: weight(d),
    }));

  it('is on pace when every weigh-in sits on the plan line', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), (days) => {
        const weighIns = series(days, (d) => lbToKg(220) - (rateKgPerWeek / 7) * d);
        const pace = computePace({ weighIns, plan, today: addDays(startDate, days - 1) });
        expect(pace.status).toBe('on_pace');
        expect(Math.abs(pace.deltaKg)).toBeLessThan(1e-9);
      }),
    );
  });

  it('is behind when the weight stays flat', () => {
    const weighIns = series(60, () => lbToKg(220));
    expect(computePace({ weighIns, plan, today: addDays(startDate, 59) }).status).toBe('behind');
  });

  it('does not flip to behind for one water spike', () => {
    const weighIns = series(30, (d) =>
      d === 29
        ? lbToKg(220) - (rateKgPerWeek / 7) * d + lbToKg(3)
        : lbToKg(220) - (rateKgPerWeek / 7) * d,
    );
    expect(computePace({ weighIns, plan, today: addDays(startDate, 29) }).status).toBe('on_pace');
  });

  it('pauses after 7 days with no weigh-in', () => {
    const weighIns = series(20, () => lbToKg(220));
    expect(computePace({ weighIns, plan, today: addDays(startDate, 25) }).status).toBe('behind');
    expect(computePace({ weighIns, plan, today: addDays(startDate, 26) }).status).toBe('paused');
  });

  it('projects a goal date from the current rate', () => {
    const weighIns = series(30, (d) => lbToKg(190) - (rateKgPerWeek / 7) * d);
    const pace = computePace({ weighIns, plan, today: addDays(startDate, 29) });
    expect(pace.projectedGoalDate).not.toBeNull();
    expect(daysBetween(addDays(startDate, 29), pace.projectedGoalDate!)).toBeGreaterThan(0);
  });

  it('gives no date while the trend is not going down', () => {
    const weighIns = series(30, (d) => lbToKg(220) + 0.05 * d);
    const pace = computePace({ weighIns, plan, today: addDays(startDate, 29) });
    expect(pace.projectedGoalDate).toBeNull();
  });

  it('caps a projection beyond two years', () => {
    const weighIns = series(30, (d) => lbToKg(300) - 0.001 * d);
    const pace = computePace({ weighIns, plan, today: addDays(startDate, 29) });
    expect(pace.projectedGoalDate).toBeNull();
    expect(pace.projectionCapped).toBe(true);
  });

  it('flips direction in gain mode', () => {
    const gainPlan = { ...plan, mode: 'gain' as const, goalWeightKg: lbToKg(240) };
    const weighIns = series(60, (d) => lbToKg(200) + (2 * rateKgPerWeek * d) / 7);
    expect(computePace({ weighIns, plan: gainPlan, today: addDays(startDate, 59) }).status).toBe(
      'ahead',
    );
  });

  it('uses a ±2 lb band in maintenance mode', () => {
    const maintain = {
      ...plan,
      mode: 'maintain' as const,
      rateKgPerWeek: 0,
      goalWeightKg: lbToKg(180),
    };
    const near = series(5, () => lbToKg(181));
    const far = series(5, () => lbToKg(185));
    expect(
      computePace({ weighIns: near, plan: maintain, today: addDays(startDate, 4) }).status,
    ).toBe('on_pace');
    expect(
      computePace({ weighIns: far, plan: maintain, today: addDays(startDate, 4) }).status,
    ).toBe('behind');
  });

  it('throws without weigh-ins', () => {
    expect(() => computePace({ weighIns: [], plan, today: startDate })).toThrow();
  });
});

describe('computeStepPace', () => {
  const window: [number, number] = [7 * 60, 21 * 60];

  it('is on track when at the expected count', () => {
    const pace = computeStepPace({
      steps: 5000,
      goal: 10000,
      nowMinutes: 14 * 60,
      activeWindow: window,
    });
    expect(pace.expectedByNow).toBeCloseTo(5000, 5);
    expect(pace.status).toBe('on_track');
  });

  it('is slightly behind when the needed rate is reachable', () => {
    const pace = computeStepPace({
      steps: 4000,
      goal: 10000,
      nowMinutes: 14 * 60,
      activeWindow: window,
      typicalHourlyRate: 800,
    });
    expect(pace.neededPerHour).toBeCloseTo(6000 / 7, 5);
    expect(pace.status).toBe('slightly_behind');
  });

  it('is done at the goal', () => {
    const pace = computeStepPace({
      steps: 10500,
      goal: 10000,
      nowMinutes: 12 * 60,
      activeWindow: window,
    });
    expect(pace.status).toBe('done');
    expect(pace.remaining).toBe(0);
  });

  it('is at risk after the active window with steps left', () => {
    const pace = computeStepPace({
      steps: 9000,
      goal: 10000,
      nowMinutes: 22 * 60,
      activeWindow: window,
    });
    expect(pace.hoursLeft).toBe(0);
    expect(pace.status).toBe('at_risk');
  });

  it('expects no steps before the window starts', () => {
    const pace = computeStepPace({
      steps: 0,
      goal: 10000,
      nowMinutes: 5 * 60,
      activeWindow: window,
    });
    expect(pace.expectedByNow).toBe(0);
    expect(pace.status).toBe('on_track');
  });

  it('follows the hourly pattern when given one', () => {
    const hourlyShare = Array<number>(24).fill(0);
    hourlyShare[8] = 0.5;
    hourlyShare[18] = 0.5;
    const pace = computeStepPace({
      steps: 0,
      goal: 10000,
      nowMinutes: 12 * 60,
      activeWindow: window,
      hourlyShare,
    });
    expect(pace.expectedByNow).toBeCloseTo(5000, 5);
  });

  it('counts part of the current hour', () => {
    const hourlyShare = Array<number>(24).fill(0);
    hourlyShare[12] = 1;
    const pace = computeStepPace({
      steps: 0,
      goal: 10000,
      nowMinutes: 12 * 60 + 30,
      activeWindow: window,
      hourlyShare,
    });
    expect(pace.expectedByNow).toBeCloseTo(5000, 5);
  });
});

describe('cardio', () => {
  it('counts only burn above resting', () => {
    const credit = cardioCredit({ met: 1, weightKg: 100, durationS: 3600 });
    expect(credit.netKcal).toBe(0);
  });

  it('never gives a negative credit', () => {
    const credit = cardioCredit({
      met: 3,
      weightKg: 70,
      durationS: 600,
      onFootSteps: 100000,
      kcalPerStep: 0.03,
    });
    expect(credit.creditKcal).toBe(0);
  });

  it('caps the day at 1,000 kcal', () => {
    expect(effectiveTarget(1800, [900, 900])).toBe(2800);
  });

  it('leaves the target alone with no cardio', () => {
    expect(effectiveTarget(1800, [])).toBe(1800);
  });

  it('puts the credit into carbs', () => {
    const macros = { proteinG: 148, fatG: 56, carbsG: 176, fiberG: 25 };
    expect(macrosWithCredit(macros, 400)).toEqual({ ...macros, carbsG: 276 });
  });

  it('reports no surplus at or under the goal', () => {
    expect(extraStepBurn({ steps: 7000, stepGoal: 7000, kcalPerStep: 0.04 })).toEqual({
      surplusSteps: 0,
      extraKcal: 0,
    });
  });

  it('estimates steps for on-foot activities only', () => {
    expect(estimateOnFootSteps('walk', 600)).toBe(1000);
    expect(estimateOnFootSteps('cycle', 600)).toBe(0);
  });
});

describe('nextTdeeEstimate', () => {
  it('smooths toward the observed value', () => {
    expect(nextTdeeEstimate(2500, 2550)).toBeCloseTo(2510, 8);
  });

  it('limits the change to 100 kcal per week', () => {
    expect(nextTdeeEstimate(2500, 4000)).toBe(2600);
    expect(nextTdeeEstimate(2500, 1000)).toBe(2400);
  });
});
