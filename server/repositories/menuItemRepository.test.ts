import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTestDb } from '../__tests__/testDb';
import { CategoryRepository } from './categoryRepository';
import { MenuItemRepository } from './menuItemRepository';

describe('MenuItemRepository', () => {
  it('빈 DB의 findAll은 빈 배열', () => {
    const repo = new MenuItemRepository(createTestDb());
    assert.deepEqual(repo.findAll(), []);
  });

  it('insert 후 findById, ingredients는 string[]로 hydrate', () => {
    const db = createTestDb();
    const cat = new CategoryRepository(db).insert({ name: '주메뉴', color: '#f00' });
    const repo = new MenuItemRepository(db);

    const item = repo.insert({
      name: '제육볶음',
      category_id: cat.id,
      ingredients: ['돼지고기', '고추장', '양파'],
    });

    assert.equal(item.name, '제육볶음');
    assert.equal(item.category_id, cat.id);
    assert.deepEqual(item.ingredients, ['돼지고기', '고추장', '양파']);

    const found = repo.findById(item.id);
    assert.deepEqual(found?.ingredients, ['돼지고기', '고추장', '양파']);
  });

  it('ingredients 미지정 → 빈 배열', () => {
    const repo = new MenuItemRepository(createTestDb());
    const item = repo.insert({ name: '쌀밥', category_id: null });
    assert.deepEqual(item.ingredients, []);
  });

  it('update는 patch 미포함 필드를 보존', () => {
    const db = createTestDb();
    const repo = new MenuItemRepository(db);
    const item = repo.insert({
      name: '쌀밥',
      category_id: null,
      ingredients: ['쌀'],
    });

    const updated = repo.update(item.id, { name: '잡곡밥' });
    assert.equal(updated?.name, '잡곡밥');
    assert.deepEqual(updated?.ingredients, ['쌀']); // 보존
  });

  it('update로 ingredients만 갱신', () => {
    const repo = new MenuItemRepository(createTestDb());
    const item = repo.insert({ name: '국', category_id: null, ingredients: ['a'] });
    const updated = repo.update(item.id, { ingredients: ['b', 'c'] });
    assert.deepEqual(updated?.ingredients, ['b', 'c']);
  });

  it('존재하지 않는 id의 update는 null', () => {
    const repo = new MenuItemRepository(createTestDb());
    assert.equal(repo.update(999, { name: 'x' }), null);
  });

  it('카테고리 삭제 시 menu_items.category_id는 NULL이 된다 (FK SET NULL)', () => {
    const db = createTestDb();
    db.pragma('foreign_keys = ON');
    const catRepo = new CategoryRepository(db);
    const itemRepo = new MenuItemRepository(db);

    const cat = catRepo.insert({ name: '주메뉴', color: '#f00' });
    const item = itemRepo.insert({ name: '제육볶음', category_id: cat.id });

    catRepo.remove(cat.id);

    const after = itemRepo.findById(item.id);
    assert.equal(after?.category_id, null);
  });

  it('remove 후 findById는 null', () => {
    const repo = new MenuItemRepository(createTestDb());
    const item = repo.insert({ name: 'X', category_id: null });
    repo.remove(item.id);
    assert.equal(repo.findById(item.id), null);
  });
});
