import { apiGet, apiPost, apiPut, apiDelete } from "$lib/services/db";
import type { Category } from "$lib/types/models";

export async function fetchCategories(): Promise<Category[]> {
    try {
        return await apiGet<Category[]>("/api/categories");
    } catch {
        const saved = localStorage.getItem("menuCategories");
        return saved ? JSON.parse(saved) : [];
    }
}

export async function createCategory(name: string, color: string): Promise<Category | null> {
    try {
        return await apiPost<Category>("/api/categories", { name, color });
    } catch {
        return null;
    }
}

export async function updateCategory(
    id: number,
    data: { name?: string; color?: string; sort_order?: number },
): Promise<boolean> {
    try {
        return await apiPut(`/api/categories/${id}`, data);
    } catch {
        return false;
    }
}

export async function deleteCategory(id: number): Promise<boolean> {
    try {
        return await apiDelete(`/api/categories/${id}`);
    } catch {
        return false;
    }
}
