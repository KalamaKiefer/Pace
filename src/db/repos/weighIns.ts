import { and, asc, eq, isNull } from 'drizzle-orm';

import { computeTrend } from '@/engine/trend';
import type { LocalDate } from '@/engine/types';
import type { EventBus } from '@/events/bus';
import { newId } from '@/lib/ids';

import { trendCache, weighIns, type WeighInFlag, type WeighInSource } from '../schema';
import type { Db } from '../types';
import { insertMeasurements, type MeasurementEntry } from './measurements';
import { newRow, softDeleted, tzOffsetAt } from './shared';

type SaveInput = {
  measuredAt: number;
  localDate: LocalDate;
  weightKg: number;
  source?: WeighInSource;
  externalId?: string;
  note?: string;
  flags?: WeighInFlag[];
  measurements?: MeasurementEntry[];
};

const activeOn = (localDate: LocalDate) =>
  and(eq(weighIns.localDate, localDate), isNull(weighIns.deletedAt));

// The first weigh-in of a day feeds the trend. The others are kept but not trended.
function reconcileDay(db: Db, localDate: LocalDate) {
  const rows = db
    .select({ id: weighIns.id, isTrended: weighIns.isTrended })
    .from(weighIns)
    .where(activeOn(localDate))
    .orderBy(asc(weighIns.measuredAt))
    .all();
  rows.forEach((row, index) => {
    const isTrended = index === 0;
    if (row.isTrended !== isTrended) {
      db.update(weighIns)
        .set({ isTrended, updatedAt: Date.now() })
        .where(eq(weighIns.id, row.id))
        .run();
    }
  });
}

function rebuildTrendCache(db: Db) {
  const trended = db
    .select({ localDate: weighIns.localDate, weightKg: weighIns.weightKg })
    .from(weighIns)
    .where(and(eq(weighIns.isTrended, true), isNull(weighIns.deletedAt)))
    .all();
  db.delete(trendCache).run();
  if (trended.length > 0) db.insert(trendCache).values(computeTrend(trended)).run();
}

export function createWeighInsRepo(db: Db, bus: EventBus) {
  return {
    // A weigh-in and its optional measurements save together or not at all.
    save({ measurements: entries = [], source = 'manual', ...input }: SaveInput) {
      const id = newId();
      const measurementIds = db.transaction((tx) => {
        tx.insert(weighIns)
          .values({
            ...input,
            ...newRow(),
            id,
            source,
            tzOffsetMin: tzOffsetAt(input.measuredAt),
            isTrended: false,
          })
          .run();
        const ids = insertMeasurements(tx, {
          measuredAt: input.measuredAt,
          localDate: input.localDate,
          entries,
          weighInId: id,
        });
        reconcileDay(tx, input.localDate);
        rebuildTrendCache(tx);
        return ids;
      });

      bus.emit({ type: 'weighin.saved', id, localDate: input.localDate });
      if (measurementIds.length > 0) {
        bus.emit({ type: 'measurement.saved', ids: measurementIds, localDate: input.localDate });
      }
      return { id };
    },

    softDelete(id: string) {
      const localDate = db.transaction((tx) => {
        const row = tx
          .select({ localDate: weighIns.localDate })
          .from(weighIns)
          .where(eq(weighIns.id, id))
          .get();
        if (!row) return null;
        tx.update(weighIns)
          .set({ ...softDeleted(), isTrended: false })
          .where(eq(weighIns.id, id))
          .run();
        reconcileDay(tx, row.localDate);
        rebuildTrendCache(tx);
        return row.localDate;
      });
      if (localDate) bus.emit({ type: 'weighin.deleted', id, localDate });
    },

    forDate(localDate: LocalDate) {
      return db
        .select()
        .from(weighIns)
        .where(activeOn(localDate))
        .orderBy(asc(weighIns.measuredAt))
        .all();
    },

    trendSeries() {
      return db.select().from(trendCache).orderBy(asc(trendCache.localDate)).all();
    },
  };
}
