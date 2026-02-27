/**
 * SQLite DB 클라이언트 서비스
 * main.cjs의 로컬 HTTP 서버 REST API를 호출합니다.
 * API 실패 시 localStorage fallback으로 동작합니다.
 */

const API_BASE = ''; // same origin (localhost:3737)

export interface Category {
    id: number;
    name: string;
    color: string;
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

// ===================== Categories =====================

export async function fetchCategories(): Promise<Category[]> {
    try {
        const res = await fetch(`${API_BASE}/api/categories`);
        if (!res.ok) throw new Error('fetch failed');
        return await res.json();
    } catch {
        return getLocalCategories();
    }
}

export async function createCategory(name: string, color: string): Promise<Category | null> {
    try {
        const res = await fetch(`${API_BASE}/api/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color }),
        });
        if (!res.ok) throw new Error('create failed');
        return await res.json();
    } catch {
        return null;
    }
}

export async function updateCategory(id: number, data: { name?: string; color?: string }): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/api/categories/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function deleteCategory(id: number): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/api/categories/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch {
        return false;
    }
}

// ===================== Menu Items =====================

export async function fetchMenuItems(): Promise<MenuItem[]> {
    try {
        const res = await fetch(`${API_BASE}/api/menu-items`);
        if (!res.ok) throw new Error('fetch failed');
        return await res.json();
    } catch {
        return getLocalMenuItems();
    }
}

export async function createMenuItem(data: { name: string; category_id: number | null; ingredients?: string[] }): Promise<MenuItem | null> {
    try {
        const res = await fetch(`${API_BASE}/api/menu-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('create failed');
        return await res.json();
    } catch {
        return null;
    }
}

export async function updateMenuItem(id: number, data: { name?: string; category_id?: number | null; ingredients?: string[] }): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/api/menu-items/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function deleteMenuItem(id: number): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/api/menu-items/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch {
        return false;
    }
}

// ===================== Meal Data =====================

export async function fetchMealData(): Promise<Record<string, string[]>> {
    try {
        const res = await fetch(`${API_BASE}/api/meal-data`);
        if (!res.ok) throw new Error('fetch failed');
        const rows: MealRecord[] = await res.json();
        const data: Record<string, string[]> = {};
        for (const r of rows) {
            data[r.date] = r.menus || [];
        }
        return data;
    } catch {
        return getLocalMealData();
    }
}

export async function saveMealForDate(date: string, menus: string[]): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/api/meal-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, menus }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

// ===================== localStorage Fallback =====================

function getLocalCategories(): Category[] {
    const saved = localStorage.getItem('menuCategories');
    return saved ? JSON.parse(saved) : [];
}

function getLocalMenuItems(): MenuItem[] {
    const saved = localStorage.getItem('menuItems');
    return saved ? JSON.parse(saved) : [];
}

function getLocalMealData(): Record<string, string[]> {
    const saved = localStorage.getItem('mealData');
    return saved ? JSON.parse(saved) : {};
}
