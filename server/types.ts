// 서버 도메인 모델 — DB row를 파싱한 후의 형태 (Repository가 반환)
// 프론트가 받는 JSON 응답 형태와 일치한다.

export interface Category {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: number;
  name: string;
  category_id: number | null;
  ingredients: string[];
  created_at: string;
}

// meal_data.menus JSON 항목 (CLAUDE.md 스펙)
export interface MealEntry {
  name: string;
  category_id: number | null;
  color?: string;
}

export interface MealData {
  id: number;
  date: string;
  menus: MealEntry[];
  created_at: string;
}

export interface Prompt {
  id: string;
  version: string;
  description: string | null;
  content: string;
  is_active: number;
}

export interface Combo {
  id: number;
  name: string;
  description: string;
  is_active: number;
  created_at: string;
  items: MenuItem[];
}

// ===== 입력(write) 페이로드 =====

export interface CategoryCreate {
  name?: string;
  color?: string;
}

export interface CategoryPatch {
  name?: string;
  color?: string;
  sort_order?: number;
}

export interface MenuItemCreate {
  name?: string;
  category_id?: number | null;
  ingredients?: string[];
}

export interface MenuItemPatch {
  name?: string;
  category_id?: number | null;
  ingredients?: string[];
}

export interface PromptCreate {
  id: string;
  content: string;
  description?: string;
  version?: string;
  is_active?: number;
}

export interface PromptPatch {
  content?: string;
  version?: string;
  is_active?: number;
}

export interface ComboCreate {
  name: string;
  description?: string;
  item_ids?: number[];
}

export interface ComboPatch {
  name?: string;
  description?: string;
  is_active?: number;
  item_ids?: number[];
}
