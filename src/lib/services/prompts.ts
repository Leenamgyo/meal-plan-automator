import { gql } from "$lib/services/graphql";
import type { Prompt } from "$lib/types/models";

const PROMPT_FIELDS = `id version description content is_active`;

export async function fetchPrompts(): Promise<Prompt[]> {
    try {
        const { prompts } = await gql<{ prompts: Prompt[] }>(`
            query { prompts { ${PROMPT_FIELDS} } }
        `);
        return prompts;
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
        await gql<{ updatePrompt: Prompt | null }>(
            `mutation($id: ID!, $input: PromptPatchInput!) {
                updatePrompt(id: $id, input: $input) { id }
            }`,
            { id, input: data },
        );
        return true;
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
    // 충돌 시 GraphQLError 그대로 propagate (기존 REST 동작 유지)
    const { createPrompt } = await gql<{ createPrompt: Prompt }>(
        `mutation($input: PromptCreateInput!) {
            createPrompt(input: $input) { ${PROMPT_FIELDS} }
        }`,
        { input: data },
    );
    return createPrompt;
}

export async function deletePrompt(id: string): Promise<boolean> {
    try {
        await gql<{ deletePrompt: boolean }>(
            `mutation($id: ID!) { deletePrompt(id: $id) }`,
            { id },
        );
        return true;
    } catch {
        return false;
    }
}
