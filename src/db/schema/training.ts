import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { CardioActivity, CardioIntensity } from '@/engine/types';

import { id, loggedInZone, syncColumns } from './columns';

// Parent rows are referenced by plain id rather than foreign keys: sync can deliver a table's
// rows before the rows they point to.

export type SetType = 'warmup' | 'working' | 'drop' | 'failure';
export type MetricType = 'weight_reps' | 'reps' | 'time' | 'distance';
export type PrType = 'weight_at_reps' | 'e1rm' | 'reps_at_weight' | 'session_volume';

export const exercises = sqliteTable(
  'exercises',
  {
    id: id(),
    name: text('name').notNull(),
    primaryMuscle: text('primary_muscle').notNull(),
    secondaryMuscles: text('secondary_muscles', { mode: 'json' }).$type<string[]>().notNull(),
    equipment: text('equipment').notNull(),
    metricType: text('metric_type').$type<MetricType>().notNull(),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull(),
    defaultRestS: integer('default_rest_s').notNull(),
    ...syncColumns(),
  },
  (t) => [index('exercises_name_idx').on(t.name)],
);

export const routines = sqliteTable('routines', {
  id: id(),
  name: text('name').notNull(),
  ...syncColumns(),
});

export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    id: id(),
    routineId: text('routine_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    order: integer('order').notNull(),
    targetSets: integer('target_sets').notNull(),
    ...syncColumns(),
  },
  (t) => [index('routine_exercises_routine_idx').on(t.routineId, t.order)],
);

export const workouts = sqliteTable(
  'workouts',
  {
    id: id(),
    routineId: text('routine_id'),
    name: text('name').notNull(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    ...loggedInZone(),
    durationS: integer('duration_s'),
    totalVolumeKg: real('total_volume_kg'),
    counted: integer('counted', { mode: 'boolean' }).notNull(),
    notes: text('notes'),
    ...syncColumns(),
  },
  (t) => [index('workouts_date_idx').on(t.localDate)],
);

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: id(),
    workoutId: text('workout_id').notNull(),
    exerciseId: text('exercise_id').notNull(),
    order: integer('order').notNull(),
    supersetGroup: integer('superset_group'),
    ...syncColumns(),
  },
  (t) => [index('workout_exercises_workout_idx').on(t.workoutId, t.order)],
);

export const workoutSets = sqliteTable(
  'workout_sets',
  {
    id: id(),
    workoutExerciseId: text('workout_exercise_id').notNull(),
    order: integer('order').notNull(),
    setType: text('set_type').$type<SetType>().notNull(),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    rpe: real('rpe'),
    durationS: integer('duration_s'),
    distanceM: real('distance_m'),
    completedAt: integer('completed_at'),
    ...syncColumns(),
  },
  (t) => [index('workout_sets_exercise_idx').on(t.workoutExerciseId, t.order)],
);

export const personalRecords = sqliteTable(
  'personal_records',
  {
    id: id(),
    exerciseId: text('exercise_id').notNull(),
    prType: text('pr_type').$type<PrType>().notNull(),
    value: real('value').notNull(),
    reps: integer('reps'),
    setId: text('set_id').notNull(),
    achievedAt: integer('achieved_at').notNull(),
    ...syncColumns(),
  },
  (t) => [index('personal_records_exercise_idx').on(t.exerciseId, t.prType)],
);

export const cardioSessions = sqliteTable(
  'cardio_sessions',
  {
    id: id(),
    ...loggedInZone(),
    startedAt: integer('started_at').notNull(),
    durationS: integer('duration_s').notNull(),
    activity: text('activity').$type<CardioActivity>().notNull(),
    intensity: text('intensity').$type<CardioIntensity>().notNull(),
    distanceM: real('distance_m'),
    met: real('met').notNull(),
    onFootSteps: integer('on_foot_steps'),
    netKcal: real('net_kcal').notNull(),
    creditKcal: real('credit_kcal').notNull(),
    kcalEdited: integer('kcal_edited', { mode: 'boolean' }).notNull(),
    counted: integer('counted', { mode: 'boolean' }).notNull(),
    notes: text('notes'),
    ...syncColumns(),
  },
  (t) => [index('cardio_sessions_date_idx').on(t.localDate)],
);
