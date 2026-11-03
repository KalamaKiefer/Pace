import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { id, syncColumns } from './columns';

export type StreakType =
  | 'logging'
  | 'calories_in_range'
  | 'protein'
  | 'steps'
  | 'weigh_in'
  | 'perfect_day'
  | 'workout_week'
  | 'on_pace_week';

export const streaks = sqliteTable('streaks', {
  type: text('type').$type<StreakType>().primaryKey(),
  current: integer('current').notNull(),
  longest: integer('longest').notNull(),
  currentStartedOn: text('current_started_on'),
  lastQualifiedOn: text('last_qualified_on'),
  longestStartedOn: text('longest_started_on'),
  longestEndedOn: text('longest_ended_on'),
  ...syncColumns(),
});

export const achievementUnlocks = sqliteTable('achievement_unlocks', {
  achievementId: text('achievement_id').primaryKey(),
  unlockedAt: integer('unlocked_at').notNull(),
  context: text('context', { mode: 'json' }).$type<Record<string, unknown>>(),
  seen: integer('seen', { mode: 'boolean' }).notNull(),
  ...syncColumns(),
});

export const notificationPrefs = sqliteTable('notification_prefs', {
  category: text('category').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  timeMinutes: integer('time_minutes'),
  ...syncColumns(),
});

// Device-only, like sync_state below.
export const notificationLog = sqliteTable(
  'notification_log',
  {
    id: id(),
    category: text('category').notNull(),
    scheduledFor: integer('scheduled_for').notNull(),
    firedAt: integer('fired_at'),
    dismissed: integer('dismissed', { mode: 'boolean' }),
    osId: text('os_id'),
  },
  (t) => [index('notification_log_category_idx').on(t.category, t.scheduledFor)],
);

export const syncState = sqliteTable('sync_state', {
  tableName: text('table_name').primaryKey(),
  lastPulledAt: integer('last_pulled_at').notNull(),
});
