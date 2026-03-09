<script lang="ts">
    import { onMount } from "svelte";
    import { fetchCategories } from "$lib/services/categories";
    import { fetchMenuItems } from "$lib/services/menuItems";
    import { fetchMealData } from "$lib/services/mealData";
    import type { Category, MenuItem, MealEntry } from "$lib/types/models";

    let categories: Category[] = [];
    let menuItems: MenuItem[] = [];
    let mealData: Record<string, MealEntry[]> = {};
    let loading = true;

    onMount(async () => {
        [categories, menuItems, mealData] = await Promise.all([
            fetchCategories(),
            fetchMenuItems(),
            fetchMealData(),
        ]);
        loading = false;
    });

    // ── 요약 ──
    $: totalMenus = menuItems.length;
    $: daysWithData = Object.values(mealData).filter((m) => m.length > 0).length;
    $: totalServings = Object.values(mealData).reduce((s, m) => s + m.length, 0);
    $: totalIngredients = new Set(menuItems.flatMap((m) => m.ingredients ?? [])).size;

    // ── 카테고리 색상 조회 ──
    function getCategoryColor(menuName: string): string {
        const item = menuItems.find((m) => m.name === menuName);
        const cat = categories.find((c) => c.id === item?.category_id);
        return cat?.color ?? "#ced4da";
    }

    // ── 자주 먹은 메뉴 TOP 10 (meal_data 기반) ──
    $: menuUsageFreq = (() => {
        const cnt: Record<string, number> = {};
        Object.values(mealData)
            .flat()
            .forEach((entry) => {
                cnt[entry.name] = (cnt[entry.name] ?? 0) + 1;
            });
        return Object.entries(cnt)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    })();
    $: maxMenuFreq = menuUsageFreq[0]?.[1] ?? 1;

    // ── 카테고리별 식단 제공 횟수 (meal_data 기반) ──
    $: categoryServingDist = (() => {
        const cnt = new Map<string, { count: number; color: string }>();
        Object.values(mealData)
            .flat()
            .forEach((entry) => {
                const cat =
                    entry.category_id != null
                        ? categories.find((c) => c.id === entry.category_id)
                        : null;
                const key = cat?.name ?? "미분류";
                const color = cat?.color ?? "#ced4da";
                const prev = cnt.get(key) ?? { count: 0, color };
                cnt.set(key, { count: prev.count + 1, color });
            });
        return [...cnt.entries()]
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.count - a.count);
    })();
    $: maxCatServing = categoryServingDist[0]?.count ?? 1;

    // ── 카테고리별 등록 메뉴 수 (menuItems 기반) ──
    $: categoryMenuCount = (() => {
        const cnt = new Map<string, { count: number; color: string }>();
        for (const cat of categories) {
            cnt.set(cat.name, { count: 0, color: cat.color });
        }
        for (const item of menuItems) {
            const cat = categories.find((c) => c.id === item.category_id);
            const key = cat?.name ?? "미분류";
            const color = cat?.color ?? "#ced4da";
            const prev = cnt.get(key) ?? { count: 0, color };
            cnt.set(key, { count: prev.count + 1, color });
        }
        return [...cnt.entries()]
            .map(([name, v]) => ({ name, ...v }))
            .filter((x) => x.count > 0)
            .sort((a, b) => b.count - a.count);
    })();
    $: maxCatMenuCount = categoryMenuCount[0]?.count ?? 1;

    // ── 요일별 패턴 ──
    const WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
    $: weekdayPattern = (() => {
        const totals = [0, 0, 0, 0, 0, 0, 0];
        const days = [0, 0, 0, 0, 0, 0, 0];
        Object.entries(mealData).forEach(([date, menus]) => {
            if (!menus.length) return;
            const wd = new Date(date + "T00:00:00").getDay();
            totals[wd] += menus.length;
            days[wd]++;
        });
        return WEEK_LABELS.map((label, i) => ({
            label,
            avg: days[i] > 0 ? +(totals[i] / days[i]).toFixed(1) : 0,
            days: days[i],
        }));
    })();
    $: maxWeekAvg = Math.max(...weekdayPattern.map((w) => w.avg), 0.01);

    // ── 월별 추이 (최근 6개월) ──
    $: monthlyTrend = (() => {
        const map: Record<string, number> = {};
        Object.entries(mealData).forEach(([date, menus]) => {
            if (!menus.length) return;
            const ym = date.slice(0, 7);
            map[ym] = (map[ym] ?? 0) + menus.length;
        });
        return Object.entries(map)
            .sort()
            .slice(-6)
            .map(([ym, count]) => ({
                label: `${parseInt(ym.slice(5))}월`,
                count,
                key: ym,
            }));
    })();
    $: maxMonthly = Math.max(...monthlyTrend.map((m) => m.count), 1);

    // ── 재료 사용 빈도 TOP 10 ──
    $: ingredientFreq = (() => {
        const cnt: Record<string, number> = {};
        menuItems.forEach((m) =>
            (m.ingredients ?? []).forEach((ing) => {
                cnt[ing] = (cnt[ing] ?? 0) + 1;
            }),
        );
        return Object.entries(cnt)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    })();
    $: maxIngFreq = ingredientFreq[0]?.[1] ?? 1;

    // ── 재료 미지정 메뉴 ──
    $: noIngredientMenus = menuItems.filter(
        (m) => !m.ingredients || m.ingredients.length === 0,
    );
</script>

<div class="stats-root">
    {#if loading}
        <div class="stats-loading">
            <div class="loading-spinner"></div>
            <p>데이터 불러오는 중...</p>
        </div>
    {:else}
        <!-- ── 요약 카드 ── -->
        <div class="summary-row">
            <div class="summary-card">
                <div class="summary-icon">🍽️</div>
                <div class="summary-number">{totalMenus}</div>
                <div class="summary-label">등록된 메뉴</div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">📅</div>
                <div class="summary-number">{daysWithData}</div>
                <div class="summary-label">식단 기록일</div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">🥢</div>
                <div class="summary-number">{totalServings}</div>
                <div class="summary-label">총 식사 횟수</div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">🥕</div>
                <div class="summary-number">{totalIngredients}</div>
                <div class="summary-label">재료 종류</div>
            </div>
        </div>

        <!-- ── Row 2: 자주 먹은 메뉴 + 카테고리별 식단 횟수 ── -->
        <div class="stats-row">
            <div class="stats-card">
                <h3 class="card-title">자주 먹은 메뉴 TOP 10</h3>
                {#if menuUsageFreq.length === 0}
                    <p class="chart-empty">식단 기록이 없습니다.</p>
                {:else}
                    <div class="h-bar-list">
                        {#each menuUsageFreq as [name, count]}
                            <div class="h-bar-row">
                                <span class="h-bar-label">{name}</span>
                                <div class="h-bar-track">
                                    <div
                                        class="h-bar-fill"
                                        style="width:{(count / maxMenuFreq) * 100}%; background:{getCategoryColor(name)};"
                                    ></div>
                                </div>
                                <span class="h-bar-value">{count}회</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <div class="stats-card">
                <h3 class="card-title">카테고리별 식단 제공 횟수</h3>
                {#if categoryServingDist.length === 0}
                    <p class="chart-empty">식단 기록이 없습니다.</p>
                {:else}
                    <div class="h-bar-list">
                        {#each categoryServingDist as item}
                            <div class="h-bar-row">
                                <span class="h-bar-label">{item.name}</span>
                                <div class="h-bar-track">
                                    <div
                                        class="h-bar-fill"
                                        style="width:{(item.count / maxCatServing) * 100}%; background:{item.color};"
                                    ></div>
                                </div>
                                <span class="h-bar-value">{item.count}회</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- ── Row 3: 요일 패턴 + 월별 추이 ── -->
        <div class="stats-row">
            <div class="stats-card">
                <h3 class="card-title">요일별 평균 식사 수</h3>
                {#if daysWithData === 0}
                    <p class="chart-empty">식단 기록이 없습니다.</p>
                {:else}
                    <div class="v-bar-chart">
                        {#each weekdayPattern as w, i}
                            <div class="v-bar-col">
                                <span class="v-bar-top-label">{w.avg > 0 ? w.avg : ""}</span>
                                <div class="v-bar-track">
                                    <div
                                        class="v-bar-fill"
                                        class:accent-sun={i === 0}
                                        class:accent-sat={i === 6}
                                        style="height:{(w.avg / maxWeekAvg) * 100}%;"
                                    ></div>
                                </div>
                                <span
                                    class="v-bar-label"
                                    class:label-sun={i === 0}
                                    class:label-sat={i === 6}
                                >{w.label}</span>
                                <span class="v-bar-sub">{w.days > 0 ? `${w.days}일` : "-"}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <div class="stats-card">
                <h3 class="card-title">월별 식사 횟수 (최근 6개월)</h3>
                {#if monthlyTrend.length === 0}
                    <p class="chart-empty">식단 기록이 없습니다.</p>
                {:else}
                    <div class="v-bar-chart">
                        {#each monthlyTrend as m}
                            <div class="v-bar-col">
                                <span class="v-bar-top-label">{m.count}</span>
                                <div class="v-bar-track">
                                    <div
                                        class="v-bar-fill accent-month"
                                        style="height:{(m.count / maxMonthly) * 100}%;"
                                    ></div>
                                </div>
                                <span class="v-bar-label">{m.label}</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- ── Row 4: 카테고리별 등록 메뉴 수 + 재료 빈도 ── -->
        <div class="stats-row">
            <div class="stats-card">
                <h3 class="card-title">카테고리별 등록 메뉴 수</h3>
                {#if categoryMenuCount.length === 0}
                    <p class="chart-empty">메뉴를 등록해주세요.</p>
                {:else}
                    <div class="h-bar-list">
                        {#each categoryMenuCount as item}
                            <div class="h-bar-row">
                                <span class="h-bar-label">{item.name}</span>
                                <div class="h-bar-track">
                                    <div
                                        class="h-bar-fill"
                                        style="width:{(item.count / maxCatMenuCount) * 100}%; background:{item.color};"
                                    ></div>
                                </div>
                                <span class="h-bar-value">{item.count}개</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <div class="stats-card">
                <h3 class="card-title">재료 사용 빈도 TOP 10</h3>
                {#if ingredientFreq.length === 0}
                    <p class="chart-empty">메뉴에 재료를 등록해보세요.</p>
                {:else}
                    <div class="h-bar-list">
                        {#each ingredientFreq as [ing, count]}
                            <div class="h-bar-row">
                                <span class="h-bar-label">{ing}</span>
                                <div class="h-bar-track">
                                    <div
                                        class="h-bar-fill accent-ing"
                                        style="width:{(count / maxIngFreq) * 100}%;"
                                    ></div>
                                </div>
                                <span class="h-bar-value">{count}개</span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- ── Row 5: 재료 미지정 메뉴 ── -->
        {#if noIngredientMenus.length > 0}
            <div class="stats-card full-width">
                <h3 class="card-title">⚠️ 재료 미지정 메뉴 ({noIngredientMenus.length})</h3>
                <div class="tag-list">
                    {#each noIngredientMenus as item}
                        <span class="tag-item">{item.name}</span>
                    {/each}
                </div>
            </div>
        {/if}
    {/if}
</div>

<style>
    /* ── 루트 레이아웃 ── */
    .stats-root {
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
        height: 100%;
        box-sizing: border-box;
        background: #f5f5f7;
    }

    /* ── 로딩 ── */
    .stats-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 12px;
        color: #888;
        font-size: 0.9rem;
    }

    .loading-spinner {
        width: 28px;
        height: 28px;
        border: 3px solid #e0e0e0;
        border-top-color: #007aff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* ── 요약 카드 ── */
    .summary-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
    }

    .summary-card {
        background: white;
        border-radius: 12px;
        border: 1px solid #e8e8e8;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }

    .summary-icon {
        font-size: 1.4rem;
        margin-bottom: 4px;
    }

    .summary-number {
        font-size: 1.8rem;
        font-weight: 700;
        color: #1c1c1e;
        line-height: 1;
    }

    .summary-label {
        font-size: 0.75rem;
        color: #888;
        font-weight: 500;
    }

    /* ── 통계 행 (2열) ── */
    .stats-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
    }

    /* ── 통계 카드 ── */
    .stats-card {
        background: white;
        border-radius: 12px;
        border: 1px solid #e8e8e8;
        padding: 16px 18px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .stats-card.full-width {
        /* no extra rules needed — inherits flex-direction: column */
    }

    .card-title {
        margin: 0;
        font-size: 0.82rem;
        font-weight: 700;
        color: #555;
        letter-spacing: 0.01em;
    }

    .chart-empty {
        margin: 0;
        font-size: 0.8rem;
        color: #bbb;
        text-align: center;
        padding: 16px 0;
    }

    /* ── 가로 바 차트 ── */
    .h-bar-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
    }

    .h-bar-row {
        display: grid;
        grid-template-columns: 100px 1fr 44px;
        align-items: center;
        gap: 8px;
    }

    .h-bar-label {
        font-size: 0.78rem;
        color: #444;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .h-bar-track {
        background: #f0f0f0;
        border-radius: 4px;
        height: 10px;
        overflow: hidden;
    }

    .h-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.4s ease;
        opacity: 0.85;
    }

    .accent-ing {
        background: linear-gradient(90deg, #20c997, #12b886);
    }

    .h-bar-value {
        font-size: 0.72rem;
        color: #888;
        text-align: right;
        white-space: nowrap;
    }

    /* ── 세로 바 차트 ── */
    .v-bar-chart {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        height: 160px;
    }

    .v-bar-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
        gap: 3px;
    }

    .v-bar-top-label {
        font-size: 0.65rem;
        color: #888;
        height: 14px;
        line-height: 14px;
        flex-shrink: 0;
    }

    .v-bar-track {
        flex: 1;
        width: 100%;
        background: #f0f0f0;
        border-radius: 5px 5px 3px 3px;
        display: flex;
        align-items: flex-end;
        overflow: hidden;
    }

    .v-bar-fill {
        width: 100%;
        background: #339AF0;
        border-radius: 5px 5px 0 0;
        transition: height 0.4s ease;
    }

    .v-bar-fill.accent-sun { background: #ff5f56; }
    .v-bar-fill.accent-sat { background: #339AF0; }
    .v-bar-fill.accent-month { background: #7950f2; }

    .v-bar-label {
        font-size: 0.72rem;
        color: #555;
        font-weight: 600;
        flex-shrink: 0;
    }

    .v-bar-label.label-sun { color: #ff5f56; }
    .v-bar-label.label-sat { color: #339AF0; }

    .v-bar-sub {
        font-size: 0.6rem;
        color: #bbb;
        flex-shrink: 0;
    }

    /* ── 태그 목록 ── */
    .tag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .tag-item {
        font-size: 0.78rem;
        padding: 3px 10px;
        background: #fff8e1;
        color: #856404;
        border: 1px solid #ffe082;
        border-radius: 12px;
    }
</style>
