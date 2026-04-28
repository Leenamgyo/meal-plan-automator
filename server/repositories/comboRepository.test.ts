import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTestDb } from '../__tests__/testDb';
import { CategoryRepository } from './categoryRepository';
import { MenuItemRepository } from './menuItemRepository';
import { ComboRepository } from './comboRepository';

function setupMenuItems(db = createTestDb()) {
  const catRepo = new CategoryRepository(db);
  const itemRepo = new MenuItemRepository(db);
  const cat = catRepo.insert({ name: '주메뉴', color: '#f00' });
  const m1 = itemRepo.insert({ name: '쌀밥', category_id: cat.id });
  const m2 = itemRepo.insert({ name: '된장찌개', category_id: cat.id, ingredients: ['된장'] });
  const m3 = itemRepo.insert({ name: '제육볶음', category_id: cat.id });
  return { db, m1, m2, m3 };
}

describe('ComboRepository', () => {
  it('빈 DB의 findAll은 빈 배열', () => {
    const repo = new ComboRepository(createTestDb());
    assert.deepEqual(repo.findAll(), []);
  });

  it('insert는 콤보와 item 매핑을 함께 생성, items hydration', () => {
    const { db, m1, m2 } = setupMenuItems();
    const repo = new ComboRepository(db);

    const combo = repo.insert({
      name: '한식 정식',
      description: '쌀밥+된장찌개',
      item_ids: [m1.id, m2.id],
    });

    assert.equal(combo.name, '한식 정식');
    assert.equal(combo.description, '쌀밥+된장찌개');
    assert.equal(combo.is_active, 1); // 기본값
    assert.equal(combo.items.length, 2);

    const itemNames = combo.items.map((i) => i.name).sort();
    assert.deepEqual(itemNames, ['된장찌개', '쌀밥']);

    // ingredients 도 hydrate 되었는지
    const dweonjang = combo.items.find((i) => i.name === '된장찌개');
    assert.deepEqual(dweonjang?.ingredients, ['된장']);
  });

  it('item_ids 없이 insert도 가능', () => {
    const repo = new ComboRepository(createTestDb());
    const combo = repo.insert({ name: '빈 콤보' });
    assert.equal(combo.items.length, 0);
  });

  it('description 기본값은 빈 문자열', () => {
    const repo = new ComboRepository(createTestDb());
    const combo = repo.insert({ name: 'x' });
    assert.equal(combo.description, '');
  });

  it('update의 item_ids는 기존 items를 전부 교체', () => {
    const { db, m1, m2, m3 } = setupMenuItems();
    const repo = new ComboRepository(db);

    const combo = repo.insert({ name: 'A', item_ids: [m1.id, m2.id] });
    const updated = repo.update(combo.id, { item_ids: [m3.id] });

    assert.equal(updated?.items.length, 1);
    assert.equal(updated?.items[0].name, '제육볶음');
  });

  it('update에 item_ids가 없으면 items 보존', () => {
    const { db, m1, m2 } = setupMenuItems();
    const repo = new ComboRepository(db);

    const combo = repo.insert({ name: 'A', item_ids: [m1.id, m2.id] });
    const updated = repo.update(combo.id, { name: 'A2' });

    assert.equal(updated?.name, 'A2');
    assert.equal(updated?.items.length, 2);
  });

  it('update의 is_active 비활성화', () => {
    const { db } = setupMenuItems();
    const repo = new ComboRepository(db);
    const combo = repo.insert({ name: 'X' });

    const updated = repo.update(combo.id, { is_active: 0 });
    assert.equal(updated?.is_active, 0);
  });

  it('존재하지 않는 id의 update는 null', () => {
    const repo = new ComboRepository(createTestDb());
    assert.equal(repo.update(999, { name: 'x' }), null);
  });

  it('combo 삭제 시 combo_items도 CASCADE', () => {
    const { db, m1 } = setupMenuItems();
    db.pragma('foreign_keys = ON');
    const repo = new ComboRepository(db);

    const combo = repo.insert({ name: 'X', item_ids: [m1.id] });
    repo.remove(combo.id);

    const orphan = db
      .prepare('SELECT COUNT(*) as n FROM combo_items WHERE combo_id = ?')
      .get(combo.id) as { n: number };
    assert.equal(orphan.n, 0);
  });

  it('menu_item 삭제 시 combo_items도 CASCADE (FK ON)', () => {
    const { db, m1, m2 } = setupMenuItems();
    db.pragma('foreign_keys = ON');
    const repo = new ComboRepository(db);
    const itemRepo = new MenuItemRepository(db);

    const combo = repo.insert({ name: 'X', item_ids: [m1.id, m2.id] });
    itemRepo.remove(m1.id);

    const after = repo.findById(combo.id);
    assert.equal(after?.items.length, 1);
    assert.equal(after?.items[0].name, '된장찌개');
  });
});
