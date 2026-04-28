// categories 테이블 데이터 접근 계층
import type Database from 'better-sqlite3';
import type { Category, CategoryCreate, CategoryPatch } from '../types';

interface CategoryRow {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

const toDomain = (r: CategoryRow): Category => ({ ...r });

export class CategoryRepository {
  private readonly findAllStmt: Database.Statement;
  private readonly findByIdStmt: Database.Statement;
  private readonly insertStmt: Database.Statement;
  private readonly removeStmt: Database.Statement;

  constructor(private readonly db: Database.Database) {
    this.findAllStmt = db.prepare(
      'SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC',
    );
    this.findByIdStmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    this.insertStmt = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
    this.removeStmt = db.prepare('DELETE FROM categories WHERE id = ?');
  }

  findAll(): Category[] {
    return (this.findAllStmt.all() as CategoryRow[]).map(toDomain);
  }

  findById(id: number): Category | null {
    const row = this.findByIdStmt.get(id) as CategoryRow | undefined;
    return row ? toDomain(row) : null;
  }

  insert(input: CategoryCreate): Category {
    const result = this.insertStmt.run(input.name || '새 카테고리', input.color || '#cccccc');
    const row = this.findByIdStmt.get(result.lastInsertRowid) as CategoryRow;
    return toDomain(row);
  }

  // 부분 업데이트 — patch에 포함된 필드만 SET. 없으면 그대로.
  update(id: number, patch: CategoryPatch): Category | null {
    const setParts: string[] = [];
    const values: Array<string | number> = [];

    if (patch.name !== undefined) {
      setParts.push('name = ?');
      values.push(patch.name);
    }
    if (patch.color !== undefined) {
      setParts.push('color = ?');
      values.push(patch.color);
    }
    if (patch.sort_order !== undefined) {
      setParts.push('sort_order = ?');
      values.push(patch.sort_order);
    }

    if (setParts.length > 0) {
      values.push(id);
      // 동적 SQL은 prepare 캐싱이 어려워 매 호출 prepare. patch 키 조합당 1회 컴파일은 허용.
      this.db
        .prepare(`UPDATE categories SET ${setParts.join(', ')} WHERE id = ?`)
        .run(...values);
    }

    return this.findById(id);
  }

  remove(id: number): void {
    this.removeStmt.run(id);
  }
}
