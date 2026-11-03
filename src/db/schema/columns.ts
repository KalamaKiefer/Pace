import { integer, text } from 'drizzle-orm/sqlite-core';

export const id = () => text('id').primaryKey();

// Every user-data table carries these so sync can compare rows and carry deletions.
export const syncColumns = () => ({
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

// Stored with each log so changing time zones never moves it to another day.
export const loggedInZone = () => ({
  localDate: text('local_date').notNull(),
  tzOffsetMin: integer('tz_offset_min').notNull(),
});
