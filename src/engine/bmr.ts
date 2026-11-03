import { SEDENTARY_FACTOR } from './constants';
import type { Sex } from './types';

// Mifflin-St Jeor.
export const computeBmr = (sex: Sex, weightKg: number, heightCm: number, age: number) =>
  10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);

export const sedentaryTdee = (bmr: number) => bmr * SEDENTARY_FACTOR;
