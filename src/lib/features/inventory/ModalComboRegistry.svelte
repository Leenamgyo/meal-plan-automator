<script lang="ts">
    import { createCombo } from "$lib/features/combo/api";
    import { showSuccess } from "$lib/shared/stores";
    import { hangulIncludes } from "$lib/shared/utils/hangul";
    import type { MenuItem, Combo } from "$lib/shared/types/models";

    interface Props {
        menuItems?: MenuItem[];
        onsaved: (combo: Combo) => void;
        onclose: () => void;
    }
    let { menuItems = [], onsaved, onclose }: Props = $props();

    let comboName = $state("");
    let comboDescription = $state("");
    let searchInput = $state("");
    let selectedItems = $state<MenuItem[]>([]);
    let isSaving = $state(false);

    const filteredMenuItems = $derived(
        menuItems.filter((item) => {
            if (!searchInput) return true;
            return hangulIncludes(item.name, searchInput);
        })
    );

    function toggleItem(item: MenuItem) {
        if (selectedItems.some((s) => s.id === item.id)) {
            selectedItems = selectedItems.filter((s) => s.id !== item.id);
        } else {
            selectedItems = [...selectedItems, item];
        }
    }

    function removeItem(id: number) {
        selectedItems = selectedItems.filter((s) => s.id !== id);
    }

    async function handleSave() {
        if (!comboName.trim() || selectedItems.length === 0 || isSaving) return;
        isSaving = true;
        try {
            const saved = await createCombo({
                name: comboName.trim(),
                description: comboDescription.trim(),
                item_ids: selectedItems.map((s) => s.id),
            });
            if (saved) {
                showSuccess(`${comboName.trim()} 콤보 등록 완료`);
                onsaved(saved);
            }
        } finally {
            isSaving = false;
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    onclick={onclose}
>
    <div
        class="bg-surface-container-lowest rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden"
        onclick={(e) => e.stopPropagation()}
    >
        <div class="p-8">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-headline font-extrabold tracking-tight text-on-surface">콤보 메뉴 등록</h2>
                <button
                    class="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                    onclick={onclose}
                >
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <div class="grid grid-cols-2 gap-6">
                <!-- Left: Form + Menu picker -->
                <div class="space-y-4">
                    <div class="space-y-1.5">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-outline">콤보 이름</span>
                        <input
                            type="text"
                            class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                            placeholder="예: 한식 세트"
                            bind:value={comboName}
                        />
                    </div>

                    <div class="space-y-1.5">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-outline">설명 (선택)</span>
                        <input
                            type="text"
                            class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                            placeholder="콤보 설명..."
                            bind:value={comboDescription}
                        />
                    </div>

                    <!-- Menu search -->
                    <div class="space-y-1.5">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-outline">메뉴 선택</span>
                        <div class="relative">
                            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
                            <input
                                type="text"
                                class="w-full bg-surface-container-low rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                                placeholder="메뉴 검색..."
                                bind:value={searchInput}
                            />
                        </div>
                        <div class="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                            {#each filteredMenuItems as item}
                                {@const isSelected = selectedItems.some((s) => s.id === item.id)}
                                <button
                                    class="w-full text-left p-2.5 rounded-xl text-sm flex items-center justify-between transition-all
                                           {isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container-low text-on-surface'}"
                                    onclick={() => toggleItem(item)}
                                >
                                    <span>{item.name}</span>
                                    {#if isSelected}
                                        <span class="material-symbols-outlined" style="font-size:16px">check</span>
                                    {:else}
                                        <span class="material-symbols-outlined text-outline" style="font-size:16px">add</span>
                                    {/if}
                                </button>
                            {/each}
                            {#if filteredMenuItems.length === 0}
                                <p class="text-center py-4 text-on-surface-variant text-sm">검색 결과 없음</p>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Right: Selected items -->
                <div class="space-y-4">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-outline">선택된 메뉴</span>
                        <span class="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black rounded-full">{selectedItems.length}개</span>
                    </div>

                    {#if selectedItems.length === 0}
                        <div class="flex flex-col items-center justify-center py-12 text-center bg-surface-container-low rounded-2xl">
                            <span class="material-symbols-outlined text-outline/40 text-3xl mb-2">restaurant_menu</span>
                            <p class="text-sm text-on-surface-variant">좌측에서 메뉴를 선택하세요</p>
                        </div>
                    {:else}
                        <div class="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {#each selectedItems as item}
                                <div class="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                                    <span class="text-sm font-bold text-on-surface">{item.name}</span>
                                    <button
                                        class="p-1 text-outline hover:text-error transition-colors rounded"
                                        onclick={() => removeItem(item.id)}
                                    >
                                        <span class="material-symbols-outlined" style="font-size:16px">close</span>
                                    </button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-6 border-t border-surface-container-high mt-6">
                <button
                    class="flex-1 py-3.5 bg-surface-container-low text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-high transition-all text-sm"
                    onclick={onclose}
                >취소</button>
                <button
                    class="flex-[2] py-3.5 bg-primary text-white font-bold rounded-2xl shadow-md shadow-primary/20 hover:opacity-90 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    onclick={handleSave}
                    disabled={!comboName.trim() || selectedItems.length === 0 || isSaving}
                >
                    <span class="material-symbols-outlined" style="font-size:18px">{isSaving ? 'progress_activity' : 'save'}</span>
                    {isSaving ? '저장 중...' : '콤보 등록'}
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
