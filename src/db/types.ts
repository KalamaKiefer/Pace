import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

// Repos take this rather than a specific driver: the app uses expo-sqlite, tests use better-sqlite3.
export type Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
