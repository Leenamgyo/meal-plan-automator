// combos + combo_items 데이터 접근 계층
// 콤보는 항상 items[]를 포함한 형태로 반환 (조인 쿼리 + JSON 파싱)
import type Database from 'better-sqlite3';
import type { Combo, ComboCreate, ComboPatch, MenuItem } from '../types';

interface ComboRow {
  id: number;
  name: string;
  description: string;
  is_active: number;
  created_at: string;
}

interface MenuItemRow {
  id: number;
  name: string;
  category_id: number | null;
  ingredients: string;
  created_at: string;
}

const itemRowToDomain = (r: MenuItemRow): MenuItem => ({
  ...r,
  ingredients: JSON.parse(r.ingredients || '[]') as string[],
});

export class ComboRepository {
  private readonly findAllCombosStmt: Database.Statement;
  private readonly findComboByIdStmt: Database.Statement;
  private readonly findItemsByComboIdStmt: Database.Statement;
  private readonly insertComboStmt: Database.Statement;
  private readonly updateComboStmt: Database.Statement;
  private readonly removeComboStmt: Database.Statement;
  private readonly clearItemsStmt: Database.Statement;
  private readonly insertItemStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.findAllCombosStmt = db.prepare('SELECT * FROM combos ORDER BY created_at');
    this.findComboByIdStmt = db.prepare('SELECT * FROM combos WHERE id = ?');
    this.findItemsByComboIdStmt = db.prepare(`
      SELECT mi.* FROM menu_items mi
      JOIN combo_items ci ON ci.menu_item_id = mi.id
      WHERE ci.combo_id = ?
    `);
    this.insertComboStmt = db.prepare(
      'INSERT INTO combos (name, description) VALUES (?, ?)',
    );
    this.updateComboStmt = db.prepare(
      'UPDATE combos SET name = ?, description = ?, is_active = ? WHERE id = ?',
    );
    this.removeComboStmt = db.prepare('DELETE FROM combos WHERE id = ?');
    this.clearItemsStmt = db.prepare('DELETE FROM combo_items WHERE combo_id = ?');
    this.insertItemStmt = db.prepare(
      'INSERT OR IGNORE INTO combo_items (combo_id, menu_item_id) VALUES (?, ?)',
    );
  }

  // 단일 콤보를 items와 함께 hydration
  private hydrate(comboRow: ComboRow): Combo {
    const items = this.findItemsByComboIdStmt.all(comboRow.id) as MenuItemRow[];
    return { ...comboRow, items: items.map(itemRowToDomain) };
  }

  findAll(): Combo[] {
    const combos = this.findAllCombosStmt.all() as ComboRow[];
    return combos.map((c) => this.hydrate(c));
  }

  findById(id: number): Combo | null {
    const row = this.findComboByIdStmt.get(id) as ComboRow | undefined;
    return row ? this.hydrate(row) : null;
  }

  insert(input: ComboCreate): Combo {
    const result = this.insertComboStmt.run(input.name, input.description || '');
    const comboId = Number(result.lastInsertRowid);

    if (Array.isArray(input.item_ids)) {
      for (const itemId of input.item_ids) {
        this.insertItemStmt.run(comboId, itemId);
      }
    }

    return this.findById(comboId) as Combo;
  }

  update(id: number, patch: ComboPatch): Combo | null {
    const existing = this.findComboByIdStmt.get(id) as ComboRow | undefined;
    if (!existing) return null;

    this.updateComboStmt.run(
      patch.name ?? existing.name,
      patch.description ?? existing.description,
      patch.is_active ?? existing.is_active,
      id,
    );

    if (Array.isArray(patch.item_ids)) {
      this.clearItemsStmt.run(id);
      for (const itemId of patch.item_ids) {
        this.insertItemStmt.run(id, itemId);
      }
    }

    return this.findById(id);
  }

  remove(id: number): void {
    this.removeComboStmt.run(id);
  }
}
