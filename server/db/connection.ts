// better-sqlite3 싱글턴 커넥션 관리
// 외부에서는 getDb()를 호출하여 항상 살아있는 인스턴스를 받는다.
// macOS activate 시 DB가 닫혀있으면 자동 재초기화한다.
import Database from 'better-sqlite3';
import { DB_PATH, isDev } from '../config';
import { SCHEMA_DDL } from './schema';
import { runMigrations } from './migrations';
import { upsertPrompts } from '../seed/prompts';

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  // dev 모드: 모든 SQL 실행을 stdout으로 출력 (better-sqlite3 verbose 옵션)
  const options: Database.Options | undefined = isDev()
    ? { verbose: (message?: unknown) => console.log('[SQL]', message) }
    : undefined;

  db = new Database(DB_PATH, options);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_DDL);
  runMigrations(db);
  upsertPrompts(db);
  console.log(`SQLite DB 경로: ${DB_PATH}${isDev() ? ' (verbose ON)' : ''}`);
  return db;
}

export function getDb(): Database.Database {
  if (!db || !db.open) {
    return initDatabase();
  }
  return db;
}

export function isDbOpen(): boolean {
  return !!(db && db.open);
}

export function closeDatabase(): void {
  if (db && db.open) {
    db.close();
  }
  db = null;
}
