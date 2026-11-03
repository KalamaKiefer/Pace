import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { id, loggedInZone, syncColumns } from './columns';

export type FoodSource = 'custom' | 'usda' | 'off' | 'quick_add';

export const foods = sqliteTable(
  'foods',
  {
    id: id(),
    source: text('source').$type<FoodSource>().notNull(),
    sourceId: text('source_id'),
    barcode: text('barcode'),
    name: text('name').notNull(),
    brand: text('brand'),
    baseGrams: real('base_grams').notNull(), // Nutrients below are per baseGrams.
    kcal: real('kcal').notNull(),
    proteinG: real('protein_g').notNull(),
    carbsG: real('carbs_g').notNull(),
    fatG: real('fat_g').notNull(),
    fiberG: real('fiber_g'),
    sugarG: real('sugar_g'),
    sodiumMg: real('sodium_mg'),
    servings: text('servings', { mode: 'json' })
      .$type<{ label: string; grams: number }[]>()
      .notNull(),
    qualityFlag: text('quality_flag').$type<'kcal_macro_mismatch'>(),
    ...syncColumns(),
  },
  (t) => [
    uniqueIndex('foods_source_idx').on(t.source, t.sourceId),
    index('foods_barcode_idx').on(t.barcode),
  ],
);

// Macros are copied at log time, so editing a food never rewrites past days.
export const foodLogs = sqliteTable(
  'food_logs',
  {
    id: id(),
    ...loggedInZone(),
    mealSlot: text('meal_slot').notNull(),
    foodRef: text('food_ref').notNull(), // 'food:<id>' | 'usda:<fdcId>' | 'off:<barcode>'
    nameSnapshot: text('name_snapshot').notNull(),
    servingLabel: text('serving_label').notNull(),
    servingGrams: real('serving_grams').notNull(),
    quantity: real('quantity').notNull(),
    kcal: real('kcal').notNull(),
    proteinG: real('protein_g').notNull(),
    carbsG: real('carbs_g').notNull(),
    fatG: real('fat_g').notNull(),
    fiberG: real('fiber_g'),
    loggedAt: integer('logged_at').notNull(),
    ...syncColumns(),
  },
  (t) => [
    index('food_logs_date_slot_idx').on(t.localDate, t.mealSlot),
    index('food_logs_food_ref_idx').on(t.foodRef),
  ],
);
