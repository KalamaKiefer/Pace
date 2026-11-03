import { computeTrend } from '@/engine/trend';

import { createCardioRepo } from '../repos/cardio';
import { createFoodLogsRepo } from '../repos/foodLogs';
import { createMeasurementsRepo } from '../repos/measurements';
import { createStreaksRepo } from '../repos/streaks';
import { createTargetsRepo } from '../repos/targets';
import { createWeighInsRepo } from '../repos/weighIns';
import { createWorkoutsRepo, type SetInput } from '../repos/workouts';
import { createTestDb } from '../testing/testDb';

const at = (date: string, hour = 8) =>
  Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);

describe('migrations', () => {
  it('create every table', () => {
    const { sqlite } = createTestDb();
    const tables = sqlite
      .prepare(
        `select name from sqlite_master where type = 'table' and name not like '\\_\\_%' escape '\\' and name not like 'sqlite%'`,
      )
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toHaveLength(22);
    expect(tables).toEqual(
      expect.arrayContaining(['weigh_ins', 'measurements', 'cardio_sessions']),
    );
  });
});

describe('weigh-ins', () => {
  const setup = () => {
    const ctx = createTestDb();
    return { ...ctx, repo: createWeighInsRepo(ctx.db, ctx.bus) };
  };
  const save = (
    repo: ReturnType<typeof setup>['repo'],
    localDate: string,
    weightKg: number,
    hour = 8,
  ) => repo.save({ measuredAt: at(localDate, hour), localDate, weightKg });

  it('saves a weigh-in and announces it', () => {
    const { repo, events } = setup();
    const { id } = save(repo, '2026-11-01', 100);
    expect(repo.forDate('2026-11-01')).toMatchObject([{ id, weightKg: 100, source: 'manual' }]);
    expect(events).toEqual([{ type: 'weighin.saved', id, localDate: '2026-11-01' }]);
  });

  it('trends only the first weigh-in of a day', () => {
    const { repo } = setup();
    save(repo, '2026-11-01', 101, 20);
    save(repo, '2026-11-01', 100, 7);
    const rows = repo.forDate('2026-11-01');
    expect(rows.find((r) => r.weightKg === 100)?.isTrended).toBe(true);
    expect(rows.find((r) => r.weightKg === 101)?.isTrended).toBe(false);
    expect(repo.trendSeries()).toEqual([{ localDate: '2026-11-01', trendKg: 100 }]);
  });

  it('keeps the trend cache equal to the engine trend', () => {
    const { repo } = setup();
    save(repo, '2026-11-01', 100);
    save(repo, '2026-11-02', 99);
    save(repo, '2026-11-05', 98);
    expect(repo.trendSeries()).toEqual(
      computeTrend([
        { localDate: '2026-11-01', weightKg: 100 },
        { localDate: '2026-11-02', weightKg: 99 },
        { localDate: '2026-11-05', weightKg: 98 },
      ]),
    );
  });

  it('corrects the trend when an old weigh-in is deleted', () => {
    const { repo, events } = setup();
    save(repo, '2026-11-01', 100);
    const wrong = save(repo, '2026-11-02', 50);
    save(repo, '2026-11-03', 99);
    repo.softDelete(wrong.id);
    expect(repo.trendSeries()).toEqual(
      computeTrend([
        { localDate: '2026-11-01', weightKg: 100 },
        { localDate: '2026-11-03', weightKg: 99 },
      ]),
    );
    expect(events.at(-1)).toEqual({
      type: 'weighin.deleted',
      id: wrong.id,
      localDate: '2026-11-02',
    });
  });

  it('promotes the next weigh-in when the trended one is deleted', () => {
    const { repo } = setup();
    const first = save(repo, '2026-11-01', 100, 7);
    save(repo, '2026-11-01', 101, 20);
    repo.softDelete(first.id);
    expect(repo.trendSeries()).toEqual([{ localDate: '2026-11-01', trendKg: 101 }]);
  });

  it('keeps a deleted row for sync but hides it', () => {
    const { repo, sqlite } = setup();
    const { id } = save(repo, '2026-11-01', 100);
    repo.softDelete(id);
    expect(repo.forDate('2026-11-01')).toEqual([]);
    const row = sqlite.prepare('select deleted_at from weigh_ins where id = ?').get(id) as {
      deleted_at: number | null;
    };
    expect(row.deleted_at).not.toBeNull();
  });

  it('saves measurements together with a weigh-in, linked to it', () => {
    const ctx = setup();
    const { id } = ctx.repo.save({
      measuredAt: at('2026-11-01'),
      localDate: '2026-11-01',
      weightKg: 100,
      measurements: [
        { kind: 'waist', value: 90 },
        { kind: 'body_fat_pct', value: 22 },
      ],
    });
    const rows = createMeasurementsRepo(ctx.db, ctx.bus).forDate('2026-11-01');
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.weighInId === id)).toBe(true);
    expect(ctx.events.map((e) => e.type)).toEqual(['weighin.saved', 'measurement.saved']);
  });

  it('saves nothing when a linked measurement fails', () => {
    const { repo } = setup();
    expect(() =>
      repo.save({
        measuredAt: at('2026-11-01'),
        localDate: '2026-11-01',
        weightKg: 100,
        measurements: [{ kind: 'waist', value: null as unknown as number }],
      }),
    ).toThrow();
    expect(repo.forDate('2026-11-01')).toEqual([]);
  });

  it('announces nothing when the save fails', () => {
    const { repo, events } = setup();
    expect(() =>
      repo.save({
        measuredAt: at('2026-11-01'),
        localDate: '2026-11-01',
        weightKg: null as unknown as number,
      }),
    ).toThrow();
    expect(events).toEqual([]);
  });
});

describe('measurements', () => {
  const setup = () => {
    const ctx = createTestDb();
    return { ...ctx, repo: createMeasurementsRepo(ctx.db, ctx.bus) };
  };

  it('saves without a weigh-in', () => {
    const { repo, events } = setup();
    repo.save({
      measuredAt: at('2026-11-01'),
      localDate: '2026-11-01',
      entries: [{ kind: 'waist', value: 90 }],
    });
    expect(repo.forDate('2026-11-01')).toMatchObject([
      { kind: 'waist', value: 90, weighInId: null },
    ]);
    expect(events.map((e) => e.type)).toEqual(['measurement.saved']);
  });

  it('returns one measurement’s history in date order', () => {
    const { repo } = setup();
    repo.save({
      measuredAt: at('2026-11-05'),
      localDate: '2026-11-05',
      entries: [{ kind: 'waist', value: 89 }],
    });
    repo.save({
      measuredAt: at('2026-11-01'),
      localDate: '2026-11-01',
      entries: [
        { kind: 'waist', value: 90 },
        { kind: 'hips', value: 100 },
      ],
    });
    expect(repo.history('waist').map((r) => r.value)).toEqual([90, 89]);
  });

  it('hides deleted rows', () => {
    const { repo } = setup();
    const [id] = repo.save({
      measuredAt: at('2026-11-01'),
      localDate: '2026-11-01',
      entries: [{ kind: 'waist', value: 90 }],
    });
    repo.softDelete(id);
    expect(repo.history('waist')).toEqual([]);
  });
});

describe('food logs', () => {
  const setup = () => {
    const ctx = createTestDb();
    return { ...ctx, repo: createFoodLogsRepo(ctx.db, ctx.bus) };
  };
  const entry = {
    localDate: '2026-11-01',
    loggedAt: at('2026-11-01'),
    mealSlot: 'breakfast',
    foodRef: 'usda:1',
    nameSnapshot: 'Greek yogurt',
    servingLabel: '1 cup',
    servingGrams: 245,
    quantity: 1,
    kcal: 230,
    proteinG: 23,
    carbsG: 9,
    fatG: 11,
  };

  it('totals a day without deleted rows', () => {
    const { repo } = setup();
    repo.add(entry);
    const second = repo.add({ ...entry, kcal: 85, proteinG: 1, carbsG: 21, fatG: 0 });
    repo.add({ ...entry, kcal: 1000, localDate: '2026-11-02' });
    expect(repo.totals('2026-11-01')).toEqual({ kcal: 315, proteinG: 24, carbsG: 30, fatG: 11 });
    repo.softDelete(second.id);
    expect(repo.totals('2026-11-01').kcal).toBe(230);
  });

  it('totals an empty day as zero', () => {
    expect(setup().repo.totals('2026-11-01')).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it('announces a logged food', () => {
    const { repo, events } = setup();
    const { id } = repo.add(entry);
    expect(events).toEqual([{ type: 'food.logged', id, localDate: '2026-11-01' }]);
  });

  it('marks a day complete and can undo it', () => {
    const { repo, events } = setup();
    expect(repo.isDayComplete('2026-11-01')).toBe(false);
    repo.setDayComplete('2026-11-01', true);
    expect(repo.isDayComplete('2026-11-01')).toBe(true);
    expect(events).toEqual([{ type: 'day.completed', localDate: '2026-11-01' }]);
    repo.setDayComplete('2026-11-01', false);
    expect(repo.isDayComplete('2026-11-01')).toBe(false);
    expect(events).toHaveLength(1);
  });
});

describe('workouts', () => {
  const setup = () => {
    const ctx = createTestDb();
    return {
      ...ctx,
      repo: createWorkoutsRepo(ctx.db, ctx.bus),
      cardio: createCardioRepo(ctx.db, ctx.bus),
    };
  };
  const workout = (localDate: string, sets: SetInput[]) => ({
    name: 'Push A',
    startedAt: at(localDate, 8),
    endedAt: at(localDate, 9),
    localDate,
    exercises: [{ exerciseId: 'bench', sets }],
  });
  const done = { setType: 'working', weightKg: 100, reps: 5, completedAt: 1 } as const;

  it('stores the session with duration and volume from completed sets', () => {
    const { repo, events } = setup();
    const { id } = repo.saveFinished(
      workout('2026-11-02', [done, done, { setType: 'working', weightKg: 100, reps: 5 }]),
    );
    expect(repo.get(id)).toMatchObject({ durationS: 3600, totalVolumeKg: 1000, counted: true });
    expect(repo.setsFor(id)).toHaveLength(3);
    expect(events).toEqual([{ type: 'workout.finished', id, localDate: '2026-11-02' }]);
  });

  it('leaves warm-ups out of volume', () => {
    const { repo } = setup();
    const { id } = repo.saveFinished(workout('2026-11-02', [done, { ...done, setType: 'warmup' }]));
    expect(repo.get(id)?.totalVolumeKg).toBe(500);
  });

  it('does not count a workout with no completed sets', () => {
    const { repo } = setup();
    const { id } = repo.saveFinished(workout('2026-11-02', [{ setType: 'working', reps: 5 }]));
    expect(repo.get(id)?.counted).toBe(false);
  });

  it('counts timed sets only from 10 minutes', () => {
    const { repo } = setup();
    const short = repo.saveFinished(
      workout('2026-11-02', [{ setType: 'working', durationS: 599, completedAt: 1 }]),
    );
    const long = repo.saveFinished(
      workout('2026-11-03', [{ setType: 'working', durationS: 600, completedAt: 1 }]),
    );
    expect(repo.get(short.id)?.counted).toBe(false);
    expect(repo.get(long.id)?.counted).toBe(true);
  });

  it('counts one workout per day, across lifting and cardio', () => {
    const { repo, cardio } = setup();
    repo.saveFinished(workout('2026-11-02', [done]));
    repo.saveFinished(workout('2026-11-02', [done]));
    repo.saveFinished(workout('2026-11-04', [done]));
    cardio.save({
      localDate: '2026-11-04',
      startedAt: at('2026-11-04'),
      durationS: 1800,
      activity: 'cycle',
      intensity: 'moderate',
      weightKg: 100,
    });
    cardio.save({
      localDate: '2026-11-05',
      startedAt: at('2026-11-05'),
      durationS: 1800,
      activity: 'cycle',
      intensity: 'moderate',
      weightKg: 100,
    });
    cardio.save({
      localDate: '2026-11-06',
      startedAt: at('2026-11-06'),
      durationS: 300,
      activity: 'cycle',
      intensity: 'moderate',
      weightKg: 100,
    });
    expect(repo.countedDays('2026-11-02', '2026-11-08')).toBe(3);
    expect(repo.countedDays('2026-11-03', '2026-11-04')).toBe(1);
  });

  it('stops counting a deleted workout', () => {
    const { repo } = setup();
    const { id } = repo.saveFinished(workout('2026-11-02', [done]));
    repo.softDelete(id);
    expect(repo.countedDays('2026-11-02', '2026-11-08')).toBe(0);
    expect(repo.get(id)).toBeUndefined();
  });
});

describe('cardio and effective targets', () => {
  const setup = () => {
    const ctx = createTestDb();
    return {
      ...ctx,
      cardio: createCardioRepo(ctx.db, ctx.bus),
      targets: createTargetsRepo(ctx.db),
    };
  };
  const target = {
    localDate: '2026-11-01',
    planId: 'plan',
    kcal: 1800,
    proteinG: 148,
    carbsG: 176,
    fatG: 56,
    fiberG: 25,
    stepGoal: 7000,
    bmr: 2000,
    tdeeBase: 2399,
    stepKcal: 154,
    kcalPerStep: 0.0385,
    deficit: 750,
    tdeeSource: 'formula',
  } as const;
  const cycle = {
    localDate: '2026-11-01',
    startedAt: at('2026-11-01'),
    durationS: 1800,
    activity: 'cycle',
    intensity: 'moderate',
    weightKg: 104.326,
  } as const;

  it('raises the day’s target and carbs by the session’s credit', () => {
    const { cardio, targets, events } = setup();
    targets.upsert(target);
    const { id } = cardio.save(cycle);
    expect(targets.effective('2026-11-01')).toMatchObject({
      baseKcal: 1800,
      kcal: 2110,
      carbsG: 176 + 78,
      proteinG: 148,
      fatG: 56,
    });
    expect(events).toEqual([{ type: 'cardio.saved', id, localDate: '2026-11-01' }]);
  });

  it('subtracts step energy for on-foot sessions', () => {
    const { cardio, targets } = setup();
    targets.upsert(target);
    cardio.save({ ...cycle, activity: 'run', onFootSteps: 4500, kcalPerStep: 0.03849 });
    expect(targets.effective('2026-11-01')?.kcal).toBe(2090);
  });

  it('estimates on-foot steps when Health has none', () => {
    const { cardio } = setup();
    const { id } = cardio.save({ ...cycle, activity: 'walk', kcalPerStep: 0.03849 });
    expect(cardio.get(id)?.onFootSteps).toBe(3000);
  });

  it('uses an edited kcal value instead of the estimate', () => {
    const { cardio, targets } = setup();
    targets.upsert(target);
    const { id } = cardio.save({ ...cycle, kcalOverride: 200 });
    expect(cardio.get(id)).toMatchObject({ creditKcal: 200, kcalEdited: true });
    expect(targets.effective('2026-11-01')?.kcal).toBe(2000);
  });

  it('drops the target again when the session is deleted', () => {
    const { cardio, targets, events } = setup();
    targets.upsert(target);
    const { id } = cardio.save(cycle);
    cardio.softDelete(id);
    expect(targets.effective('2026-11-01')?.kcal).toBe(1800);
    expect(events.at(-1)).toEqual({ type: 'cardio.deleted', id, localDate: '2026-11-01' });
  });

  it('counts a session from 10 minutes', () => {
    const { cardio } = setup();
    expect(cardio.get(cardio.save({ ...cycle, durationS: 599 }).id)?.counted).toBe(false);
    expect(cardio.get(cardio.save({ ...cycle, durationS: 600 }).id)?.counted).toBe(true);
  });

  it('caps the credit at 1,000 kcal a day', () => {
    const { cardio, targets } = setup();
    targets.upsert(target);
    cardio.save({ ...cycle, kcalOverride: 800 });
    cardio.save({ ...cycle, kcalOverride: 800 });
    expect(targets.effective('2026-11-01')).toMatchObject({ kcal: 2800, cardioCreditKcal: 1000 });
  });

  it('replaces the day’s snapshot on upsert', () => {
    const { targets } = setup();
    targets.upsert(target);
    targets.upsert({ ...target, kcal: 1780 });
    expect(targets.forDate('2026-11-01')?.kcal).toBe(1780);
  });

  it('returns nothing for a day with no target', () => {
    expect(setup().targets.effective('2026-11-01')).toBeUndefined();
  });
});

describe('streaks', () => {
  it('stores and updates a streak', () => {
    const { db } = createTestDb();
    const repo = createStreaksRepo(db);
    expect(repo.get('protein')).toBeUndefined();
    repo.upsert({ type: 'protein', current: 3, longest: 3, lastQualifiedOn: '2026-11-01' });
    repo.upsert({ type: 'protein', current: 4, longest: 4, lastQualifiedOn: '2026-11-02' });
    expect(repo.get('protein')).toMatchObject({ current: 4, longest: 4 });
    expect(repo.all()).toHaveLength(1);
  });
});
