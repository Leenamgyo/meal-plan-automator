// prompts 테이블 데이터 접근 계층 (id가 TEXT PK)
import type Database from 'better-sqlite3';
import type { Prompt, PromptCreate, PromptPatch } from '../types';

interface PromptRow {
  id: string;
  version: string;
  description: string | null;
  content: string;
  is_active: number;
}

const toDomain = (r: PromptRow): Prompt => ({ ...r });

export class PromptRepository {
  private readonly findAllStmt: Database.Statement;
  private readonly findByIdStmt: Database.Statement;
  private readonly existsStmt: Database.Statement;
  private readonly insertStmt: Database.Statement;
  private readonly updateStmt: Database.Statement;
  private readonly removeStmt: Database.Statement;

  constructor(db: Database.Database) {
    this.findAllStmt = db.prepare('SELECT * FROM prompts ORDER BY id ASC');
    this.findByIdStmt = db.prepare('SELECT * FROM prompts WHERE id = ?');
    this.existsStmt = db.prepare('SELECT id FROM prompts WHERE id = ?');
    this.insertStmt = db.prepare(
      'INSERT INTO prompts (id, description, content, version, is_active) VALUES (?, ?, ?, ?, ?)',
    );
    this.updateStmt = db.prepare(
      'UPDATE prompts SET content = ?, version = ?, is_active = ? WHERE id = ?',
    );
    this.removeStmt = db.prepare('DELETE FROM prompts WHERE id = ?');
  }

  findAll(): Prompt[] {
    return (this.findAllStmt.all() as PromptRow[]).map(toDomain);
  }

  findById(id: string): Prompt | null {
    const row = this.findByIdStmt.get(id) as PromptRow | undefined;
    return row ? toDomain(row) : null;
  }

  existsById(id: string): boolean {
    return this.existsStmt.get(id) !== undefined;
  }

  insert(input: PromptCreate): Prompt {
    this.insertStmt.run(
      input.id,
      input.description || '',
      input.content,
      input.version || '1.0',
      input.is_active ?? 1,
    );
    return this.findById(input.id) as Prompt;
  }

  update(id: string, patch: PromptPatch): Prompt | null {
    const existing = this.findById(id);
    if (!existing) return null;

    this.updateStmt.run(
      patch.content ?? existing.content,
      patch.version ?? existing.version,
      patch.is_active ?? existing.is_active,
      id,
    );

    return this.findById(id);
  }

  remove(id: string): void {
    this.removeStmt.run(id);
  }
}
