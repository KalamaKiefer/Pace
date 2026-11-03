import { and, asc, eq, isNull } from 'drizzle-orm';

import { cardioCredit, estimateOnFootSteps, metFor } from '@/engine/cardio';
import type { CardioActivity, CardioIntensity, LocalDate } from '@/engine/types';
import type { EventBus } from '@/events/bus';
import { newId } from '@/lib/ids';

import { cardioSessions } from '../schema';
import type { Db } from '../types';
import { newRow, softDeleted, tzOffsetAt } from './shared';

const MIN_COUNTED_S = 600;

type SaveInput = {
  localDate: LocalDate;
  startedAt: number;
  durationS: number;
  activity: CardioActivity;
  intensity: CardioIntensity;
  weightKg: number;
  kcalPerStep?: number;
  onFootSteps?: number; // From Apple Health. Estimated from duration when missing.
  distanceM?: number;
  kcalOverride?: number;
  notes?: string;
};

export function createCardioRepo(db: Db, bus: EventBus) {
  return {
    save({ weightKg, kcalPerStep, kcalOverride, ...session }: SaveInput) {
      const id = newId();
      const met = metFor(session.activity, session.intensity);
      const onFootSteps =
        session.onFootSteps ?? estimateOnFootSteps(session.activity, session.durationS);
      const { netKcal, creditKcal } = cardioCredit({
        met,
        weightKg,
        durationS: session.durationS,
        onFootSteps,
        kcalPerStep,
      });

      db.insert(cardioSessions)
        .values({
          ...session,
          ...newRow(),
          id,
          tzOffsetMin: tzOffsetAt(session.startedAt),
          met,
          onFootSteps: onFootSteps || null,
          netKcal,
          creditKcal: kcalOverride ?? creditKcal,
          kcalEdited: kcalOverride !== undefined,
          counted: session.durationS >= MIN_COUNTED_S,
        })
        .run();
      bus.emit({ type: 'cardio.saved', id, localDate: session.localDate });
      return { id };
    },

    softDelete(id: string) {
      const row = db
        .update(cardioSessions)
        .set(softDeleted())
        .where(eq(cardioSessions.id, id))
        .returning({ localDate: cardioSessions.localDate })
        .get();
      if (row) bus.emit({ type: 'cardio.deleted', id, localDate: row.localDate });
    },

    get(id: string) {
      return db
        .select()
        .from(cardioSessions)
        .where(and(eq(cardioSessions.id, id), isNull(cardioSessions.deletedAt)))
        .get();
    },

    forDate(localDate: LocalDate) {
      return db
        .select()
        .from(cardioSessions)
        .where(and(eq(cardioSessions.localDate, localDate), isNull(cardioSessions.deletedAt)))
        .orderBy(asc(cardioSessions.startedAt))
        .all();
    },
  };
}
