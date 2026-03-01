/**
 * DB 스키마와 1:1 대응하는 핵심 도메인 모델
 */

export interface Category {
    id: number;
    name: string;
    color: string;
    sort_order?: number;
}

export interface MenuItem {
    id: number;
    name: string;
    category_id: number | null;
    ingredients: string[];
}

export interface MealRecord {
    id?: number;
    date: string;
    menus: string[];
}

export interface Prompt {
    id: string;
    version: string;
    description: string;
    content: string;
    is_active: number;
}
