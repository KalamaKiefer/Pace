import { eq } from 'drizzle-orm';

import { streaks, type StreakType } from '../schema';
import type { Db } from '../types';
import { newRow } from './shared';

type StreakInput = Omit<typeof streaks.$inferInsert, 'createdAt' | 'updatedAt' | 'deletedAt'>;

export function createStreaksRepo(db: Db) {
  return {
    get(type: StreakType) {
      return db.select().from(streaks).where(eq(streaks.type, type)).get();
    },

    all() {
      return db.select().from(streaks).all();
    },

    upsert(streak: StreakInput) {
      const now = Date.now();
      db.insert(streaks)
        .values({ ...streak, ...newRow(now) })
        .onConflictDoUpdate({ target: streaks.type, set: { ...streak, updatedAt: now } })
        .run();
    },
  };
}
