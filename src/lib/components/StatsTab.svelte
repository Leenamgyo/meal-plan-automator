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
    $: avgServings = daysWithData > 0 ? +(totalServings / daysWithData).toFixed(1) : 0;

    $: currentStreak = (() => {
        const today = new Date();
        let streak = 0;
        for (let i = 0; i < 730; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            if (mealData[key]?.length > 0) streak++;
            else break;
        }
        return streak;
    })();

    function getCategoryColor(menuName: string): string {
        const item = menuItems.find((m) => m.name === menuName);
        const cat = categories.find((c) => c.id === item?.category_id);
        return cat?.color ?? "#ced4da";
    }

    // ── 자주 먹은 메뉴 TOP 10 ──
    $: menuUsageFreq = (() => {
        const cnt: Record<string, number> = {};
        Object.values(mealData).flat().forEach((entry) => {
            cnt[entry.name] = (cnt[entry.name] ?? 0) + 1;
        });
        return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 10);
    })();
    $: maxMenuFreq = menuUsageFreq[0]?.[1] ?? 1;

    // ── 카테고리별 식단 제공 횟수 ──
    $: categoryServingDist = (() => {
        const cnt = new Map<string, { count: number; color: string }>();
        Object.values(mealData).flat().forEach((entry) => {
            const cat = entry.category_id != null ? categories.find((c) => c.id === entry.category_id) : null;
            const key = cat?.name ?? "미분류";
            const color = cat?.color ?? "#ced4da";
            const prev = cnt.get(key) ?? { count: 0, color };
            cnt.set(key, { count: prev.count + 1, color });
        });
        return [...cnt.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count);
    })();
    $: maxCatServing = categoryServingDist[0]?.count ?? 1;

    // ── 카테고리별 등록 메뉴 수 ──
    $: categoryMenuCount = (() => {
        const cnt = new Map<string, { count: number; color: string }>();
        for (const cat of categories) cnt.set(cat.name, { count: 0, color: cat.color });
        for (const item of menuItems) {
            const cat = categories.find((c) => c.id === item.category_id);
            const key = cat?.name ?? "미분류";
            const color = cat?.color ?? "#ced4da";
            const prev = cnt.get(key) ?? { count: 0, color };
            cnt.set(key, { count: prev.count + 1, color });
        }
        return [...cnt.entries()].map(([name, v]) => ({ name, ...v })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
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
        return Object.entries(map).sort().slice(-6).map(([ym, count]) => ({
            label: `${parseInt(ym.slice(5))}월`,
            count,
            key: ym,
        }));
    })();
    $: maxMonthly = Math.max(...monthlyTrend.map((m) => m.count), 1);

    // ── 재료 사용 빈도 TOP 10 ──
    $: ingredientFreq = (() => {
        const cnt: Record<string, number> = {};
        menuItems.forEach((m) => (m.ingredients ?? []).forEach((ing) => {
            cnt[ing] = (cnt[ing] ?? 0) + 1;
        }));
        return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 10);
    })();
    $: maxIngFreq = ingredientFreq[0]?.[1] ?? 1;

    // ── 재료 미지정 메뉴 ──
    $: noIngredientMenus = menuItems.filter((m) => !m.ingredients || m.ingredients.length === 0);
</script>

<div class="h-full overflow-y-auto custom-scrollbar bg-surface no-drag">
    <div class="max-w-6xl mx-auto p-8 space-y-8">

        <!-- 헤더 -->
        <header>
            <span class="text-primary font-bold tracking-widest text-xs uppercase block mb-1">Analytics</span>
            <h1 class="text-4xl font-extrabold tracking-tight text-on-surface font-headline">식단 통계</h1>
        </header>

        {#if loading}
            <div class="flex flex-col items-center justify-center py-40 gap-4">
                <span class="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
                <p class="text-on-surface-variant font-medium">데이터 불러오는 중...</p>
            </div>
        {:else}

            <!-- ── Row 1: 요약 카드 ── -->
            <div class="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm text-center">
                    <div class="text-xs font-bold uppercase tracking-widest text-outline mb-3">메뉴</div>
                    <div class="text-3xl font-black text-on-surface">{totalMenus}</div>
                    <div class="text-[10px] font-bold text-on-surface-variant mt-1">등록된 메뉴</div>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm text-center">
                    <div class="text-xs font-bold uppercase tracking-widest text-outline mb-3">기록</div>
                    <div class="text-3xl font-black text-on-surface">{daysWithData}</div>
                    <div class="text-[10px] font-bold text-on-surface-variant mt-1">식단 기록일</div>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm text-center">
                    <div class="text-xs font-bold uppercase tracking-widest text-outline mb-3">총량</div>
                    <div class="text-3xl font-black text-on-surface">{totalServings}</div>
                    <div class="text-[10px] font-bold text-on-surface-variant mt-1">총 식사 횟수</div>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm text-center">
                    <div class="text-xs font-bold uppercase tracking-widest text-outline mb-3">평균</div>
                    <div class="text-3xl font-black text-on-surface">{avgServings}</div>
                    <div class="text-[10px] font-bold text-on-surface-variant mt-1">일 평균 식수</div>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm text-center">
                    <div class="text-xs font-bold uppercase tracking-widest text-outline mb-3">재료</div>
                    <div class="text-3xl font-black text-on-surface">{totalIngredients}</div>
                    <div class="text-[10px] font-bold text-on-surface-variant mt-1">재료 종류</div>
                </div>
                <div class="bg-primary-container text-on-primary-container rounded-2xl p-5 shadow-lg shadow-primary/20 text-center relative overflow-hidden">
                    <div class="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-2xl"></div>
                    <div class="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">연속</div>
                    <div class="text-3xl font-black">{currentStreak}</div>
                    <div class="text-[10px] font-black uppercase tracking-widest mt-1">연속 기록 🔥</div>
                </div>
            </div>

            <!-- ── Row 2: 자주 먹은 메뉴 + 카테고리별 식단 횟수 ── -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-black text-on-surface">자주 먹은 메뉴 TOP 10</h3>
                        <span class="material-symbols-outlined text-primary text-lg">restaurant</span>
                    </div>
                    {#if menuUsageFreq.length === 0}
                        <p class="text-sm text-outline text-center py-8">식단 기록이 없습니다.</p>
                    {:else}
                        <div class="space-y-3">
                            {#each menuUsageFreq as [name, count]}
                                <div class="space-y-1">
                                    <div class="flex justify-between items-end">
                                        <span class="text-xs font-bold text-on-surface truncate max-w-[60%]">{name}</span>
                                        <span class="text-[10px] font-black text-on-surface-variant">{count}회</span>
                                    </div>
                                    <div class="h-3 bg-surface-container-low rounded-full overflow-hidden">
                                        <div class="h-full rounded-full transition-all duration-700"
                                             style="width: {(count / maxMenuFreq) * 100}%; background-color: {getCategoryColor(name)}"></div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </section>

                <section class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-black text-on-surface">카테고리별 식단 제공 횟수</h3>
                        <span class="material-symbols-outlined text-secondary text-lg">category</span>
                    </div>
                    {#if categoryServingDist.length === 0}
                        <p class="text-sm text-outline text-center py-8">식단 기록이 없습니다.</p>
                    {:else}
                        <div class="space-y-3">
                            {#each categoryServingDist as item}
                                <div class="space-y-1">
                                    <div class="flex justify-between items-end">
                                        <span class="text-xs font-bold text-on-surface">{item.name}</span>
                                        <span class="text-[10px] font-black text-on-surface-variant">{item.count}회</span>
                                    </div>
                                    <div class="h-3 bg-surface-container-low rounded-full overflow-hidden">
                                        <div class="h-full rounded-full transition-all duration-700"
                                             style="width: {(item.count / maxCatServing) * 100}%; background-color: {item.color}"></div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </section>
            </div>

            <!-- ── Row 3: 요일별 패턴 + 월별 추이 ── -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-black text-on-surface">요일별 평균 식사 수</h3>
                        <span class="material-symbols-outlined text-tertiary text-lg">calendar_view_week</span>
                    </div>
                    {#if daysWithData === 0}
                        <p class="text-sm text-outline text-center py-8">식단 기록이 없습니다.</p>
                    {:else}
                        <div class="flex items-end gap-2 h-36">
                            {#each weekdayPattern as w, i}
                                <div class="flex-1 flex flex-col items-center gap-1 h-full">
                                    <span class="text-[9px] text-on-surface-variant font-bold">{w.avg > 0 ? w.avg : ""}</span>
                                    <div class="w-full flex-1 bg-surface-container-low rounded-t-lg flex items-end overflow-hidden">
                                        <div class="w-full rounded-t-lg transition-all duration-700"
                                             style="height: {(w.avg / maxWeekAvg) * 100}%; background-color: {i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#006e1c'}"></div>
                                    </div>
                                    <span class="text-[10px] font-black"
                                          style="color: {i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : '#3f4a3c'}">{w.label}</span>
                                    <span class="text-[9px] text-outline">{w.days > 0 ? `${w.days}일` : "-"}</span>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </section>

                <section class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-black text-on-surface">월별 식사 횟수 (최근 6개월)</h3>
                        <span class="material-symbols-outlined text-primary text-lg">trending_up</span>
                    </div>
                    {#if monthlyTrend.length === 0}
                        <p class="text-sm text-outline text-center py-8">식단 기록이 없습니다.</p>
                    {:else}
                        <div class="flex items-end gap-2 h-36">
                            {#each monthlyTrend as m}
                                <div class="flex-1 flex flex-col items-center gap-1 h-full">
                                    <span class="text-[9px] text-on-surface-variant font-bold">{m.count}</span>
                                    <div class="w-full flex-1 bg-surface-container-low rounded-t-lg flex items-end overflow-hidden">
                                        <div class="w-full rounded-t-lg transition-all duration-700 bg-tertiary"
                                             style="height: {(m.count / maxMonthly) * 100}%"></div>
                                    </div>
                                    <span class="text-[10px] font-black text-on-surface-variant">{m.label}</span>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </section>
            </div>

            <!-- ── Row 4: 카테고리별 등록 메뉴 수 + 재료 빈도 ── -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-black text-on-surface">카테고리별 등록 메뉴 수</h3>
                        <span class="material-symbols-outlined text-outline text-lg">menu_book</span>
                    </div>
                    {#if categoryMenuCount.length === 0}
                        <p class="text-sm text-outline text-center py-8">메뉴를 등록해주세요.</p>
                    {:else}
                        <div class="space-y-3">
                            {#each categoryMenuCount as item}
                                <div class="space-y-1">
                                    <div class="flex justify-between items-end">
                                        <span class="text-xs font-bold text-on-surface">{item.name}</span>
                                        <span class="text-[10px] font-black text-on-surface-variant">{item.count}개</span>
                                    </div>
                                    <div class="h-3 bg-surface-container-low rounded-full overflow-hidden">
                                        <div class="h-full rounded-full transition-all duration-700"
                                             style="width: {(item.count / maxCatMenuCount) * 100}%; background-color: {item.color}"></div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </section>

                <section class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-black text-on-surface">재료 사용 빈도 TOP 10</h3>
                        <span class="material-symbols-outlined text-secondary text-lg">eco</span>
                    </div>
                    {#if ingredientFreq.length === 0}
                        <p class="text-sm text-outline text-center py-8">메뉴에 재료를 등록해보세요.</p>
                    {:else}
                        <div class="space-y-3">
                            {#each ingredientFreq as [ing, count]}
                                <div class="space-y-1">
                                    <div class="flex justify-between items-end">
                                        <span class="text-xs font-bold text-on-surface">{ing}</span>
                                        <span class="text-[10px] font-black text-on-surface-variant">{count}개</span>
                                    </div>
                                    <div class="h-3 bg-surface-container-low rounded-full overflow-hidden">
                                        <div class="h-full rounded-full transition-all duration-700 bg-secondary"
                                             style="width: {(count / maxIngFreq) * 100}%"></div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </section>
            </div>

            <!-- ── Row 5: 재료 미지정 메뉴 ── -->
            {#if noIngredientMenus.length > 0}
                <section class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="text-sm font-black text-on-surface">
                            재료 미지정 메뉴
                            <span class="ml-2 text-xs font-bold text-error bg-error-container px-2 py-0.5 rounded-full">{noIngredientMenus.length}</span>
                        </h3>
                        <span class="material-symbols-outlined text-error text-lg">warning</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        {#each noIngredientMenus as item}
                            <span class="text-xs px-3 py-1.5 bg-error-container text-error rounded-full font-bold">{item.name}</span>
                        {/each}
                    </div>
                </section>
            {/if}

        {/if}
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e1e3e4; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #becab9; }
</style>
