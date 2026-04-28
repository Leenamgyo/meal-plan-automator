// menu_items 테이블 데이터 접근 계층
// ingredients 컬럼은 JSON 문자열로 저장 → 도메인에서는 string[]로 노출
import type Database from 'better-sqlite3';
import type { MenuItem, MenuItemCreate, MenuItemPatch } from '../types';

interface MenuItemRow {
  id: number;
  name: string;
  category_id: number | null;
  ingredients: string;
  created_at: string;
}

const toDomain = (r: MenuItemRow): MenuItem => ({
  ...r,
  ingredients: JSON.parse(r.ingredients || '[]') as string[],
});

export class MenuItemRepository {
  private readonly findAllStmt: Database.Statement;
  private readonly findByIdStmt: Database.Statement;
  private readonly insertStmt: Database.Statement;
  private readonly updateStmt: Database.Statement;
  private readonly removeStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.findAllStmt = db.prepare('SELECT * FROM menu_items ORDER BY created_at');
    this.findByIdStmt = db.prepare('SELECT * FROM menu_items WHERE id = ?');
    this.insertStmt = db.prepare(
      'INSERT INTO menu_items (name, category_id, ingredients) VALUES (?, ?, ?)',
    );
    this.updateStmt = db.prepare(
      'UPDATE menu_items SET name = ?, category_id = ?, ingredients = ? WHERE id = ?',
    );
    this.removeStmt = db.prepare('DELETE FROM menu_items WHERE id = ?');
  }

  findAll(): MenuItem[] {
    return (this.findAllStmt.all() as MenuItemRow[]).map(toDomain);
  }

  findById(id: number): MenuItem | null {
    const row = this.findByIdStmt.get(id) as MenuItemRow | undefined;
    return row ? toDomain(row) : null;
  }

  insert(input: MenuItemCreate): MenuItem {
    const result = this.insertStmt.run(
      input.name || '',
      input.category_id ?? null,
      JSON.stringify(input.ingredients || []),
    );
    const row = this.findByIdStmt.get(result.lastInsertRowid) as MenuItemRow;
    return toDomain(row);
  }

  // patch에 없는 필드는 기존 row 값으로 유지하여 전체 업데이트 (SQL UPDATE 문이 모든 컬럼을 SET하기 때문)
  update(id: number, patch: MenuItemPatch): MenuItem | null {
    const existing = this.findByIdStmt.get(id) as MenuItemRow | undefined;
    if (!existing) return null;

    const ingredientsJson = patch.ingredients
      ? JSON.stringify(patch.ingredients)
      : existing.ingredients;

    this.updateStmt.run(
      patch.name ?? existing.name,
      patch.category_id ?? existing.category_id,
      ingredientsJson,
      id,
    );

    return this.findById(id);
  }

  remove(id: number): void {
    this.removeStmt.run(id);
  }
}
