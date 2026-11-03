import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import type { LocalDate } from '@/engine/types';
import type { EventBus } from '@/events/bus';
import { newId } from '@/lib/ids';

import { dayStatus, foodLogs } from '../schema';
import type { Db } from '../types';
import { newRow, softDeleted, tzOffsetAt } from './shared';

type AddInput = Omit<
  typeof foodLogs.$inferInsert,
  'id' | 'tzOffsetMin' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

const activeOn = (localDate: LocalDate) =>
  and(eq(foodLogs.localDate, localDate), isNull(foodLogs.deletedAt));

export function createFoodLogsRepo(db: Db, bus: EventBus) {
  return {
    add(input: AddInput) {
      const id = newId();
      db.insert(foodLogs)
        .values({ ...input, ...newRow(), id, tzOffsetMin: tzOffsetAt(input.loggedAt) })
        .run();
      bus.emit({ type: 'food.logged', id, localDate: input.localDate });
      return { id };
    },

    softDelete(id: string) {
      const row = db
        .update(foodLogs)
        .set(softDeleted())
        .where(eq(foodLogs.id, id))
        .returning({ localDate: foodLogs.localDate })
        .get();
      if (row) bus.emit({ type: 'food.deleted', id, localDate: row.localDate });
    },

    forDate(localDate: LocalDate) {
      return db
        .select()
        .from(foodLogs)
        .where(activeOn(localDate))
        .orderBy(asc(foodLogs.loggedAt))
        .all();
    },

    totals(localDate: LocalDate) {
      return db
        .select({
          kcal: sql<number>`coalesce(sum(${foodLogs.kcal}), 0)`,
          proteinG: sql<number>`coalesce(sum(${foodLogs.proteinG}), 0)`,
          carbsG: sql<number>`coalesce(sum(${foodLogs.carbsG}), 0)`,
          fatG: sql<number>`coalesce(sum(${foodLogs.fatG}), 0)`,
        })
        .from(foodLogs)
        .where(activeOn(localDate))
        .get()!;
    },

    isDayComplete(localDate: LocalDate) {
      const row = db
        .select({ foodComplete: dayStatus.foodComplete })
        .from(dayStatus)
        .where(eq(dayStatus.localDate, localDate))
        .get();
      return row?.foodComplete ?? false;
    },

    setDayComplete(localDate: LocalDate, complete: boolean) {
      const now = Date.now();
      const values = { foodComplete: complete, completedAt: complete ? now : null };
      db.insert(dayStatus)
        .values({ ...values, ...newRow(now), localDate })
        .onConflictDoUpdate({
          target: dayStatus.localDate,
          set: { ...values, updatedAt: now },
        })
        .run();
      if (complete) bus.emit({ type: 'day.completed', localDate });
    },
  };
}
