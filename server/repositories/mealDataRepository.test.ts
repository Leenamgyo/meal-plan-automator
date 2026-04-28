import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTestDb } from '../__tests__/testDb';
import { MealDataRepository } from './mealDataRepository';
import type { MealEntry } from '../types';

const sampleMenus: MealEntry[] = [
  { name: '쌀밥', category_id: 1, color: '#fff' },
  { name: '된장찌개', category_id: 2, color: '#a00' },
];

describe('MealDataRepository', () => {
  it('빈 DB의 findAll은 빈 배열', () => {
    const repo = new MealDataRepository(createTestDb());
    assert.deepEqual(repo.findAll(), []);
  });

  it('upsert는 새 row 삽입 + menus 파싱', () => {
    const repo = new MealDataRepository(createTestDb());
    const row = repo.upsert('2024-01-01', sampleMenus);

    assert.equal(row.date, '2024-01-01');
    assert.deepEqual(row.menus, sampleMenus);
    assert.ok(row.id > 0);
  });

  it('동일 date에 upsert는 menus를 덮어쓴다', () => {
    const repo = new MealDataRepository(createTestDb());
    repo.upsert('2024-01-01', sampleMenus);

    const overwritten: MealEntry[] = [{ name: '잡곡밥', category_id: 1, color: '#fff' }];
    const row = repo.upsert('2024-01-01', overwritten);

    assert.deepEqual(row.menus, overwritten);
    assert.equal(repo.findAll().length, 1); // 여전히 1개
  });

  it('findByDate로 단일 row 조회', () => {
    const repo = new MealDataRepository(createTestDb());
    repo.upsert('2024-02-15', sampleMenus);

    const row = repo.findByDate('2024-02-15');
    assert.deepEqual(row?.menus, sampleMenus);

    assert.equal(repo.findByDate('2099-12-31'), null);
  });

  it('findAll은 date ASC 정렬', () => {
    const repo = new MealDataRepository(createTestDb());
    repo.upsert('2024-03-15', []);
    repo.upsert('2024-01-01', []);
    repo.upsert('2024-02-10', []);

    const dates = repo.findAll().map((r) => r.date);
    assert.deepEqual(dates, ['2024-01-01', '2024-02-10', '2024-03-15']);
  });

  it('removeByDate 후 findByDate는 null', () => {
    const repo = new MealDataRepository(createTestDb());
    repo.upsert('2024-01-01', sampleMenus);
    repo.removeByDate('2024-01-01');
    assert.equal(repo.findByDate('2024-01-01'), null);
  });

  it('빈 menus 배열도 정상 저장/복원', () => {
    const repo = new MealDataRepository(createTestDb());
    const row = repo.upsert('2024-01-01', []);
    assert.deepEqual(row.menus, []);
  });
});
