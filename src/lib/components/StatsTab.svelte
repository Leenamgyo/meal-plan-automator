<script lang="ts">
    import { onMount } from "svelte";

    interface MenuItem {
        id: string;
        name: string;
        tags: string[];
    }

    let menuItems: MenuItem[] = [];

    onMount(() => {
        const saved = localStorage.getItem("menuItems");
        if (saved) menuItems = JSON.parse(saved);
    });

    $: totalMenus = menuItems.length;
    $: allTags = [...new Set(menuItems.flatMap((m) => m.tags))];
    $: totalTags = allTags.length;

    // Tag frequency (top 10)
    $: tagFrequency = (() => {
        const freq: Record<string, number> = {};
        menuItems.forEach((m) =>
            m.tags.forEach((t) => {
                freq[t] = (freq[t] || 0) + 1;
            }),
        );
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    })();

    $: maxFreq = tagFrequency.length > 0 ? tagFrequency[0][1] : 1;

    // Menus without tags
    $: untaggedMenus = menuItems.filter((m) => m.tags.length === 0);
</script>

<div class="stats-tab">
    <!-- Summary Cards -->
    <div class="stats-summary">
        <div class="stat-card">
            <div class="stat-number">{totalMenus}</div>
            <div class="stat-label">전체 메뉴</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{totalTags}</div>
            <div class="stat-label">태그 종류</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">{untaggedMenus.length}</div>
            <div class="stat-label">미분류 메뉴</div>
        </div>
    </div>

    <!-- Tag Frequency Chart -->
    <div class="stats-section">
        <h3 class="stats-section-title">📊 태그별 메뉴 수 (상위 10개)</h3>
        {#if tagFrequency.length === 0}
            <div class="empty-state"><p>아직 데이터가 없습니다.</p></div>
        {:else}
            <div class="bar-chart">
                {#each tagFrequency as [tag, count]}
                    <div class="bar-row">
                        <span class="bar-label">{tag}</span>
                        <div class="bar-track">
                            <div
                                class="bar-fill"
                                style="width: {(count / maxFreq) * 100}%;"
                            ></div>
                        </div>
                        <span class="bar-value">{count}</span>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- Untagged Menus -->
    {#if untaggedMenus.length > 0}
        <div class="stats-section">
            <h3 class="stats-section-title">⚠️ 태그 미지정 메뉴</h3>
            <div class="untagged-list">
                {#each untaggedMenus as item}
                    <span class="untagged-item">{item.name}</span>
                {/each}
            </div>
        </div>
    {/if}
</div>
