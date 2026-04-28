import { gql } from "$lib/services/graphql";
import type { MealEntry } from "$lib/types/models";

const FALLBACK_COLOR = "#ced4da";

interface MealDataRow {
    date: string;
    menus: Array<{ name: string; category_id: number | null; color: string | null }>;
}

/** 구형 string 항목을 MealEntry로 정규화 (마이그레이션 호환) */
function normalizeMeals(raw: unknown[]): MealEntry[] {
    return raw.map((item) => {
        if (typeof item === "string") {
            return { name: item, category_id: null, color: FALLBACK_COLOR };
        }
        const m = item as Partial<MealEntry> & { color?: string | null };
        return {
            name: m.name ?? "",
            category_id: m.category_id ?? null,
            color: m.color ?? FALLBACK_COLOR,
        };
    });
}

export async function fetchMealData(): Promise<Record<string, MealEntry[]>> {
    try {
        const { mealData } = await gql<{ mealData: MealDataRow[] }>(`
            query { mealData { date menus { name category_id color } } }
        `);
        const data: Record<string, MealEntry[]> = {};
        for (const r of mealData) {
            data[r.date] = normalizeMeals(r.menus || []);
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
        await gql<{ upsertMealData: { date: string } }>(
            `mutation($date: String!, $menus: [MealEntryInput!]!) {
                upsertMealData(date: $date, menus: $menus) { date }
            }`,
            { date, menus },
        );
        return true;
    } catch {
        return false;
    }
}
