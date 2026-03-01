import { apiGet, apiPost } from "$lib/services/db";
import type { MealRecord } from "$lib/types/models";

export async function fetchMealData(): Promise<Record<string, string[]>> {
    try {
        const rows = await apiGet<MealRecord[]>("/api/meal-data");
        const data: Record<string, string[]> = {};
        for (const r of rows) {
            data[r.date] = r.menus || [];
        }
        return data;
    } catch {
        const saved = localStorage.getItem("mealData");
        return saved ? JSON.parse(saved) : {};
    }
}

export async function saveMealForDate(date: string, menus: string[]): Promise<boolean> {
    try {
        await apiPost("/api/meal-data", { date, menus });
        return true;
    } catch {
        return false;
    }
}
