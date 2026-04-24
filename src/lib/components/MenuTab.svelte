<script lang="ts">
    import { onMount } from "svelte";
    import { hangulIncludes } from "$lib/utils/hangul";
    import { fetchCategories } from "$lib/services/categories";
    import { fetchMenuItems, updateMenuItem, deleteMenuItem } from "$lib/services/menuItems";
    import { fetchCombos, deleteCombo, updateCombo } from "$lib/services/combos";
    import type { Category, MenuItem, Combo } from "$lib/types/models";
    import { showSuccess, showConfirm } from "$lib/stores";

    import ModalNewEntrySelection from "./ModalNewEntrySelection.svelte";
    import ModalMenuRegistry from "./ModalMenuRegistry.svelte";
    import ModalComboRegistry from "./ModalComboRegistry.svelte";

    let menuItems: MenuItem[] = [];
    let categories: Category[] = [];
    let combos: Combo[] = [];
    let searchInput = "";
    let activeCategoryFilter: number | null = null;
    let showComboOnly = false;
    let density = 1;
    let activeFilter: "all" | "active" | "inactive" = "all";

    // inactive set — localStorage persisted
    let inactiveIds = new Set<number>();

    // Modal state
    let showSelectionModal = false;
    let showMenuModal = false;
    let showComboModal = false;

    // Menu edit modal
    let editingId: number | null = null;
    let editName = "";
    let editCategory: number | null = null;
    let editIngredientInput = "";
    let editIngredients: string[] = [];

    // Combo edit modal
    let editingComboId: number | null = null;
    let editComboName = "";
    let editComboDesc = "";
    let editComboItemIds: number[] = [];
    let comboItemSearch = "";

    // ── Derived ───────────────────────────────────────────────
    $: activeCount = menuItems.filter((m) => !inactiveIds.has(m.id)).length;

    $: filteredItems = menuItems.filter((item) => {
        if (showComboOnly) return false;
        const isActive = !inactiveIds.has(item.id);
        if (activeFilter === "active" && !isActive) return false;
        if (activeFilter === "inactive" && isActive) return false;
        const catName = categories.find((c) => c.id === item.category_id)?.name || "";
        const matchSearch =
            !searchInput ||
            hangulIncludes(item.name, searchInput) ||
            hangulIncludes(catName, searchInput) ||
            (item.ingredients || []).some((t) => hangulIncludes(t, searchInput));
        const matchCat = activeCategoryFilter === null || item.category_id === activeCategoryFilter;
        return matchSearch && matchCat;
    });

    $: filteredCombos = combos.filter((combo) => {
        if (activeCategoryFilter !== null && !showComboOnly) return false;
        if (!searchInput) return true;
        return hangulIncludes(combo.name, searchInput);
    });

    $: gridClass =
        density === 1
            ? "grid-cols-3 lg:grid-cols-5 gap-2"
            : "grid-cols-2 lg:grid-cols-4 gap-4";

    // ── Mount ─────────────────────────────────────────────────
    onMount(async () => {
        [categories, menuItems, combos] = await Promise.all([
            fetchCategories(),
            fetchMenuItems(),
            fetchCombos(),
        ]);
        const saved = localStorage.getItem("inactiveMenuIds");
        if (saved) inactiveIds = new Set(JSON.parse(saved));
    });

    // ── Helpers ───────────────────────────────────────────────
    function getCategoryColor(catId: number | null) {
        return categories.find((c) => c.id === catId)?.color || "#9e9e9e";
    }
    function getCategoryName(catId: number | null) {
        return categories.find((c) => c.id === catId)?.name || "미분류";
    }

    function toggleActive(id: number) {
        if (inactiveIds.has(id)) inactiveIds.delete(id);
        else inactiveIds.add(id);
        inactiveIds = new Set(inactiveIds);
        localStorage.setItem("inactiveMenuIds", JSON.stringify([...inactiveIds]));
    }

    // ── Modal handlers ────────────────────────────────────────
    function onNewEntrySelect(e: CustomEvent<"menu" | "combo">) {
        showSelectionModal = false;
        if (e.detail === "menu") showMenuModal = true;
        else showComboModal = true;
    }

    function onMenuSaved(e: CustomEvent<MenuItem>) {
        menuItems = [...menuItems, e.detail];
        showMenuModal = false;
    }

    function onComboSaved(e: CustomEvent<Combo>) {
        combos = [...combos, e.detail];
        showComboModal = false;
    }

    // ── Delete ────────────────────────────────────────────────
    async function removeMenu(id: number) {
        const ok = await showConfirm("메뉴를 삭제하시겠습니까?", "삭제한 메뉴는 복구할 수 없습니다.");
        if (!ok) return;
        menuItems = menuItems.filter((m) => m.id !== id);
        deleteMenuItem(id);
        showSuccess("메뉴가 삭제되었습니다.");
    }

    async function removeCombo(id: number) {
        const ok = await showConfirm("콤보를 삭제하시겠습니까?", "삭제한 콤보는 복구할 수 없습니다.");
        if (!ok) return;
        combos = combos.filter((c) => c.id !== id);
        deleteCombo(id);
        showSuccess("콤보가 삭제되었습니다.");
    }

    // ── Edit ──────────────────────────────────────────────────
    function startEdit(item: MenuItem) {
        editingId = item.id;
        editName = item.name;
        editCategory = item.category_id;
        editIngredients = [...(item.ingredients || [])];
        editIngredientInput = "";
    }
    function cancelEdit() { editingId = null; }
    function addEditIngredient() {
        const ing = editIngredientInput.trim();
        if (!ing || editIngredients.includes(ing)) return;
        editIngredients = [...editIngredients, ing];
        editIngredientInput = "";
    }
    function removeEditIngredient(ing: string) {
        editIngredients = editIngredients.filter((t) => t !== ing);
    }
    function saveEdit() {
        if (!editingId || !editName.trim()) return;
        const data = { name: editName.trim(), category_id: editCategory, ingredients: [...editIngredients] };
        menuItems = menuItems.map((m) => (m.id === editingId ? { ...m, ...data } : m));
        updateMenuItem(editingId, data);
        editingId = null;
        showSuccess("수정 완료");
    }

    // ── Combo Edit ────────────────────────────────────────────
    function startEditCombo(combo: Combo) {
        editingComboId = combo.id;
        editComboName = combo.name;
        editComboDesc = combo.description ?? "";
        editComboItemIds = (combo.items ?? []).map((i) => i.id);
        comboItemSearch = "";
    }
    function cancelEditCombo() { editingComboId = null; }
    function toggleComboItem(id: number) {
        editComboItemIds = editComboItemIds.includes(id)
            ? editComboItemIds.filter((x) => x !== id)
            : [...editComboItemIds, id];
    }
    async function saveEditCombo() {
        if (!editingComboId || !editComboName.trim()) return;
        const ok = await updateCombo(editingComboId, {
            name: editComboName.trim(),
            description: editComboDesc.trim(),
            item_ids: editComboItemIds,
        });
        if (ok) {
            combos = combos.map((c) =>
                c.id === editingComboId
                    ? {
                          ...c,
                          name: editComboName.trim(),
                          description: editComboDesc.trim(),
                          items: menuItems.filter((m) =>
                              editComboItemIds.includes(m.id),
                          ),
                      }
                    : c,
            );
            editingComboId = null;
            showSuccess("콤보 수정 완료");
        }
    }
</script>

<div class="flex flex-col h-full overflow-hidden bg-surface no-drag">
    <div class="flex-1 overflow-y-auto custom-scrollbar px-8 py-8">
        <div class="max-w-7xl mx-auto">

            <!-- Header -->
            <div class="mb-8">
                <span class="text-[10px] font-bold text-primary uppercase tracking-widest">Inventory</span>
                <h1 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mt-1">메뉴 관리</h1>
                <p class="text-sm text-on-surface-variant mt-1">단품 메뉴와 콤보를 통합 관리합니다</p>
            </div>

            <!-- Stats row -->
            <div class="grid grid-cols-3 gap-5 mb-8">
                <div class="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
                    <p class="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">총 인벤토리</p>
                    <div class="flex items-end justify-between">
                        <span class="text-4xl font-extrabold text-primary">{menuItems.length + combos.length}</span>
                        <span class="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">항목</span>
                    </div>
                </div>
                <div class="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
                    <p class="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">활성 메뉴</p>
                    <div class="flex items-end justify-between">
                        <span class="text-4xl font-extrabold text-secondary">{activeCount}</span>
                        <span class="material-symbols-outlined text-secondary" style="font-size:24px">check_circle</span>
                    </div>
                </div>
                <div class="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
                    <p class="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-2">콤보 구성</p>
                    <div class="flex items-end justify-between">
                        <span class="text-4xl font-extrabold text-tertiary">{combos.length}</span>
                        <span class="material-symbols-outlined text-tertiary" style="font-size:24px">restaurant_menu</span>
                    </div>
                </div>
            </div>

            <!-- Search + Density + Filters -->
            <div class="flex flex-col gap-4 mb-8">
                <div class="flex items-center gap-4">
                    <!-- Search -->
                    <div class="relative flex-1 max-w-sm">
                        <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" style="font-size:20px">search</span>
                        <input
                            class="w-full pl-12 pr-4 py-3 bg-surface-container-high rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all text-sm placeholder:text-on-surface-variant/60"
                            placeholder="메뉴 검색..."
                            type="text"
                            bind:value={searchInput}
                        />
                    </div>
                    <!-- Active filter dropdown -->
                    <select
                        bind:value={activeFilter}
                        class="bg-surface-container-low px-3 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant outline-none cursor-pointer hover:bg-surface-container-high transition-colors"
                    >
                        <option value="all">전체</option>
                        <option value="active">사용</option>
                        <option value="inactive">비사용</option>
                    </select>
                    <!-- Density -->
                    <div class="flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-xl">
                        <span class="material-symbols-outlined text-on-surface-variant" style="font-size:18px">grid_view</span>
                        <input
                            type="range" min="1" max="2" step="1"
                            bind:value={density}
                            class="w-16 h-1.5 bg-outline-variant/30 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span class="text-[10px] font-black text-on-surface-variant w-6">
                            {density === 1 ? "XS" : "SM"}
                        </span>
                    </div>
                </div>

                <!-- Category filters + Combo toggle -->
                <div class="flex items-center gap-2 overflow-x-auto pb-1 no-drag">
                    <button
                        class="px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0
                               {activeCategoryFilter === null && !showComboOnly ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}"
                        on:click={() => { activeCategoryFilter = null; showComboOnly = false; }}
                    >전체</button>
                    {#each categories as cat}
                        <button
                            class="px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0
                                   {activeCategoryFilter === cat.id ? 'text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}"
                            style={activeCategoryFilter === cat.id ? `background-color: ${cat.color}` : ""}
                            on:click={() => { activeCategoryFilter = activeCategoryFilter === cat.id ? null : cat.id; showComboOnly = false; }}
                        >{cat.name}</button>
                    {/each}
                    <!-- Combo filter -->
                    <button
                        class="px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1.5
                               {showComboOnly ? 'bg-secondary text-white shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}"
                        on:click={() => { showComboOnly = !showComboOnly; activeCategoryFilter = null; }}
                    >
                        <span class="material-symbols-outlined" style="font-size:16px">restaurant_menu</span>
                        콤보 전용
                    </button>
                </div>
            </div>

            <!-- Grid -->
            <div class="grid {gridClass}">
                <!-- Add new card -->
                <button
                    class="bg-surface-container-low border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-surface-container-high transition-all group min-h-[220px]"
                    on:click={() => (showSelectionModal = true)}
                >
                    <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-primary" style="font-size:28px">add</span>
                    </div>
                    <div class="text-center px-4">
                        <span class="block font-bold text-on-surface">새 항목 추가</span>
                        <span class="text-sm text-on-surface-variant">단품 또는 콤보 등록</span>
                    </div>
                </button>

                <!-- Combo cards -->
                {#if !activeCategoryFilter}
                    {#each filteredCombos as combo (combo.id)}
                        {@const hasInactive = combo.items.some(i => inactiveIds.has(i.id))}
                        <div class="bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col {hasInactive ? 'opacity-60' : ''}">
                            <div class="relative flex items-center justify-center overflow-hidden"
                                 style="aspect-ratio:4/3; background: linear-gradient(135deg, #13696420 0%, #13696408 100%)">
                                <span class="material-symbols-outlined" style="font-size:{density === 1 ? '28' : '40'}px; color:#13696440">restaurant_menu</span>
                                <!-- COMBO / 비활성 badge -->
                                <div class="absolute top-3 left-3 flex gap-1">
                                    <div class="px-2 py-0.5 bg-secondary text-white text-[9px] font-black uppercase rounded-full tracking-widest">COMBO</div>
                                    {#if hasInactive}
                                        <div class="px-2 py-0.5 bg-error text-white text-[9px] font-black uppercase rounded-full tracking-widest">비활성 포함</div>
                                    {/if}
                                </div>
                                <div class="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        class="p-2 bg-white/90 backdrop-blur shadow-sm text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                                        on:click={() => startEditCombo(combo)}
                                        title="편집"
                                    >
                                        <span class="material-symbols-outlined" style="font-size:18px">edit</span>
                                    </button>
                                    <button
                                        class="p-2 bg-white/90 backdrop-blur shadow-sm text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-xl transition-colors"
                                        on:click={() => removeCombo(combo.id)}
                                        title="삭제"
                                    >
                                        <span class="material-symbols-outlined" style="font-size:18px">delete</span>
                                    </button>
                                </div>
                            </div>
                            <div class="p-5 flex flex-col flex-1">
                                <h3 class="font-headline font-bold text-on-surface mb-1 {density === 1 ? 'text-xs' : 'text-base'}">{combo.name}</h3>
                                {#if combo.description}
                                    <p class="text-sm text-on-surface-variant mb-2">{combo.description}</p>
                                {/if}
                                <div class="flex flex-wrap gap-1 mt-auto">
                                    {#each combo.items as item}
                                        {@const itemInactive = inactiveIds.has(item.id)}
                                        <span class="px-2 py-0.5 text-[9px] font-bold rounded-md {itemInactive ? 'line-through opacity-50' : ''}"
                                              style="background-color:{getCategoryColor(item.category_id)}15; color:{getCategoryColor(item.category_id)}">
                                            {item.name}
                                        </span>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}

                <!-- Menu cards -->
                {#each filteredItems as item (item.id)}
                    {@const color = getCategoryColor(item.category_id)}
                    {@const isActive = !inactiveIds.has(item.id)}
                    <div class="bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col">
                        <div class="relative flex items-center justify-center overflow-hidden"
                             style="aspect-ratio:4/3; background: linear-gradient(135deg, {color}{isActive ? '30' : '18'} 0%, {color}{isActive ? '10' : '06'} 100%)">
                            <span class="material-symbols-outlined" style="font-size:{density === 1 ? '28' : '40'}px; color:{color}{isActive ? '60' : '30'}">restaurant</span>
                            {#if !isActive}
                                <div class="absolute inset-0 bg-surface-container-lowest/50 flex items-center justify-center">
                                    <span class="px-2 py-0.5 bg-on-surface-variant/20 text-on-surface-variant text-[9px] font-black uppercase rounded-full tracking-widest">비활성</span>
                                </div>
                            {/if}
                            <div class="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    class="p-2 bg-white/90 backdrop-blur shadow-sm text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                                    on:click={() => startEdit(item)}
                                    title="편집"
                                >
                                    <span class="material-symbols-outlined" style="font-size:18px">edit</span>
                                </button>
                                <button
                                    class="p-2 bg-white/90 backdrop-blur shadow-sm text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-xl transition-colors"
                                    on:click={() => removeMenu(item.id)}
                                    title="삭제"
                                >
                                    <span class="material-symbols-outlined" style="font-size:18px">delete</span>
                                </button>
                            </div>
                        </div>
                        <div class="p-5 flex flex-col flex-1">
                            <div class="mb-3 flex-1">
                                <h3 class="font-headline font-bold text-on-surface mb-1 leading-tight {density === 1 ? 'text-xs' : 'text-base'}">{item.name}</h3>
                                {#if item.ingredients && item.ingredients.length > 0}
                                    <p class="text-sm text-on-surface-variant line-clamp-2">{item.ingredients.join(", ")}</p>
                                {/if}
                                <div class="flex flex-wrap gap-1.5 mt-3">
                                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase"
                                          style="background-color:{color}15; color:{color}">{getCategoryName(item.category_id)}</span>
                                </div>
                            </div>
                            <div class="pt-3 border-t border-surface-container-high flex items-center justify-between mt-auto">
                                <div class="flex items-center gap-2">
                                    <div class="w-2 h-2 rounded-full {isActive ? 'bg-primary animate-pulse' : 'bg-on-surface-variant/40'}"></div>
                                    <span class="text-xs font-bold {isActive ? 'text-primary' : 'text-on-surface-variant/60'}">{isActive ? "사용 중" : "사용 안함"}</span>
                                </div>
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                <div class="relative inline-flex items-center cursor-pointer" on:click={() => toggleActive(item.id)}>
                                    <input type="checkbox" checked={isActive} class="sr-only peer" />
                                    <div class="w-10 h-5 bg-surface-container-high rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}

                {#if filteredItems.length === 0 && filteredCombos.length === 0 && (menuItems.length > 0 || combos.length > 0)}
                    <div class="col-span-full py-20 text-center">
                        <div class="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto mb-4">
                            <span class="material-symbols-outlined text-outline" style="font-size:32px">search_off</span>
                        </div>
                        <p class="text-on-surface-variant font-medium">검색 결과가 없습니다.</p>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>

<!-- Modals -->
{#if showSelectionModal}
    <ModalNewEntrySelection
        on:select={onNewEntrySelect}
        on:close={() => (showSelectionModal = false)}
    />
{/if}

{#if showMenuModal}
    <ModalMenuRegistry
        {categories}
        {menuItems}
        on:saved={onMenuSaved}
        on:close={() => (showMenuModal = false)}
    />
{/if}

{#if showComboModal}
    <ModalComboRegistry
        {menuItems}
        on:saved={onComboSaved}
        on:close={() => (showComboModal = false)}
    />
{/if}

<!-- Edit Modal -->
{#if editingId}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
         on:click={cancelEdit}>
        <div class="bg-surface-container-lowest rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden"
             on:click|stopPropagation>
            <div class="p-8 space-y-5">
                <div class="flex items-center justify-between">
                    <h2 class="text-2xl font-headline font-extrabold tracking-tight text-on-surface">메뉴 편집</h2>
                    <button class="p-2 hover:bg-surface-container-low rounded-full transition-colors" on:click={cancelEdit}>
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
                                   on:keydown={(e) => e.key === "Enter" && addEditIngredient()} />
                            <button class="w-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-md"
                                    on:click={addEditIngredient}>
                                <span class="material-symbols-outlined">add</span>
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
                            {#each editIngredients as ing}
                                <span class="px-2 py-1 bg-surface-container-low text-on-surface-variant rounded-md text-[10px] font-bold flex items-center gap-1">
                                    {ing}
                                    <button class="hover:text-error transition-colors" on:click={() => removeEditIngredient(ing)}>
                                        <span class="material-symbols-outlined" style="font-size:12px">close</span>
                                    </button>
                                </span>
                            {/each}
                        </div>
                    </div>
                </div>
                <div class="flex gap-3 pt-2">
                    <button class="flex-1 py-3.5 bg-surface-container-low text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-high transition-all text-sm"
                            on:click={cancelEdit}>취소</button>
                    <button class="flex-[2] py-3.5 bg-primary text-white font-bold rounded-2xl shadow-md shadow-primary/20 hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2"
                            on:click={saveEdit}>
                        <span class="material-symbols-outlined" style="font-size:18px">save</span>
                        저장
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Combo Edit Modal -->
{#if editingComboId !== null}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
         on:click={cancelEditCombo}>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="bg-surface-container-lowest rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
             style="max-height: 85vh"
             on:click|stopPropagation>
            <div class="p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                <div class="flex items-center justify-between">
                    <h2 class="text-2xl font-headline font-extrabold tracking-tight text-on-surface">콤보 편집</h2>
                    <button class="p-2 hover:bg-surface-container-low rounded-full transition-colors" on:click={cancelEditCombo}>
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <!-- Name -->
                <div class="space-y-1.5">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-outline">콤보 이름</span>
                    <input type="text"
                           class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                           bind:value={editComboName} />
                </div>

                <!-- Description -->
                <div class="space-y-1.5">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-outline">설명</span>
                    <textarea
                        class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                        rows="2"
                        bind:value={editComboDesc}
                        placeholder="콤보 설명 (선택)"
                    ></textarea>
                </div>

                <!-- Item selection -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-outline">구성 메뉴</span>
                        <span class="text-xs font-bold text-primary">{editComboItemIds.length}개 선택됨</span>
                    </div>
                    <input type="text"
                           class="w-full bg-surface-container-low rounded-xl py-2.5 px-4 text-sm outline-none border-none focus:ring-2 focus:ring-primary/10 transition-all"
                           placeholder="메뉴 검색..."
                           bind:value={comboItemSearch} />
                    <div class="max-h-52 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                        {#each categories as cat}
                            {@const catItems = menuItems.filter(m =>
                                m.category_id === cat.id &&
                                (!comboItemSearch || m.name.includes(comboItemSearch))
                            )}
                            {#if catItems.length > 0}
                                <div class="mb-2">
                                    <p class="text-[10px] font-black uppercase tracking-widest px-1 mb-1"
                                       style="color: {cat.color}">{cat.name}</p>
                                    <div class="flex flex-wrap gap-1.5">
                                        {#each catItems as item}
                                            {@const selected = editComboItemIds.includes(item.id)}
                                            <button
                                                class="px-3 py-1 rounded-full text-xs font-bold transition-all border-2"
                                                style={selected
                                                    ? `background-color:${cat.color}; color:white; border-color:${cat.color}`
                                                    : `background-color:${cat.color}15; color:${cat.color}; border-color:transparent`}
                                                on:click={() => toggleComboItem(item.id)}
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
                        on:click={cancelEditCombo}>취소</button>
                <button class="flex-[2] py-3.5 bg-primary text-white font-bold rounded-2xl shadow-md shadow-primary/20 hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2"
                        on:click={saveEditCombo}
                        disabled={!editComboName.trim() || editComboItemIds.length === 0}>
                    <span class="material-symbols-outlined" style="font-size:18px">save</span>
                    저장
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e1e3e4; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #becab9; }
</style>
