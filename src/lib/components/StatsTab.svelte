<script lang="ts">
    import { onMount } from "svelte";

    interface Category {
        id: string;
        name: string;
        color: string;
    }

    interface MenuItem {
        id: string;
        name: string;
        category: string;
        ingredients: string[];
    }

    let menuItems: MenuItem[] = [];
    let categories: Category[] = [];

    onMount(() => {
        const savedCats = localStorage.getItem("menuCategories");
        if (savedCats) categories = JSON.parse(savedCats);

        const saved = localStorage.getItem("menuItems");
        if (saved) menuItems = JSON.parse(saved);
    });

    $: totalMenus = menuItems.length;
    $: allIngredients = [
        ...new Set(menuItems.flatMap((m) => m.ingredients || [])),
    ];
    $: totalIngredients = allIngredients.length;

    // Ingredient frequency (top 10)
    $: ingredientFrequency = (() => {
        const freq: Record<string, number> = {};
        menuItems.forEach((m) =>
            (m.ingredients || []).forEach((t) => {
                freq[t] = (freq[t] || 0) + 1;
            }),
        );
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    })();

    $: maxFreq = ingredientFrequency.length > 0 ? ingredientFrequency[0][1] : 1;

    // Menus without ingredients
    $: noIngredientMenus = menuItems.filter(
        (m) => !m.ingredients || m.ingredients.length === 0,
    );
</script>

<div class="stats-tab">
    <!-- Summary Cards -->
    <div class="stats-summary">
        <div class="stat-card">
            <div class="stat-number">{totalMenus}</div>
            <div class="stat-label">전체 메뉴</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{totalIngredients}</div>
            <div class="stat-label">등록된 재료 수</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{noIngredientMenus.length}</div>
            <div class="stat-label">재료 미지정 메뉴</div>
        </div>
    </div>

    <!-- Ingredient Frequency Chart -->
    <div class="stats-section">
        <h3 class="stats-section-title">📊 재료별 사용 빈도 (상위 10개)</h3>
        {#if ingredientFrequency.length === 0}
            <div class="empty-state"><p>아직 데이터가 없습니다.</p></div>
        {:else}
            <div class="bar-chart">
                {#each ingredientFrequency as [ing, count]}
                    <div class="bar-row">
                        <span class="bar-label">{ing}</span>
                        <div class="bar-track">
                            <div
                                class="bar-fill"
                                style="width: {(count / maxFreq) *
                                    100}%; background: linear-gradient(90deg, #20c997, #12b886);"
                            ></div>
                        </div>
                        <span class="bar-value">{count}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Untagged Menus -->
    {#if noIngredientMenus.length > 0}
        <div class="stats-section">
            <h3 class="stats-section-title">⚠️ 재료 미지정 메뉴</h3>
            <div class="untagged-list">
                {#each noIngredientMenus as item}
                    <span class="untagged-item">{item.name}</span>
                {/each}
            </div>
        </div>
    {/if}
</div>
