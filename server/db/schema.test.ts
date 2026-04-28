// SCHEMA_DDL 적용 후 기대한 테이블/컬럼이 모두 생성되는지 검증
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import Database from 'better-sqlite3';
import { SCHEMA_DDL } from './schema';

interface TableRow {
  name: string;
}

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

describe('SCHEMA_DDL', () => {
  it('6개 테이블을 모두 생성한다', () => {
    const db = new Database(':memory:');
    db.exec(SCHEMA_DDL);

    // sqlite_sequence는 AUTOINCREMENT 사용 시 SQLite가 자동 생성하는 내부 테이블 → 제외
    const tables = (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as TableRow[]
    ).map((r) => r.name);

    assert.deepEqual(tables.sort(), [
      'categories',
      'combo_items',
      'combos',
      'meal_data',
      'menu_items',
      'prompts',
    ]);
  });

  it('categories 테이블에 필수 컬럼이 있다', () => {
    const db = new Database(':memory:');
    db.exec(SCHEMA_DDL);

    const cols = db.prepare(`PRAGMA table_info(categories)`).all() as ColumnInfo[];
    const names = cols.map((c) => c.name).sort();
    assert.deepEqual(names, ['color', 'created_at', 'id', 'name', 'sort_order']);
  });

  it('menu_items.category_id 는 ON DELETE SET NULL', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA_DDL);

    const catId = db
      .prepare(`INSERT INTO categories (name, color) VALUES ('밥', '#fff')`)
      .run().lastInsertRowid;
    db.prepare(`INSERT INTO menu_items (name, category_id) VALUES ('쌀밥', ?)`).run(catId);
    db.prepare(`DELETE FROM categories WHERE id = ?`).run(catId);

    const row = db.prepare(`SELECT category_id FROM menu_items WHERE name = '쌀밥'`).get() as
      | { category_id: number | null }
      | undefined;
    assert.equal(row?.category_id, null);
  });

  it('meal_data.date 는 UNIQUE 제약을 가진다', () => {
    const db = new Database(':memory:');
    db.exec(SCHEMA_DDL);

    db.prepare(`INSERT INTO meal_data (date, menus) VALUES ('2024-01-01', '[]')`).run();
    assert.throws(() => {
      db.prepare(`INSERT INTO meal_data (date, menus) VALUES ('2024-01-01', '[]')`).run();
    }, /UNIQUE/);
  });

  it('combo_items 는 (combo_id, menu_item_id) 복합 PK', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA_DDL);

    db.prepare(`INSERT INTO categories (name, color) VALUES ('밥', '#fff')`).run();
    const m1 = db.prepare(`INSERT INTO menu_items (name) VALUES ('쌀밥')`).run().lastInsertRowid;
    const c1 = db.prepare(`INSERT INTO combos (name) VALUES ('정식')`).run().lastInsertRowid;

    db.prepare(`INSERT INTO combo_items (combo_id, menu_item_id) VALUES (?, ?)`).run(c1, m1);
    assert.throws(() => {
      db.prepare(`INSERT INTO combo_items (combo_id, menu_item_id) VALUES (?, ?)`).run(c1, m1);
    }, /UNIQUE|PRIMARY/);
  });
});
