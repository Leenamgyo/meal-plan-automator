// 테스트용 in-memory SQLite DB 생성 헬퍼
// 모든 Repository 테스트는 격리된 DB 인스턴스를 사용한다.
import Database from 'better-sqlite3';
import { SCHEMA_DDL } from '../db/schema';
import { runMigrations } from '../db/migrations';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(SCHEMA_DDL);
  runMigrations(db);
  return db;
}
