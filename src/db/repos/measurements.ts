import { and, asc, eq, isNull } from 'drizzle-orm';

import type { LocalDate, MeasurementKind } from '@/engine/types';
import type { EventBus } from '@/events/bus';
import { newId } from '@/lib/ids';

import { measurements } from '../schema';
import type { Db } from '../types';
import { newRow, softDeleted, tzOffsetAt } from './shared';

export type MeasurementEntry = { kind: MeasurementKind; value: number; note?: string };

type InsertInput = {
  measuredAt: number;
  localDate: LocalDate;
  entries: MeasurementEntry[];
  weighInId?: string;
};

// Takes a Db so a weigh-in can run this inside its own transaction.
export function insertMeasurements(
  db: Db,
  { measuredAt, localDate, entries, weighInId }: InsertInput,
) {
  const rows = entries.map((entry) => ({
    ...entry,
    ...newRow(),
    id: newId(),
    measuredAt,
    localDate,
    tzOffsetMin: tzOffsetAt(measuredAt),
    weighInId,
  }));
  if (rows.length > 0) db.insert(measurements).values(rows).run();
  return rows.map((row) => row.id);
}

export function createMeasurementsRepo(db: Db, bus: EventBus) {
  return {
    save(input: Omit<InsertInput, 'weighInId'>) {
      const ids = insertMeasurements(db, input);
      bus.emit({ type: 'measurement.saved', ids, localDate: input.localDate });
      return ids;
    },

    forDate(localDate: LocalDate) {
      return db
        .select()
        .from(measurements)
        .where(and(eq(measurements.localDate, localDate), isNull(measurements.deletedAt)))
        .orderBy(asc(measurements.measuredAt))
        .all();
    },

    history(kind: MeasurementKind) {
      return db
        .select()
        .from(measurements)
        .where(and(eq(measurements.kind, kind), isNull(measurements.deletedAt)))
        .orderBy(asc(measurements.localDate), asc(measurements.measuredAt))
        .all();
    },

    softDelete(id: string) {
      db.update(measurements).set(softDeleted()).where(eq(measurements.id, id)).run();
    },
  };
}
