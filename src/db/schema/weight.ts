import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { MeasurementKind } from '@/engine/types';

import { id, loggedInZone, syncColumns } from './columns';

export type WeighInSource = 'manual' | 'healthkit' | 'health_connect';
export type WeighInFlag = 'post_meal' | 'post_workout';

export const weighIns = sqliteTable(
  'weigh_ins',
  {
    id: id(),
    measuredAt: integer('measured_at').notNull(),
    ...loggedInZone(),
    weightKg: real('weight_kg').notNull(),
    source: text('source').$type<WeighInSource>().notNull(),
    externalId: text('external_id'),
    note: text('note'),
    flags: text('flags', { mode: 'json' }).$type<WeighInFlag[]>(),
    isTrended: integer('is_trended', { mode: 'boolean' }).notNull(),
    ...syncColumns(),
  },
  (t) => [
    index('weigh_ins_date_idx').on(t.localDate),
    uniqueIndex('weigh_ins_source_external_idx').on(t.source, t.externalId),
  ],
);

// Derived from weigh_ins and rebuilt on any edit. Never synced.
export const trendCache = sqliteTable('trend_cache', {
  localDate: text('local_date').primaryKey(),
  trendKg: real('trend_kg').notNull(),
});

export const measurements = sqliteTable(
  'measurements',
  {
    id: id(),
    measuredAt: integer('measured_at').notNull(),
    ...loggedInZone(),
    kind: text('kind').$type<MeasurementKind>().notNull(),
    value: real('value').notNull(), // cm, or percent for body_fat_pct.
    weighInId: text('weigh_in_id'), // Set when saved together with a weigh-in.
    note: text('note'),
    ...syncColumns(),
  },
  (t) => [
    index('measurements_date_kind_idx').on(t.localDate, t.kind),
    index('measurements_weigh_in_idx').on(t.weighInId),
  ],
);
