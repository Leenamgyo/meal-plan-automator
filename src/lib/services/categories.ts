import { gql } from "$lib/services/graphql";
import type { Category } from "$lib/types/models";

const CATEGORY_FIELDS = `id name color sort_order`;

export async function fetchCategories(): Promise<Category[]> {
    try {
        const { categories } = await gql<{ categories: Category[] }>(`
            query { categories { ${CATEGORY_FIELDS} } }
        `);
        return categories;
    } catch {
        const saved = localStorage.getItem("menuCategories");
        return saved ? JSON.parse(saved) : [];
    }
}

export async function createCategory(name: string, color: string): Promise<Category | null> {
    try {
        const { createCategory } = await gql<{ createCategory: Category }>(
            `mutation($input: CategoryCreateInput!) {
                createCategory(input: $input) { ${CATEGORY_FIELDS} }
            }`,
            { input: { name, color } },
        );
        return createCategory;
    } catch {
        return null;
    }
}

export async function updateCategory(
    id: number,
    data: { name?: string; color?: string; sort_order?: number },
): Promise<boolean> {
    try {
        await gql<{ updateCategory: Category | null }>(
            `mutation($id: Int!, $input: CategoryPatchInput!) {
                updateCategory(id: $id, input: $input) { id }
            }`,
            { id, input: data },
        );
        return true;
    } catch {
        return false;
    }
}

export async function deleteCategory(id: number): Promise<boolean> {
    try {
        await gql<{ deleteCategory: boolean }>(
            `mutation($id: Int!) { deleteCategory(id: $id) }`,
            { id },
        );
        return true;
    } catch {
        return false;
    }
}
