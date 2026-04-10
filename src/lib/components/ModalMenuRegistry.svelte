<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { createMenuItem } from "$lib/services/menuItems";
    import { suggestIngredients } from "$lib/services/mealService";
    import { geminiKey, aiIngredientsEnabled, showSuccess } from "$lib/stores";
    import type { Category, MenuItem } from "$lib/types/models";

    export let categories: Category[] = [];
    export let menuItems: MenuItem[] = [];

    const dispatch = createEventDispatcher<{ saved: MenuItem; close: void }>();

    const ICONS = ["rice_bowl", "soup_kitchen", "restaurant", "spa", "eco", "lunch_dining", "ramen_dining", "bakery_dining"];

    let selectedIcon = "rice_bowl";
    let menuName = "";
    let selectedCategory: number | null = null;
    let ingredientInput = "";
    let ingredients: string[] = [];
    let isAiLoading = false;
    let isSaving = false;

    $: if (categories.length > 0 && selectedCategory === null) {
        selectedCategory = categories[0].id;
    }

    $: isDuplicate = menuName.trim()
        ? menuItems.some((m) => m.name.toLowerCase() === menuName.trim().toLowerCase())
        : false;

    function addIngredient() {
        const ing = ingredientInput.trim();
        if (!ing || ingredients.includes(ing)) return;
        ingredients = [...ingredients, ing];
        ingredientInput = "";
    }

    async function handleAiSuggest() {
        const apiKey = $geminiKey;
        if (!menuName.trim() || !apiKey || isAiLoading) return;
        isAiLoading = true;
        try {
            const suggested = await suggestIngredients(menuName.trim(), apiKey);
            for (const ing of suggested) {
                if (!ingredients.includes(ing)) ingredients = [...ingredients, ing];
            }
        } finally {
            isAiLoading = false;
        }
    }

    async function handleSave() {
        if (!menuName.trim() || isDuplicate || isSaving) return;
        isSaving = true;
        try {
            const data = { name: menuName.trim(), category_id: selectedCategory, ingredients: [...ingredients] };
            const saved = await createMenuItem(data);
            if (saved) {
                showSuccess(`${menuName.trim()} 등록 완료`);
                dispatch("saved", { id: saved.id || Date.now(), ...data });
            }
        } finally {
            isSaving = false;
        }
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    on:click={() => dispatch("close")}
>
    <div
        class="bg-surface-container-lowest rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden"
        on:click|stopPropagation
    >
        <div class="p-8 space-y-5">
            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-headline font-extrabold tracking-tight text-on-surface">단품 메뉴 등록</h2>
                <button
                    class="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                    on:click={() => dispatch("close")}
                >
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <!-- Icon picker -->
            <div class="space-y-1.5">
                <span class="text-[10px] font-bold uppercase tracking-widest text-outline">아이콘</span>
                <div class="flex gap-2 flex-wrap">
                    {#each ICONS as icon}
                        <button
                            class="w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                   {selectedIcon === icon ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}"
                            on:click={() => (selectedIcon = icon)}
                        >
                            <span class="material-symbols-outlined" style="font-size:20px">{icon}</span>
                        </button>
                    {/each}
                </div>
            </div>

            <!-- Category -->
            <div class="space-y-1.5">
                <span class="text-[10px] font-bold uppercase tracking-widest text-outline">카테고리</span>
                <select
                    bind:value={selectedCategory}
                    class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                >
                    {#each categories as cat}
                        <option value={cat.id}>{cat.name}</option>
                    {/each}
                </select>
            </div>

            <!-- Name -->
            <div class="space-y-1.5">
                <span class="text-[10px] font-bold uppercase tracking-widest text-outline">메뉴 이름</span>
                <input
                    type="text"
                    class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 transition-all
                           {isDuplicate ? 'ring-2 ring-error/30 focus:ring-error/30' : 'focus:ring-primary/10'}"
                    placeholder="예: 아보카도 샐러드"
                    bind:value={menuName}
                />
                {#if isDuplicate}
                    <p class="text-[10px] text-error font-bold">이미 존재하는 메뉴입니다.</p>
                {/if}
            </div>

            <!-- AI suggest -->
            {#if $aiIngredientsEnabled && menuName.trim() && !isDuplicate}
                <button
                    class="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-primary/10 transition-all"
                    on:click={handleAiSuggest}
                    disabled={isAiLoading}
                >
                    <span class="material-symbols-outlined text-sm">{isAiLoading ? 'progress_activity' : 'auto_awesome'}</span>
                    {isAiLoading ? '분석 중...' : 'AI 재료 추천'}
                </button>
            {/if}

            <!-- Ingredients -->
            <div class="space-y-1.5">
                <span class="text-[10px] font-bold uppercase tracking-widest text-outline">재료</span>
                <div class="flex gap-2">
                    <input
                        type="text"
                        class="flex-1 bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                        placeholder="재료 추가..."
                        bind:value={ingredientInput}
                        on:keydown={(e) => e.key === "Enter" && addIngredient()}
                    />
                    <button
                        class="w-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-md"
                        on:click={addIngredient}
                    >
                        <span class="material-symbols-outlined">add</span>
                    </button>
                </div>
                {#if ingredients.length > 0}
                    <div class="flex flex-wrap gap-1.5 mt-2">
                        {#each ingredients as ing}
                            <span class="px-2 py-1 bg-surface-container-low text-on-surface-variant rounded-md text-[10px] font-bold flex items-center gap-1">
                                {ing}
                                <button
                                    class="hover:text-error transition-colors"
                                    on:click={() => (ingredients = ingredients.filter((t) => t !== ing))}
                                >
                                    <span class="material-symbols-outlined" style="font-size:12px">close</span>
                                </button>
                            </span>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
                <button
                    class="flex-1 py-3.5 bg-surface-container-low text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-high transition-all text-sm"
                    on:click={() => dispatch("close")}
                >취소</button>
                <button
                    class="flex-[2] py-3.5 bg-primary text-white font-bold rounded-2xl shadow-md shadow-primary/20 hover:opacity-90 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    on:click={handleSave}
                    disabled={!menuName.trim() || isDuplicate || isSaving}
                >
                    <span class="material-symbols-outlined" style="font-size:18px">{isSaving ? 'progress_activity' : 'save'}</span>
                    {isSaving ? '저장 중...' : '메뉴 등록'}
                </button>
            </div>
        </div>
    </div>
</div>
