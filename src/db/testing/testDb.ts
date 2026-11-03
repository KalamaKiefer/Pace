import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';

import { createEventBus, type DomainEvent } from '@/events/bus';

import * as schema from '../schema';
import type { Db } from '../types';

// A real SQLite database in memory, built from the same migrations the app ships.
export function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '../migrations') });

  const bus = createEventBus();
  const events: DomainEvent[] = [];
  bus.onAny((event) => events.push(event));

  return { db: db as unknown as Db, sqlite, bus, events };
}
