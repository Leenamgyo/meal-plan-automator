// Repository 진입점 — 도메인 별 인스턴스를 묶어 제공
// getRepos()는 현재 활성 db 인스턴스에 바인딩된 Repository 묶음을 반환한다.
// db가 재초기화되면(close → 재open) 자동으로 새 묶음을 생성한다.
import type Database from 'better-sqlite3';
import { getDb } from '../db/connection';
import { CategoryRepository } from './categoryRepository';
import { MenuItemRepository } from './menuItemRepository';
import { MealDataRepository } from './mealDataRepository';
import { PromptRepository } from './promptRepository';
import { ComboRepository } from './comboRepository';

export interface Repositories {
  categories: CategoryRepository;
  menuItems: MenuItemRepository;
  mealData: MealDataRepository;
  prompts: PromptRepository;
  combos: ComboRepository;
}

export function createRepositories(db: Database.Database): Repositories {
  return {
    categories: new CategoryRepository(db),
    menuItems: new MenuItemRepository(db),
    mealData: new MealDataRepository(db),
    prompts: new PromptRepository(db),
    combos: new ComboRepository(db),
  };
}

// db 인스턴스 동일성 기반 캐시 — prepared statement 재사용을 위해 유지
let cached: { db: Database.Database; repos: Repositories } | null = null;

export function getRepos(): Repositories {
  const db = getDb();
  if (cached && cached.db === db) {
    return cached.repos;
  }
  cached = { db, repos: createRepositories(db) };
  return cached.repos;
}

export {
  CategoryRepository,
  MenuItemRepository,
  MealDataRepository,
  PromptRepository,
  ComboRepository,
};
