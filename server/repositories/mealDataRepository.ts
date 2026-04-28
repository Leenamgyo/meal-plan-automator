// meal_data 테이블 데이터 접근 계층 (date 기준 upsert)
// menus 컬럼은 JSON 문자열로 저장 → 도메인에서는 MealEntry[]로 노출
import type Database from 'better-sqlite3';
import type { MealData, MealEntry } from '../types';

interface MealDataRow {
  id: number;
  date: string;
  menus: string;
  created_at: string;
}

const toDomain = (r: MealDataRow): MealData => ({
  ...r,
  menus: JSON.parse(r.menus || '[]') as MealEntry[],
});

export class MealDataRepository {
  private readonly findAllStmt: Database.Statement;
  private readonly findByDateStmt: Database.Statement;
  private readonly upsertStmt: Database.Statement;
  private readonly removeByDateStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.findAllStmt = db.prepare('SELECT * FROM meal_data ORDER BY date');
    this.findByDateStmt = db.prepare('SELECT * FROM meal_data WHERE date = ?');
    this.upsertStmt = db.prepare(`
      INSERT INTO meal_data (date, menus) VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET menus = excluded.menus
    `);
    this.removeByDateStmt = db.prepare('DELETE FROM meal_data WHERE date = ?');
  }

  findAll(): MealData[] {
    return (this.findAllStmt.all() as MealDataRow[]).map(toDomain);
  }

  findByDate(date: string): MealData | null {
    const row = this.findByDateStmt.get(date) as MealDataRow | undefined;
    return row ? toDomain(row) : null;
  }

  upsert(date: string, menus: MealEntry[]): MealData {
    this.upsertStmt.run(date, JSON.stringify(menus));
    // upsert 후 항상 row 존재
    return this.findByDate(date) as MealData;
  }

  removeByDate(date: string): void {
    this.removeByDateStmt.run(date);
  }
}
