export type LocalDate = string; // 'YYYY-MM-DD'
export type Sex = 'male' | 'female';
export type GoalMode = 'lose' | 'maintain' | 'gain';
export type PaceStatus = 'ahead' | 'on_pace' | 'behind' | 'paused';
export type StepStatus = 'on_track' | 'slightly_behind' | 'at_risk' | 'done';
export type CardioActivity =
  'walk' | 'run' | 'cycle' | 'row' | 'elliptical' | 'stairs' | 'swim' | 'hike' | 'hiit' | 'other';
export type CardioIntensity = 'easy' | 'moderate' | 'hard';
export type MeasurementKind =
  'waist' | 'hips' | 'chest' | 'arm' | 'thigh' | 'neck' | 'body_fat_pct';

export type Macros = { proteinG: number; carbsG: number; fatG: number; fiberG: number };
