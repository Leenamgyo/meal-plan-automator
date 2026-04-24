import { apiGet, apiPost, apiPut, apiDelete } from "$lib/services/db";
import type { Combo } from "$lib/types/models";

export async function fetchCombos(): Promise<Combo[]> {
    try {
        const data = await apiGet<Combo[]>("/api/combos");
        return data ?? [];
    } catch {
        return [];
    }
}

export async function createCombo(data: { name: string; description?: string; item_ids?: number[] }): Promise<Combo | null> {
    try {
        return await apiPost<Combo>("/api/combos", data);
    } catch {
        return null;
    }
}

export async function updateCombo(id: number, data: { name?: string; description?: string; is_active?: number; item_ids?: number[] }): Promise<boolean> {
    try {
        await apiPut(`/api/combos/${id}`, data);
        return true;
    } catch {
        return false;
    }
}

export async function deleteCombo(id: number): Promise<boolean> {
    try {
        await apiDelete(`/api/combos/${id}`);
        return true;
    } catch {
        return false;
    }
}
