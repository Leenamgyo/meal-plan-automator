<script lang="ts">
    import { onMount } from "svelte";
    import { hangulIncludes } from "$lib/hangul";

    interface MenuItem {
        id: string;
        name: string;
        tags: string[];
    }

    let menuItems: MenuItem[] = [];
    let searchInput = "";
    let debouncedQuery = "";
    let searchTimer: ReturnType<typeof setTimeout>;
    let activeFilters: string[] = [];
    let newMenuName = "";
    let newTagInput = "";
    let pendingTags: string[] = [];
    let showTagSuggestions = false;
    let showMenuSuggestions = false;
    let confirmDelete = true;

    // Edit mode
    let editingId: string | null = null;
    let editName = "";
    let editTagInput = "";
    let editTags: string[] = [];

    $: allTags = [...new Set(menuItems.flatMap((item) => item.tags))].sort();

    $: {
        clearTimeout(searchTimer);
        const q = searchInput;
        searchTimer = setTimeout(() => {
            debouncedQuery = q;
        }, 100);
    }

    $: filteredItems = menuItems.filter((item) => {
        const matchSearch =
            !debouncedQuery ||
            hangulIncludes(item.name, debouncedQuery) ||
            item.tags.some((t) => hangulIncludes(t, debouncedQuery));
        const matchFilter =
            activeFilters.length === 0 ||
            activeFilters.every((f) => item.tags.includes(f));
        return matchSearch && matchFilter;
    });

    $: tagSuggestions = allTags.filter(
        (t) =>
            !pendingTags.includes(t) &&
            (!newTagInput || hangulIncludes(t, newTagInput)),
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

    onMount(() => {
        const saved = localStorage.getItem("menuItems");
        if (saved) menuItems = JSON.parse(saved);
        const cd = localStorage.getItem("confirmDelete");
        confirmDelete = cd === null ? true : cd === "true";
    });

    function saveMenuItems() {
        localStorage.setItem("menuItems", JSON.stringify(menuItems));
    }

    function addNewMenu() {
        if (!newMenuName.trim() || isDuplicate) return;
        const item: MenuItem = {
            id: "m_" + Date.now(),
            name: newMenuName.trim(),
            tags: [...pendingTags],
        };
        menuItems = [...menuItems, item];
        newMenuName = "";
        pendingTags = [];
        newTagInput = "";
        showMenuSuggestions = false;
        saveMenuItems();
    }

    function removeMenu(id: string) {
        if (confirmDelete) {
            const item = menuItems.find((m) => m.id === id);
            if (!confirm(`"${item?.name}" 메뉴를 삭제하시겠습니까?`)) return;
        }
        menuItems = menuItems.filter((m) => m.id !== id);
        if (editingId === id) editingId = null;
        saveMenuItems();
    }

    function startEdit(item: MenuItem) {
        editingId = item.id;
        editName = item.name;
        editTags = [...item.tags];
        editTagInput = "";
    }

    function cancelEdit() {
        editingId = null;
        editName = "";
        editTags = [];
        editTagInput = "";
    }

    function saveEdit() {
        if (!editingId || !editName.trim()) return;
        menuItems = menuItems.map((m) => {
            if (m.id === editingId)
                return { ...m, name: editName.trim(), tags: [...editTags] };
            return m;
        });
        editingId = null;
        editName = "";
        editTags = [];
        editTagInput = "";
        saveMenuItems();
    }

    function addEditTag() {
        const tag = editTagInput.trim();
        if (!tag || editTags.includes(tag)) return;
        editTags = [...editTags, tag];
        editTagInput = "";
    }

    function removeEditTag(tag: string) {
        editTags = editTags.filter((t) => t !== tag);
    }

    function handleEditTagKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            addEditTag();
        }
    }

    function handleEditNameKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            saveEdit();
        }
        if (e.key === "Escape") {
            cancelEdit();
        }
    }

    function addPendingTag() {
        const tag = newTagInput.trim();
        if (!tag || pendingTags.includes(tag)) return;
        pendingTags = [...pendingTags, tag];
        newTagInput = "";
        showTagSuggestions = false;
    }

    function removePendingTag(tag: string) {
        pendingTags = pendingTags.filter((t) => t !== tag);
    }

    function selectSuggestion(tag: string) {
        if (!pendingTags.includes(tag)) pendingTags = [...pendingTags, tag];
        newTagInput = "";
        showTagSuggestions = false;
    }

    function toggleFilter(tag: string) {
        activeFilters = activeFilters.includes(tag)
            ? activeFilters.filter((f) => f !== tag)
            : [...activeFilters, tag];
    }

    function clearFilters() {
        activeFilters = [];
        searchInput = "";
        debouncedQuery = "";
    }

    function handleTagKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            addPendingTag();
        }
    }

    function handleMenuAddKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            e.preventDefault();
            addNewMenu();
        }
    }
</script>

<div class="menu-management">
    <!-- Left: Menu List -->
    <div class="menu-left-panel">
        <div class="menu-list">
            {#if filteredItems.length === 0}
                <div class="empty-state">
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
                        <div class="menu-row editing">
                            <div class="edit-form">
                                <input
                                    type="text"
                                    class="edit-name-input"
                                    bind:value={editName}
                                    on:keydown={handleEditNameKeydown}
                                    placeholder="메뉴 이름"
                                />
                                <div class="edit-tags-row">
                                    {#each editTags as tag}
                                        <span class="tag-chip pending">
                                            {tag}
                                            <button
                                                class="tag-remove"
                                                on:click={() =>
                                                    removeEditTag(tag)}
                                                aria-label="{tag} 제거"
                                                >×</button
                                            >
                                        </span>
                                    {/each}
                                    <input
                                        type="text"
                                        class="edit-tag-input"
                                        placeholder="태그 추가"
                                        bind:value={editTagInput}
                                        on:keydown={handleEditTagKeydown}
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
                        <div class="menu-row">
                            <button
                                class="btn-edit-menu"
                                on:click={() => startEdit(item)}
                                aria-label="{item.name} 수정"
                                title="수정"
                            >
                                <svg
                                    width="13"
                                    height="13"
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
                            <span class="menu-name">{item.name}</span>
                            <div class="menu-tags">
                                {#each item.tags as tag}
                                    <span class="tag-chip">{tag}</span>
                                {/each}
                            </div>
                            <button
                                class="btn-remove-menu"
                                on:click={() => removeMenu(item.id)}
                                aria-label="{item.name} 삭제">×</button
                            >
                        </div>
                    {/if}
                {/each}
            {/if}
            <div class="menu-count">
                {filteredItems.length}/{menuItems.length}개 메뉴
            </div>
        </div>
    </div>

    <!-- Right: Search + Tags + Add Form -->
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
                    placeholder="메뉴 또는 태그 검색..."
                    bind:value={searchInput}
                />
                {#if searchInput || activeFilters.length > 0}
                    <button
                        class="btn-clear-search"
                        on:click={clearFilters}
                        aria-label="검색 초기화">×</button
                    >
                {/if}
            </div>
        </div>

        <!-- Tag Filters -->
        {#if allTags.length > 0}
            <div class="panel-section">
                <h3 class="panel-title">🏷️ 태그 필터</h3>
                <div class="tag-filter-bar">
                    {#each allTags as tag}
                        <button
                            class="tag-filter-chip"
                            class:active={activeFilters.includes(tag)}
                            on:click={() => toggleFilter(tag)}>{tag}</button
                        >
                    {/each}
                </div>
                {#if activeFilters.length > 0}
                    <button class="btn-clear-filters" on:click={clearFilters}
                        >필터 초기화</button
                    >
                {/if}
            </div>
        {/if}

        <!-- Add New Menu -->
        <div class="panel-section">
            <h3 class="panel-title">➕ 메뉴 등록</h3>
            <div class="add-menu-compact">
                <div class="menu-name-wrapper">
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
                    />
                    {#if isDuplicate}
                        <span class="duplicate-warning"
                            >⚠ 이미 등록된 메뉴</span
                        >
                    {/if}
                    {#if showMenuSuggestions && menuNameSuggestions.length > 0 && newMenuName.trim() && !isDuplicate}
                        <div class="menu-suggestions">
                            {#each menuNameSuggestions as item}
                                <div class="suggestion-item-row">
                                    <span class="suggestion-name"
                                        >{item.name}</span
                                    >
                                    <span class="suggestion-tags">
                                        {#each item.tags as t}
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

                <div class="tag-input-wrapper">
                    <input
                        type="text"
                        class="tag-input"
                        placeholder="태그 입력 후 Enter"
                        bind:value={newTagInput}
                        on:keydown={handleTagKeydown}
                        on:focus={() => (showTagSuggestions = true)}
                        on:blur={() =>
                            setTimeout(() => (showTagSuggestions = false), 200)}
                    />
                    <button
                        class="btn-add-tag"
                        on:click={addPendingTag}
                        aria-label="태그 추가">+</button
                    >
                    {#if showTagSuggestions && tagSuggestions.length > 0 && newTagInput}
                        <div class="tag-suggestions">
                            {#each tagSuggestions.slice(0, 5) as suggestion}
                                <button
                                    class="suggestion-item"
                                    on:mousedown={() =>
                                        selectSuggestion(suggestion)}
                                    >{suggestion}</button
                                >
                            {/each}
                        </div>
                    {/if}
                </div>

                {#if pendingTags.length > 0}
                    <div class="pending-tags">
                        {#each pendingTags as tag}
                            <span class="tag-chip pending">
                                {tag}
                                <button
                                    class="tag-remove"
                                    on:click={() => removePendingTag(tag)}
                                    aria-label="{tag} 태그 제거">×</button
                                >
                            </span>
                        {/each}
                    </div>
                {/if}

                <button
                    class="btn-mac btn-add-menu-full"
                    on:click={addNewMenu}
                    disabled={!newMenuName.trim() || isDuplicate}
                    >메뉴 추가</button
                >
            </div>
        </div>
    </div>
</div>
