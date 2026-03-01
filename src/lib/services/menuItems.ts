import { apiGet, apiPost, apiPut, apiDelete } from "$lib/services/db";
import type { MenuItem } from "$lib/types/models";

export async function fetchMenuItems(): Promise<MenuItem[]> {
    try {
        return await apiGet<MenuItem[]>("/api/menu-items");
    } catch {
        const saved = localStorage.getItem("menuItems");
        return saved ? JSON.parse(saved) : [];
    }
}

export async function createMenuItem(data: {
    name: string;
    category_id: number | null;
    ingredients?: string[];
}): Promise<MenuItem | null> {
    try {
        return await apiPost<MenuItem>("/api/menu-items", data);
    } catch {
        return null;
    }
}

export async function updateMenuItem(
    id: number,
    data: { name?: string; category_id?: number | null; ingredients?: string[] },
): Promise<boolean> {
    try {
        return await apiPut(`/api/menu-items/${id}`, data);
    } catch {
        return false;
    }
}

export async function deleteMenuItem(id: number): Promise<boolean> {
    try {
        return await apiDelete(`/api/menu-items/${id}`);
    } catch {
        return false;
    }
}
