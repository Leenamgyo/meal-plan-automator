import { gql } from "$lib/services/graphql";
import type { MenuItem } from "$lib/types/models";

const MENU_ITEM_FIELDS = `id name category_id ingredients`;

export async function fetchMenuItems(): Promise<MenuItem[]> {
    try {
        const { menuItems } = await gql<{ menuItems: MenuItem[] }>(`
            query { menuItems { ${MENU_ITEM_FIELDS} } }
        `);
        return menuItems;
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
        const { createMenuItem } = await gql<{ createMenuItem: MenuItem }>(
            `mutation($input: MenuItemCreateInput!) {
                createMenuItem(input: $input) { ${MENU_ITEM_FIELDS} }
            }`,
            { input: data },
        );
        return createMenuItem;
    } catch {
        return null;
    }
}

export async function updateMenuItem(
    id: number,
    data: { name?: string; category_id?: number | null; ingredients?: string[] },
): Promise<boolean> {
    try {
        await gql<{ updateMenuItem: MenuItem | null }>(
            `mutation($id: Int!, $input: MenuItemPatchInput!) {
                updateMenuItem(id: $id, input: $input) { id }
            }`,
            { id, input: data },
        );
        return true;
    } catch {
        return false;
    }
}

export async function deleteMenuItem(id: number): Promise<boolean> {
    try {
        await gql<{ deleteMenuItem: boolean }>(
            `mutation($id: Int!) { deleteMenuItem(id: $id) }`,
            { id },
        );
        return true;
    } catch {
        return false;
    }
}
