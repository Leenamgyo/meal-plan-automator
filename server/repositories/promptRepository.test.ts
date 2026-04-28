import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTestDb } from '../__tests__/testDb';
import { PromptRepository } from './promptRepository';

describe('PromptRepository', () => {
  it('빈 DB의 findAll은 빈 배열', () => {
    const repo = new PromptRepository(createTestDb());
    assert.deepEqual(repo.findAll(), []);
  });

  it('insert + findById 기본 동작', () => {
    const repo = new PromptRepository(createTestDb());
    const p = repo.insert({
      id: 'test_prompt',
      content: 'hello',
      description: '테스트',
    });

    assert.equal(p.id, 'test_prompt');
    assert.equal(p.content, 'hello');
    assert.equal(p.description, '테스트');
    assert.equal(p.is_active, 1); // 기본값
    assert.equal(p.version, '1.0'); // 기본값

    const found = repo.findById('test_prompt');
    assert.deepEqual(found, p);
  });

  it('description/version/is_active 기본값', () => {
    const repo = new PromptRepository(createTestDb());
    const p = repo.insert({ id: 'minimal', content: 'x' });

    assert.equal(p.description, '');
    assert.equal(p.version, '1.0');
    assert.equal(p.is_active, 1);
  });

  it('existsById', () => {
    const repo = new PromptRepository(createTestDb());
    repo.insert({ id: 'a', content: 'x' });

    assert.equal(repo.existsById('a'), true);
    assert.equal(repo.existsById('nonexistent'), false);
  });

  it('update는 patch 미포함 필드를 보존', () => {
    const repo = new PromptRepository(createTestDb());
    repo.insert({
      id: 'p1',
      content: 'old',
      description: 'desc',
      version: '1.0',
    });

    const updated = repo.update('p1', { content: 'new' });
    assert.equal(updated?.content, 'new');
    assert.equal(updated?.version, '1.0'); // 보존

    const updated2 = repo.update('p1', { is_active: 0 });
    assert.equal(updated2?.is_active, 0);
    assert.equal(updated2?.content, 'new'); // 보존
  });

  it('존재하지 않는 id update는 null', () => {
    const repo = new PromptRepository(createTestDb());
    assert.equal(repo.update('nope', { content: 'x' }), null);
  });

  it('findAll은 id ASC 정렬', () => {
    const repo = new PromptRepository(createTestDb());
    repo.insert({ id: 'c', content: 'x' });
    repo.insert({ id: 'a', content: 'x' });
    repo.insert({ id: 'b', content: 'x' });

    const ids = repo.findAll().map((p) => p.id);
    assert.deepEqual(ids, ['a', 'b', 'c']);
  });

  it('remove 후 findById는 null', () => {
    const repo = new PromptRepository(createTestDb());
    repo.insert({ id: 'x', content: 'y' });
    repo.remove('x');
    assert.equal(repo.findById('x'), null);
  });
});
