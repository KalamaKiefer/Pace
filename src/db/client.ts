import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// One database file per account, so users on a shared device never see each other's data.
export function openUserDatabase(userId: string) {
  const sqlite = openDatabaseSync(`pace-${userId}.db`, { enableChangeListener: true });
  return drizzle(sqlite, { schema });
}
