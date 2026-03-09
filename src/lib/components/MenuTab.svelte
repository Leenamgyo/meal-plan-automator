<script lang="ts">
    import { onMount } from "svelte";
    import { hangulIncludes } from "$lib/utils/hangul";
    import { fetchCategories } from "$lib/services/categories";
    import {
        fetchMenuItems,
        createMenuItem,
        updateMenuItem,
        deleteMenuItem,
    } from "$lib/services/menuItems";
    import type { Category, MenuItem } from "$lib/types/models";
    import { suggestIngredients } from "$lib/services/mealService";
    import { geminiKey, aiIngredientsEnabled } from "$lib/stores";
    import { PUBLIC_GEMINI_API_KEY } from "$env/static/public";

    let menuItems: MenuItem[] = [];
    let categories: Category[] = [];
    let searchInput = "";
    let debouncedQuery = "";
    let searchTimer: ReturnType<typeof setTimeout>;
    let activeFilters: string[] = []; // Ingredient filters
    let activeCategoryFilter: number | null = null;
    let newMenuName = "";
    let newCategory: number | null = null;
    let newIngredientInput = "";
    let pendingIngredients: string[] = [];
    let showIngredientSuggestions = false;
    let showMenuSuggestions = false;
    let confirmDelete = true;

    // Edit mode
    let editingId: number | null = null;
    let editName = "";
    let editCategory: number | null = null;
    let editIngredientInput = "";
    let editIngredients: string[] = [];

    $: allIngredients = [
        ...new Set(menuItems.flatMap((item) => item.ingredients || [])),
    ].sort();

    $: {
        clearTimeout(searchTimer);
        const q = searchInput;
        searchTimer = setTimeout(() => {
            debouncedQuery = q;
        }, 100);
    }

    $: filteredItems = menuItems.filter((item) => {
        const catName =
            categories.find((c) => c.id === item.category_id)?.name || "";
        const matchSearch =
            !debouncedQuery ||
            hangulIncludes(item.name, debouncedQuery) ||
            hangulIncludes(catName, debouncedQuery) ||
            (item.ingredients || []).some((t) =>
                hangulIncludes(t, debouncedQuery),
            );

        const matchFilter =
            activeFilters.length === 0 ||
            activeFilters.every((f) => (item.ingredients || []).includes(f));

        const matchCatFilter =
            !activeCategoryFilter || item.category_id === activeCategoryFilter;

        return matchSearch && matchFilter && matchCatFilter;
    });

    $: ingredientSuggestions = allIngredients.filter(
        (t) =>
            !pendingIngredients.includes(t) &&
            (!newIngredientInput || hangulIncludes(t, newIngredientInput)),
    );

    $: menuNameSuggestions = newMenuName.trim()
        ? menuItems
              .filter((m) => hangulIncludes(m.name, newMenuName.trim()))
              .slice(0, 5)
        : [];

    $: isDuplicate = newMenuName.trim()
        ? menuItems.some(
              (m) => m.name.toLowerCase() === newMenuName.trim().toLowerCase(),
          )
        : false;

    onMount(async () => {
        categories = await fetchCategories();
        const items = await fetchMenuItems();
        // Migration logic: convert tags to category and ingredients
        menuItems = items.map((m: any) => {
            if (m.tags && !m.category_id && !m.ingredients) {
                return {
                    id: m.id,
                    name: m.name,
                    category_id:
                        m.tags.length > 0
                            ? categories.find((c) => c.name === m.tags[0])
                                  ?.id || null
                            : null,
                    ingredients: m.tags.length > 1 ? m.tags.slice(1) : [],
                };
            }
            return { ...m, ingredients: m.ingredients || [] };
        });
        const cd = localStorage.getItem("confirmDelete");
        confirmDelete = cd === null ? true : cd === "true";

        if (categories.length > 0) newCategory = categories[0].id;
    });

    function getCategoryColor(catId: number | null) {
        return categories.find((c) => c.id === catId)?.color || "#ccc";
    }

    function getCategoryName(catId: number | null) {
        return categories.find((c) => c.id === catId)?.name || "미지정";
    }

    function saveMenuItems() {
        localStorage.setItem("menuItems", JSON.stringify(menuItems));
    }

    async function addNewMenu() {
        if (!newMenuName.trim() || isDuplicate) return;
        const data = {
            name: newMenuName.trim(),
            category_id: newCategory || null,
            ingredients: [...pendingIngredients],
        };
        const dbItem = await createMenuItem(data);
        const item: MenuItem = {
            id: dbItem?.id || Date.now(),
            ...data,
            category_id: data.category_id,
        };
        menuItems = [...menuItems, item];
        newMenuName = "";
        pendingIngredients = [];
        newIngredientInput = "";
        showMenuSuggestions = false;
        saveMenuItems();
    }

    function removeMenu(id: number) {
        const item = menuItems.find((m) => m.id === id);
        if (!confirm(`"${item?.name}" 메뉴를 삭제하시겠습니까?`)) return;
        menuItems = menuItems.filter((m) => m.id !== id);
        if (editingId === id) editingId = null;
        saveMenuItems();
        deleteMenuItem(id);
    }

    let editingId2: number | null = null;
    let editName2 = "";
    let editCategory2: number | null = null;
    let editIngredients2: string[] = [];
    let editIngredientInput2 = "";

    function startEdit(item: MenuItem) {
        editingId = item.id;
        editName = item.name;
        editCategory = item.category_id;
        editIngredients = [...(item.ingredients || [])];
        editIngredientInput = "";
    }

    function cancelEdit() {
        editingId = null;
        editName = "";
        editIngredients = [];
        editIngredientInput = "";
    }

    function saveEdit() {
        if (!editingId || !editName.trim()) return;
        const editData = {
            name: editName.trim(),
            category_id: editCategory,
            ingredients: [...editIngredients],
        };
        menuItems = menuItems.map((m) => {
            if (m.id === editingId)
                return { ...m, ...editData, category_id: editData.category_id };
            return m;
        });
        updateMenuItem(editingId, editData);
        editingId = null;
        editName = "";
        editIngredients = [];
        editIngredientInput = "";
        saveMenuItems();
    }

    function addEditIngredient() {
        const ing = editIngredientInput.trim();
        if (!ing || editIngredients.includes(ing)) return;
        editIngredients = [...editIngredients, ing];
        editIngredientInput = "";
    }

    function removeEditIngredient(ing: string) {
        editIngredients = editIngredients.filter((t) => t !== ing);
    }

    function handleEditIngredientKeydown(e: KeyboardEvent) {
        if (e.isComposing) return;
        if (e.key === "Enter") {
            e.preventDefault();
            addEditIngredient();
        }
    }

    function handleEditNameKeydown(e: KeyboardEvent) {
        if (e.isComposing) return;
        if (e.key === "Enter") {
            e.preventDefault();
            saveEdit();
        }
        if (e.key === "Escape") {
            cancelEdit();
        }
    }

    function addPendingIngredient() {
        const ing = newIngredientInput.trim();
        if (!ing || pendingIngredients.includes(ing)) return;
        pendingIngredients = [...pendingIngredients, ing];
        newIngredientInput = "";
        showIngredientSuggestions = false;
    }

    function removePendingIngredient(ing: string) {
        pendingIngredients = pendingIngredients.filter((t) => t !== ing);
    }

    function selectIngredientSuggestion(ing: string) {
        if (!pendingIngredients.includes(ing))
            pendingIngredients = [...pendingIngredients, ing];
        newIngredientInput = "";
        showIngredientSuggestions = false;
    }

    function toggleFilter(ing: string) {
        activeFilters = activeFilters.includes(ing)
            ? activeFilters.filter((f) => f !== ing)
            : [...activeFilters, ing];
    }

    function clearFilters() {
        activeFilters = [];
        activeCategoryFilter = null;
        searchInput = "";
        debouncedQuery = "";
    }

    function toggleCategoryFilter(catId: number) {
        if (activeCategoryFilter === catId) activeCategoryFilter = null;
        else activeCategoryFilter = catId;
    }

    function handleIngredientKeydown(e: KeyboardEvent) {
        if (e.isComposing) return;
        if (e.key === "Enter") {
            e.preventDefault();
            addPendingIngredient();
        }
    }

    function handleMenuAddKeydown(e: KeyboardEvent) {
        if (e.isComposing) return;
        if (e.key === "Enter") {
            e.preventDefault();
            addNewMenu();
        }
    }

    let isAiLoading = false;

    async function handleAiSuggest() {
        const apiKey = PUBLIC_GEMINI_API_KEY || $geminiKey;
        if (!newMenuName.trim() || !apiKey || isAiLoading) return;
        isAiLoading = true;
        try {
            const suggested = await suggestIngredients(newMenuName.trim(), apiKey);
            for (const ing of suggested) {
                if (!pendingIngredients.includes(ing)) {
                    pendingIngredients = [...pendingIngredients, ing];
                }
            }
        } catch (error: unknown) {
            console.error("AI 재료 추천 실패:", error);
        } finally {
            isAiLoading = false;
        }
    }
</script>

<div class="menu-management">
    <!-- Left: Menu List -->
    <div class="menu-left-panel">
        <div class="menu-grid">
            {#if filteredItems.length === 0}
                <div class="empty-state" style="grid-column: 1 / -1;">
                    {#if menuItems.length === 0}
                        <p>등록된 메뉴가 없습니다.</p>
                        <p style="font-size: 0.85rem; color: #aaa;">
                            우측에서 새 메뉴를 추가해보세요!
                        </p>
                    {:else}
                        <p>검색 결과가 없습니다.</p>
                    {/if}
                </div>
            {:else}
                {#each filteredItems as item (item.id)}
                    {#if editingId === item.id}
                        <div
                            class="menu-card editing"
                            style="grid-column: 1 / -1;"
                        >
                            <div class="edit-form">
                                <div style="display:flex; gap: 8px;">
                                    <select
                                        bind:value={editCategory}
                                        class="category-select"
                                        style="min-width: 100px;"
                                    >
                                        {#each categories as cat}
                                            <option value={cat.id}
                                                >{cat.name}</option
                                            >
                                        {/each}
                                    </select>
                                    <input
                                        type="text"
                                        class="edit-name-input"
                                        bind:value={editName}
                                        on:keydown={handleEditNameKeydown}
                                        placeholder="메뉴 이름"
                                        style="flex: 1;"
                                    />
                                </div>
                                <div class="edit-tags-row">
                                    {#each editIngredients as ing}
                                        <span class="tag-chip pending"
                                            >{ing}<button
                                                class="tag-remove"
                                                on:click|stopPropagation={() =>
                                                    removeEditIngredient(ing)}
                                                aria-label="{ing} 제거"
                                                >×</button
                                            ></span
                                        >
                                    {/each}
                                    <input
                                        type="text"
                                        class="edit-tag-input"
                                        placeholder="재료 추가"
                                        bind:value={editIngredientInput}
                                        on:keydown={handleEditIngredientKeydown}
                                    />
                                </div>
                                <div class="edit-actions">
                                    <button
                                        class="btn-edit-save"
                                        on:click={saveEdit}>저장</button
                                    >
                                    <button
                                        class="btn-edit-cancel"
                                        on:click={cancelEdit}>취소</button
                                    >
                                </div>
                            </div>
                        </div>
                    {:else}
                        <div
                            class="menu-card"
                            style="border-left: 3px solid {getCategoryColor(
                                item.category_id,
                            )};"
                        >
                            <div class="card-top">
                                <span
                                    class="cat-pill small"
                                    style="background-color: {getCategoryColor(
                                        item.category_id,
                                    )};"
                                    >{getCategoryName(item.category_id)}</span
                                >
                                <div class="card-actions">
                                    <button
                                        class="btn-edit-menu"
                                        on:click={() => startEdit(item)}
                                        aria-label="수정"
                                        title="수정"
                                    >
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        >
                                            <path
                                                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                                            ></path>
                                            <path
                                                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                                            ></path>
                                        </svg>
                                    </button>
                                    <button
                                        class="btn-remove-menu"
                                        on:click={() => removeMenu(item.id)}
                                        aria-label="삭제">×</button
                                    >
                                </div>
                            </div>
                            <div class="card-name">{item.name}</div>
                            {#if item.ingredients && item.ingredients.length > 0}
                                <div class="card-tags">
                                    {#each item.ingredients as ing}
                                        <span class="tag-chip">{ing}</span>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/if}
                {/each}
            {/if}
        </div>
        <div class="menu-count">
            {filteredItems.length}/{menuItems.length}개 메뉴
        </div>
    </div>

    <!-- Right: Search + Filters + Add Form -->
    <div class="menu-right-panel">
        <!-- Search -->
        <div class="panel-section">
            <h3 class="panel-title">🔍 검색</h3>
            <div class="search-box">
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#999"
                    stroke-width="2"
                >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                    type="text"
                    class="search-input"
                    placeholder="메뉴, 카테고리, 재료 검색..."
                    bind:value={searchInput}
                />
                {#if searchInput || activeFilters.length > 0 || activeCategoryFilter}
                    <button
                        class="btn-clear-search"
                        on:click={clearFilters}
                        aria-label="검색 초기화">×</button
                    >
                {/if}
            </div>
        </div>

        <!-- Tag Filters -->
        {#if categories.length > 0 || allIngredients.length > 0}
            <div class="panel-section">
                <h3 class="panel-title" style="margin-bottom: 8px;">📊 필터</h3>
                <div style="font-size: 0.8rem; color:#888; margin-bottom: 6px;">
                    카테고리
                </div>
                <div class="tag-filter-bar" style="margin-bottom: 12px;">
                    {#each categories as cat}
                        <button
                            class="tag-filter-chip"
                            class:active={activeCategoryFilter === cat.id}
                            style={activeCategoryFilter === cat.id
                                ? `background-color: ${cat.color}; color: white; border-color: ${cat.color};`
                                : ""}
                            on:click={() => toggleCategoryFilter(cat.id)}
                            >{cat.name}</button
                        >
                    {/each}
                </div>

                {#if allIngredients.length > 0}
                    <div
                        style="font-size: 0.8rem; color:#888; margin-bottom: 6px;"
                    >
                        재료
                    </div>
                    <div class="tag-filter-bar">
                        {#each allIngredients as ing}
                            <button
                                class="tag-filter-chip"
                                class:active={activeFilters.includes(ing)}
                                on:click={() => toggleFilter(ing)}>{ing}</button
                            >
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Add New Menu -->
        <div class="panel-section">
            <h3 class="panel-title">➕ 메뉴 등록</h3>
            <div class="add-menu-compact">
                <div
                    class="menu-name-wrapper"
                    style="display:flex; gap: 8px; flex-direction:column;"
                >
                    <select bind:value={newCategory} class="category-select">
                        {#each categories as cat}
                            <option value={cat.id}>{cat.name}</option>
                        {/each}
                    </select>

                    <div style="position: relative;">
                        <input
                            type="text"
                            class="menu-name-input"
                            class:duplicate={isDuplicate}
                            placeholder="메뉴 이름 (예: 오징어보쌈)"
                            bind:value={newMenuName}
                            on:keydown={handleMenuAddKeydown}
                            on:focus={() => (showMenuSuggestions = true)}
                            on:blur={() =>
                                setTimeout(
                                    () => (showMenuSuggestions = false),
                                    200,
                                )}
                            style="width: 100%; box-sizing: border-box;"
                        />
                        {#if isDuplicate}
                            <span class="duplicate-warning"
                                >⚠ 이미 등록된 메뉴</span
                            >
                        {/if}
                        {#if showMenuSuggestions && menuNameSuggestions.length > 0 && newMenuName.trim() && !isDuplicate}
                            <div class="menu-suggestions" style="top: 100%;">
                                {#each menuNameSuggestions as item}
                                    <div class="suggestion-item-row">
                                        <span
                                            class="cat-pill small"
                                            style="--cat-color: {getCategoryColor(
                                                item.category_id,
                                            )}"
                                            >{getCategoryName(
                                                item.category_id,
                                            )}</span
                                        >
                                        <span class="suggestion-name"
                                            >{item.name}</span
                                        >
                                        <span class="suggestion-tags">
                                            {#each item.ingredients || [] as t}
                                                <span class="tag-chip small"
                                                    >{t}</span
                                                >
                                            {/each}
                                        </span>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </div>

                {#if $aiIngredientsEnabled && newMenuName.trim() && !isDuplicate}
                    <button
                        class="btn-ai-ingredient"
                        on:click={handleAiSuggest}
                        disabled={isAiLoading}
                        title="AI가 재료를 자동으로 추천합니다"
                    >
                        {#if isAiLoading}
                            추천 중...
                        {:else}
                            ✨ AI 재료 추천
                        {/if}
                    </button>
                {/if}

                <div class="tag-input-wrapper">
                    <input
                        type="text"
                        class="tag-input"
                        placeholder="재료 입력 후 Enter"
                        bind:value={newIngredientInput}
                        on:keydown={handleIngredientKeydown}
                        on:focus={() => (showIngredientSuggestions = true)}
                        on:blur={() =>
                            setTimeout(
                                () => (showIngredientSuggestions = false),
                                200,
                            )}
                    />
                    <button
                        class="btn-add-tag"
                        on:click={addPendingIngredient}
                        aria-label="재료 추가">+</button
                    >
                    {#if showIngredientSuggestions && ingredientSuggestions.length > 0 && newIngredientInput}
                        <div class="tag-suggestions">
                            {#each ingredientSuggestions.slice(0, 5) as suggestion}
                                <button
                                    class="suggestion-item"
                                    on:mousedown={() =>
                                        selectIngredientSuggestion(suggestion)}
                                    >{suggestion}</button
                                >
                            {/each}
                        </div>
                    {/if}
                </div>

                {#if pendingIngredients.length > 0}
                    <div class="pending-tags">
                        {#each pendingIngredients as ing}
                            <span class="tag-chip pending">
                                {ing}
                                <button
                                    class="tag-remove"
                                    on:click={() =>
                                        removePendingIngredient(ing)}
                                    aria-label="{ing} 제거">×</button
                                >
                            </span>
                        {/each}
                    </div>
                {/if}

                <button
                    class="btn-mac btn-add-menu-full"
                    on:click={addNewMenu}
                    disabled={!newMenuName.trim() || isDuplicate}
                >
                    메뉴 추가
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .cat-pill {
        display: inline-block;
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 12px;
        background-color: var(--cat-color, #eee);
        color: #fff;
        font-weight: 600;
        margin-right: 8px;
        flex-shrink: 0;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }
    .cat-pill.small {
        font-size: 0.65rem;
        padding: 1px 6px;
        margin-right: 4px;
    }
    .category-select {
        flex-shrink: 0;
        padding: 8px;
        border: 1px solid var(--mac-border);
        border-radius: 6px;
        background: white;
        font-size: 0.9rem;
        outline: none;
    }
    .category-select:focus {
        border-color: var(--mac-accent);
    }
</style>
