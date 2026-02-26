<script lang="ts">
    import { onMount } from "svelte";

    interface MenuItem {
        id: string;
        name: string;
        tags: string[];
    }

    let menuItems: MenuItem[] = [];
    let searchQuery = "";
    let activeFilters: string[] = [];
    let newMenuName = "";
    let newTagInput = "";
    let pendingTags: string[] = [];
    let showTagSuggestions = false;
    let showMenuSuggestions = false;
    let confirmDelete = true;

    $: allTags = [...new Set(menuItems.flatMap((item) => item.tags))].sort();

    $: filteredItems = menuItems.filter((item) => {
        const matchSearch =
            !searchQuery ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some((t) =>
                t.toLowerCase().includes(searchQuery.toLowerCase()),
            );
        const matchFilter =
            activeFilters.length === 0 ||
            activeFilters.every((f) => item.tags.includes(f));
        return matchSearch && matchFilter;
    });

    $: tagSuggestions = allTags.filter(
        (t) =>
            !pendingTags.includes(t) &&
            (!newTagInput ||
                t.toLowerCase().includes(newTagInput.toLowerCase())),
    );

    $: menuNameSuggestions = newMenuName.trim()
        ? menuItems
              .filter((m) =>
                  m.name
                      .toLowerCase()
                      .includes(newMenuName.trim().toLowerCase()),
              )
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
        saveMenuItems();
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
        searchQuery = "";
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
                    <div class="menu-row">
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
                    bind:value={searchQuery}
                />
                {#if searchQuery || activeFilters.length > 0}
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
