// 기존 DB와의 호환을 위한 idempotent 마이그레이션
// 여러 번 실행되어도 안전하게 try/catch로 감싼다
import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  // categories.sort_order — v0.1 DB에는 없을 수 있음
  try {
    db.exec(`ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0`);
  } catch {
    // 이미 존재 → 무시
  }
}
