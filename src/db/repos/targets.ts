import { and, eq, isNull } from 'drizzle-orm';

import { dayCredit, effectiveTarget, macrosWithCredit } from '@/engine/cardio';
import type { LocalDate } from '@/engine/types';

import { cardioSessions, dailyTargets } from '../schema';
import type { Db } from '../types';
import { newRow } from './shared';

type TargetInput = Omit<typeof dailyTargets.$inferInsert, 'createdAt' | 'updatedAt' | 'deletedAt'>;

export function createTargetsRepo(db: Db) {
  const forDate = (localDate: LocalDate) =>
    db
      .select()
      .from(dailyTargets)
      .where(and(eq(dailyTargets.localDate, localDate), isNull(dailyTargets.deletedAt)))
      .get();

  return {
    forDate,

    upsert(target: TargetInput) {
      const now = Date.now();
      db.insert(dailyTargets)
        .values({ ...target, ...newRow(now) })
        .onConflictDoUpdate({
          target: dailyTargets.localDate,
          set: { ...target, updatedAt: now, deletedAt: null },
        })
        .run();
    },

    // The day's target with logged cardio added. Steps never change it.
    effective(localDate: LocalDate) {
      const target = forDate(localDate);
      if (!target) return undefined;
      const credits = db
        .select({ creditKcal: cardioSessions.creditKcal })
        .from(cardioSessions)
        .where(and(eq(cardioSessions.localDate, localDate), isNull(cardioSessions.deletedAt)))
        .all()
        .map((row) => row.creditKcal);
      const cardioCreditKcal = dayCredit(credits);
      const { proteinG, carbsG, fatG, fiberG } = macrosWithCredit(target, cardioCreditKcal);
      return {
        baseKcal: target.kcal,
        cardioCreditKcal,
        kcal: effectiveTarget(target.kcal, credits),
        proteinG,
        carbsG,
        fatG,
        fiberG,
        stepGoal: target.stepGoal,
      };
    },
  };
}
