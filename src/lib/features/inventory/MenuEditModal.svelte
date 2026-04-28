<script lang="ts">
    import type { Category, MenuItem } from "$lib/shared/types/models";

    interface EditData {
        name: string;
        category_id: number | null;
        ingredients: string[];
    }
    interface Props {
        item: MenuItem;
        categories: Category[];
        onsave: (id: number, data: EditData) => void;
        oncancel: () => void;
    }
    let { item, categories, onsave, oncancel }: Props = $props();

    let editName = $state(item.name);
    let editCategory = $state<number | null>(item.category_id);
    let editIngredients = $state<string[]>([...(item.ingredients || [])]);
    let editIngredientInput = $state("");

    function addEditIngredient() {
        const ing = editIngredientInput.trim();
        if (!ing || editIngredients.includes(ing)) return;
        editIngredients = [...editIngredients, ing];
        editIngredientInput = "";
    }
    function removeEditIngredient(ing: string) {
        editIngredients = editIngredients.filter((t) => t !== ing);
    }
    function save() {
        if (!editName.trim()) return;
        onsave(item.id, {
            name: editName.trim(),
            category_id: editCategory,
            ingredients: [...editIngredients],
        });
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
     onclick={oncancel}>
    <div class="bg-surface-container-lowest rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden"
         onclick={(e) => e.stopPropagation()}>
        <div class="p-8 space-y-5">
            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-headline font-extrabold tracking-tight text-on-surface">메뉴 편집</h2>
                <button class="p-2 hover:bg-surface-container-low rounded-full transition-colors" onclick={oncancel}>
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="space-y-4">
                <div class="space-y-1.5">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-outline">카테고리</span>
                    <select bind:value={editCategory}
                            class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all">
                        {#each categories as cat}
                            <option value={cat.id}>{cat.name}</option>
                        {/each}
                    </select>
                </div>
                <div class="space-y-1.5">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-outline">메뉴 이름</span>
                    <input type="text"
                           class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                           bind:value={editName} />
                </div>
                <div class="space-y-1.5">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-outline">재료</span>
                    <div class="flex gap-2">
                        <input type="text"
                               class="flex-1 bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                               placeholder="재료 추가..."
                               bind:value={editIngredientInput}
                               onkeydown={(e) => e.key === "Enter" && addEditIngredient()} />
                        <button class="w-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-md"
                                onclick={addEditIngredient}>
                            <span class="material-symbols-outlined">add</span>
                        </button>
                    </div>
                    <div class="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {#each editIngredients as ing}
                            <span class="px-2 py-1 bg-surface-container-low text-on-surface-variant rounded-md text-[10px] font-bold flex items-center gap-1">
                                {ing}
                                <button class="hover:text-error transition-colors" onclick={() => removeEditIngredient(ing)}>
                                    <span class="material-symbols-outlined" style="font-size:12px">close</span>
                                </button>
                            </span>
                        {/each}
                    </div>
                </div>
            </div>
            <div class="flex gap-3 pt-2">
                <button class="flex-1 py-3.5 bg-surface-container-low text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-high transition-all text-sm"
                        onclick={oncancel}>취소</button>
                <button class="flex-[2] py-3.5 bg-primary text-white font-bold rounded-2xl shadow-md shadow-primary/20 hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2"
                        onclick={save}>
                    <span class="material-symbols-outlined" style="font-size:18px">save</span>
                    저장
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e1e3e4; border-radius: 10px; }
</style>
