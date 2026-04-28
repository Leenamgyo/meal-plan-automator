<script lang="ts">
    import type { Category, Combo, MenuItem } from "$lib/shared/types/models";

    interface EditData {
        name: string;
        description: string;
        item_ids: number[];
    }
    interface Props {
        combo: Combo;
        categories: Category[];
        menuItems: MenuItem[];
        onsave: (id: number, data: EditData) => void;
        oncancel: () => void;
    }
    let { combo, categories, menuItems, onsave, oncancel }: Props = $props();

    let editName = $state(combo.name);
    let editDesc = $state(combo.description ?? "");
    let editItemIds = $state<number[]>((combo.items ?? []).map((i) => i.id));
    let itemSearch = $state("");

    function toggleItem(id: number) {
        editItemIds = editItemIds.includes(id)
            ? editItemIds.filter((x) => x !== id)
            : [...editItemIds, id];
    }

    function save() {
        if (!editName.trim()) return;
        onsave(combo.id, {
            name: editName.trim(),
            description: editDesc.trim(),
            item_ids: editItemIds,
        });
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
     onclick={oncancel}>
    <div class="bg-surface-container-lowest rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
         style="max-height: 85vh"
         onclick={(e) => e.stopPropagation()}>
        <div class="p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-headline font-extrabold tracking-tight text-on-surface">콤보 편집</h2>
                <button class="p-2 hover:bg-surface-container-low rounded-full transition-colors" onclick={oncancel}>
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <div class="space-y-1.5">
                <span class="text-[10px] font-bold uppercase tracking-widest text-outline">콤보 이름</span>
                <input type="text"
                       class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                       bind:value={editName} />
            </div>

            <div class="space-y-1.5">
                <span class="text-[10px] font-bold uppercase tracking-widest text-outline">설명</span>
                <textarea
                    class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                    rows="2"
                    bind:value={editDesc}
                    placeholder="콤보 설명 (선택)"
                ></textarea>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-outline">구성 메뉴</span>
                    <span class="text-xs font-bold text-primary">{editItemIds.length}개 선택됨</span>
                </div>
                <input type="text"
                       class="w-full bg-surface-container-low rounded-xl py-2.5 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                       placeholder="메뉴 검색..."
                       bind:value={itemSearch} />
                <div class="max-h-52 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {#each categories as cat}
                        {@const catItems = menuItems.filter((m) =>
                            m.category_id === cat.id &&
                            (!itemSearch || m.name.includes(itemSearch))
                        )}
                        {#if catItems.length > 0}
                            <div class="mb-2">
                                <p class="text-[10px] font-black uppercase tracking-widest px-1 mb-1"
                                   style="color: {cat.color}">{cat.name}</p>
                                <div class="flex flex-wrap gap-1.5">
                                    {#each catItems as item}
                                        {@const selected = editItemIds.includes(item.id)}
                                        <button
                                            class="px-3 py-1 rounded-full text-xs font-bold transition-all border-2"
                                            style={selected
                                                ? `background-color:${cat.color}; color:white; border-color:${cat.color}`
                                                : `background-color:${cat.color}15; color:${cat.color}; border-color:transparent`}
                                            onclick={() => toggleItem(item.id)}
                                        >{item.name}</button>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        </div>

        <div class="flex gap-3 p-6 pt-0 flex-shrink-0">
            <button class="flex-1 py-3.5 bg-surface-container-low text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-high transition-all text-sm"
                    onclick={oncancel}>취소</button>
            <button class="flex-[2] py-3.5 bg-primary text-white font-bold rounded-2xl shadow-md shadow-primary/20 hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2"
                    onclick={save}
                    disabled={!editName.trim() || editItemIds.length === 0}>
                <span class="material-symbols-outlined" style="font-size:18px">save</span>
                저장
            </button>
        </div>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e1e3e4; border-radius: 10px; }
</style>
