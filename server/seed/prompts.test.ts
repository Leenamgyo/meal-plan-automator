// seedPrompts 데이터 무결성 + upsertPrompts 동작 검증
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTestDb } from '../__tests__/testDb';
import { seedPrompts, upsertPrompts } from './prompts';

interface PromptRow {
  id: string;
  description: string;
  content: string;
}

describe('seedPrompts', () => {
  it('필수 2개 프롬프트 ID가 모두 포함된다', () => {
    const ids = seedPrompts.map((p) => p.id).sort();
    assert.deepEqual(ids, ['chat_base', 'ingredient_suggest']);
  });

  it('모든 프롬프트는 비어있지 않은 content와 description을 가진다', () => {
    for (const p of seedPrompts) {
      assert.ok(p.content.length > 0, `${p.id} content is empty`);
      assert.ok(p.description.length > 0, `${p.id} description is empty`);
    }
  });
});

describe('upsertPrompts', () => {
  it('빈 DB에 2개 프롬프트를 모두 INSERT한다', () => {
    const db = createTestDb();
    upsertPrompts(db);

    const rows = db.prepare('SELECT * FROM prompts ORDER BY id').all() as PromptRow[];
    assert.equal(rows.length, 2);
  });

  it('이미 존재하는 ID는 content를 갱신한다 (UPSERT)', () => {
    const db = createTestDb();
    // 사용자가 직접 수정한 듯한 구버전 content
    db.prepare(
      `INSERT INTO prompts (id, description, content) VALUES ('chat_base', 'old', 'old content')`,
    ).run();

    upsertPrompts(db);

    const row = db.prepare(`SELECT * FROM prompts WHERE id = 'chat_base'`).get() as PromptRow;
    const seed = seedPrompts.find((p) => p.id === 'chat_base');
    assert.equal(row.content, seed?.content);
    assert.equal(row.description, seed?.description);
  });

  it('두 번 호출해도 row 개수는 2 그대로 (idempotent)', () => {
    const db = createTestDb();
    upsertPrompts(db);
    upsertPrompts(db);
    upsertPrompts(db);
    const count = (db.prepare('SELECT COUNT(*) as n FROM prompts').get() as { n: number }).n;
    assert.equal(count, 2);
  });
});
