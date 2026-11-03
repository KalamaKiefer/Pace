import {
  CARBS_MIN_G,
  FAT_MIN_G_PER_LB_GOAL,
  FAT_MIN_PCT,
  FIBER_G_PER_1000_KCAL,
  PROTEIN_G_PER_LB_GOAL,
  PROTEIN_G_PER_LB_MAX,
  PROTEIN_G_PER_LB_MIN,
} from './constants';
import type { Macros } from './types';
import { kgToLb } from './units';

export type MacroOverride = { proteinG?: number; carbsG?: number; fatG?: number };

type Input = {
  kcal: number;
  goalWeightKg: number;
  proteinGPerLbGoal?: number;
  override?: MacroOverride;
};

const carbsFor = (kcal: number, proteinG: number, fatG: number) =>
  (kcal - 4 * proteinG - 9 * fatG) / 4;

// Rounds away float noise from unit conversion, so 55.5 g doesn't land on 55.49999.
const roundG = (grams: number) => Math.round(grams + 1e-6);

export function computeMacros({
  kcal,
  goalWeightKg,
  proteinGPerLbGoal = PROTEIN_G_PER_LB_GOAL,
  override = {},
}: Input): Macros {
  const goalLb = kgToLb(goalWeightKg);
  const perLb = Math.min(PROTEIN_G_PER_LB_MAX, Math.max(PROTEIN_G_PER_LB_MIN, proteinGPerLbGoal));
  const proteinG = override.proteinG ?? roundG(perLb * goalLb);

  const fatByGoal = FAT_MIN_G_PER_LB_GOAL * goalLb;
  const fatByKcal = (FAT_MIN_PCT * kcal) / 9;
  let fatG = override.fatG ?? roundG(Math.max(fatByGoal, fatByKcal));

  if (override.fatG === undefined && carbsFor(kcal, proteinG, fatG) < CARBS_MIN_G) {
    const fatForMinCarbs = (kcal - 4 * proteinG - 4 * CARBS_MIN_G) / 9;
    fatG = roundG(Math.max(Math.min(fatByGoal, fatByKcal), fatForMinCarbs));
  }

  const carbsG =
    override.carbsG ?? Math.max(CARBS_MIN_G, Math.round(carbsFor(kcal, proteinG, fatG)));

  return { proteinG, carbsG, fatG, fiberG: Math.round((FIBER_G_PER_1000_KCAL * kcal) / 1000) };
}
