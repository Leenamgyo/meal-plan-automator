import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTestDb } from '../__tests__/testDb';
import { CategoryRepository } from './categoryRepository';

describe('CategoryRepository', () => {
  it('빈 DB의 findAll은 빈 배열', () => {
    const repo = new CategoryRepository(createTestDb());
    assert.deepEqual(repo.findAll(), []);
  });

  it('insert 후 findById로 동일 row 조회', () => {
    const repo = new CategoryRepository(createTestDb());
    const inserted = repo.insert({ name: '밥', color: '#ff0' });

    assert.equal(inserted.name, '밥');
    assert.equal(inserted.color, '#ff0');
    assert.ok(inserted.id > 0);

    const found = repo.findById(inserted.id);
    assert.deepEqual(found, inserted);
  });

  it('insert 시 name/color 누락 → 기본값 적용', () => {
    const repo = new CategoryRepository(createTestDb());
    const c = repo.insert({});
    assert.equal(c.name, '새 카테고리');
    assert.equal(c.color, '#cccccc');
  });

  it('update는 patch에 포함된 필드만 변경', () => {
    const repo = new CategoryRepository(createTestDb());
    const c = repo.insert({ name: '국', color: '#000' });

    const updated = repo.update(c.id, { color: '#fff' });
    assert.equal(updated?.name, '국'); // 그대로
    assert.equal(updated?.color, '#fff'); // 변경
  });

  it('update의 sort_order로 findAll 정렬 변경', () => {
    const repo = new CategoryRepository(createTestDb());
    const a = repo.insert({ name: 'A', color: '#1' });
    const b = repo.insert({ name: 'B', color: '#2' });

    repo.update(a.id, { sort_order: 10 });
    repo.update(b.id, { sort_order: 5 });

    const order = repo.findAll().map((c) => c.name);
    assert.deepEqual(order, ['B', 'A']); // sort_order ASC
  });

  it('remove 후 findById는 null', () => {
    const repo = new CategoryRepository(createTestDb());
    const c = repo.insert({ name: 'X', color: '#f00' });
    repo.remove(c.id);
    assert.equal(repo.findById(c.id), null);
  });

  it('존재하지 않는 id에 대한 update는 null', () => {
    const repo = new CategoryRepository(createTestDb());
    assert.equal(repo.update(999, { name: 'x' }), null);
  });

  it('빈 patch는 row를 그대로 반환', () => {
    const repo = new CategoryRepository(createTestDb());
    const c = repo.insert({ name: 'A', color: '#1' });
    const updated = repo.update(c.id, {});
    assert.deepEqual(updated, c);
  });
});
