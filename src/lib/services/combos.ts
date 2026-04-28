import { gql } from "$lib/services/graphql";
import type { Combo } from "$lib/types/models";

const COMBO_FIELDS = `
    id name description is_active
    items { id name category_id ingredients }
`;

export async function fetchCombos(): Promise<Combo[]> {
    try {
        const { combos } = await gql<{ combos: Combo[] }>(`
            query { combos { ${COMBO_FIELDS} } }
        `);
        return combos ?? [];
    } catch {
        return [];
    }
}

export async function createCombo(data: {
    name: string;
    description?: string;
    item_ids?: number[];
}): Promise<Combo | null> {
    try {
        const { createCombo } = await gql<{ createCombo: Combo }>(
            `mutation($input: ComboCreateInput!) {
                createCombo(input: $input) { ${COMBO_FIELDS} }
            }`,
            { input: data },
        );
        return createCombo;
    } catch {
        return null;
    }
}

export async function updateCombo(
    id: number,
    data: { name?: string; description?: string; is_active?: number; item_ids?: number[] },
): Promise<boolean> {
    try {
        await gql<{ updateCombo: Combo | null }>(
            `mutation($id: Int!, $input: ComboPatchInput!) {
                updateCombo(id: $id, input: $input) { id }
            }`,
            { id, input: data },
        );
        return true;
    } catch {
        return false;
    }
}

export async function deleteCombo(id: number): Promise<boolean> {
    try {
        await gql<{ deleteCombo: boolean }>(
            `mutation($id: Int!) { deleteCombo(id: $id) }`,
            { id },
        );
        return true;
    } catch {
        return false;
    }
}
