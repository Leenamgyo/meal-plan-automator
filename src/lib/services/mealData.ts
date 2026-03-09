import { apiGet, apiPost } from "$lib/services/db";
import type { MealRecord, MealEntry } from "$lib/types/models";

const FALLBACK_COLOR = "#ced4da";

/** 구형 string 항목을 MealEntry로 정규화 (마이그레이션 호환) */
function normalizeMeals(raw: unknown[]): MealEntry[] {
    return raw.map((item) => {
        if (typeof item === "string") {
            return { name: item, category_id: null, color: FALLBACK_COLOR };
        }
        return item as MealEntry;
    });
}

export async function fetchMealData(): Promise<Record<string, MealEntry[]>> {
    try {
        const rows = await apiGet<MealRecord[]>("/api/meal-data");
        const data: Record<string, MealEntry[]> = {};
        for (const r of rows) {
            data[r.date] = normalizeMeals((r.menus as unknown[]) || []);
        }
        return data;
    } catch {
        const saved = localStorage.getItem("mealData");
        if (!saved) return {};
        const parsed: Record<string, unknown[]> = JSON.parse(saved);
        return Object.fromEntries(
            Object.entries(parsed).map(([d, m]) => [d, normalizeMeals(m)]),
        );
    }
}

export async function saveMealForDate(date: string, menus: MealEntry[]): Promise<boolean> {
    try {
        await apiPost("/api/meal-data", { date, menus });
        return true;
    } catch {
        return false;
    }
}
