// runMigrations 의 idempotency 검증
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

interface ColumnInfo {
  name: string;
}

describe('runMigrations', () => {
  it('sort_order 컬럼이 없으면 추가한다 (구버전 DB 호환)', () => {
    const db = new Database(':memory:');
    // sort_order 없는 구 스키마를 흉내냄
    db.exec(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#cccccc',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    runMigrations(db);

    const cols = (db.prepare(`PRAGMA table_info(categories)`).all() as ColumnInfo[]).map(
      (c) => c.name,
    );
    assert.ok(cols.includes('sort_order'));
  });

  it('이미 sort_order가 있으면 에러 없이 통과한다 (idempotent)', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    assert.doesNotThrow(() => runMigrations(db));
    assert.doesNotThrow(() => runMigrations(db)); // 두 번 실행해도 OK
  });
});
