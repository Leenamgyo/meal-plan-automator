import { apiGet, apiPost, apiPut, apiDelete } from "$lib/services/db";
import type { Prompt } from "$lib/types/models";

export async function fetchPrompts(): Promise<Prompt[]> {
    try {
        return await apiGet<Prompt[]>("/api/prompts");
    } catch {
        const saved = localStorage.getItem("prompts");
        return saved ? JSON.parse(saved) : [];
    }
}

export async function updatePrompt(
    id: string,
    data: { content?: string; version?: string; is_active?: number },
): Promise<boolean> {
    try {
        return await apiPut(`/api/prompts/${id}`, data);
    } catch {
        return false;
    }
}

export async function createPrompt(data: {
    id: string;
    description?: string;
    content: string;
    version?: string;
}): Promise<Prompt> {
    return apiPost<Prompt>("/api/prompts", data);
}

export async function deletePrompt(id: string): Promise<boolean> {
    try {
        return await apiDelete(`/api/prompts/${encodeURIComponent(id)}`);
    } catch {
        return false;
    }
}
