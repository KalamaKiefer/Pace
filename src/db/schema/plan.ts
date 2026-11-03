import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { GoalMode, MeasurementKind, Sex } from '@/engine/types';

import { id, syncColumns } from './columns';

export const profile = sqliteTable('profile', {
  id: id(),
  displayName: text('display_name').notNull(),
  sexFormula: text('sex_formula').$type<Sex>().notNull(),
  birthDate: text('birth_date').notNull(),
  heightCm: real('height_cm').notNull(),
  unitWeight: text('unit_weight').$type<'lb' | 'kg'>().notNull(),
  unitHeight: text('unit_height').$type<'ft_in' | 'cm'>().notNull(),
  weekStart: integer('week_start').notNull(),
  dayEndHour: integer('day_end_hour').notNull(),
  eatingWindow: text('eating_window', { mode: 'json' }).$type<[number, number]>().notNull(),
  activeWindow: text('active_window', { mode: 'json' }).$type<[number, number]>().notNull(),
  trackingOnly: integer('tracking_only', { mode: 'boolean' }).notNull(),
  trackedMeasurements: text('tracked_measurements', { mode: 'json' })
    .$type<MeasurementKind[]>()
    .notNull(),
  ...syncColumns(),
});

export const goalPlans = sqliteTable(
  'goal_plans',
  {
    id: id(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull(),
    startDate: text('start_date').notNull(),
    startWeightKg: real('start_weight_kg').notNull(),
    goalWeightKg: real('goal_weight_kg').notNull(),
    mode: text('mode').$type<GoalMode>().notNull(),
    rateKgPerWeek: real('rate_kg_per_week').notNull(),
    proteinGPerLbGoal: real('protein_g_per_lb_goal').notNull(),
    stepGoalOverride: integer('step_goal_override'),
    macroOverride: text('macro_override', { mode: 'json' }).$type<{
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    }>(),
    adaptiveTdee: integer('adaptive_tdee', { mode: 'boolean' }).notNull(),
    weeklyWorkoutGoal: integer('weekly_workout_goal').notNull(),
    endedAt: integer('ended_at'),
    ...syncColumns(),
  },
  (t) => [index('goal_plans_active_idx').on(t.isActive)],
);

// One snapshot per day, so history stays accurate after a plan changes.
// kcal is the base target. The effective target adds that day's cardio credit and isn't stored.
export const dailyTargets = sqliteTable('daily_targets', {
  localDate: text('local_date').primaryKey(),
  planId: text('plan_id').notNull(),
  kcal: integer('kcal').notNull(),
  proteinG: integer('protein_g').notNull(),
  carbsG: integer('carbs_g').notNull(),
  fatG: integer('fat_g').notNull(),
  fiberG: integer('fiber_g').notNull(),
  stepGoal: integer('step_goal').notNull(),
  bmr: real('bmr').notNull(),
  tdeeBase: real('tdee_base').notNull(),
  stepKcal: real('step_kcal').notNull(),
  kcalPerStep: real('kcal_per_step').notNull(),
  deficit: real('deficit').notNull(),
  tdeeSource: text('tdee_source').$type<'formula' | 'adaptive'>().notNull(),
  ...syncColumns(),
});

export const dayStatus = sqliteTable('day_status', {
  localDate: text('local_date').primaryKey(),
  foodComplete: integer('food_complete', { mode: 'boolean' }).notNull(),
  completedAt: integer('completed_at'),
  ...syncColumns(),
});
