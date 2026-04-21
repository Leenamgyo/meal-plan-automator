<script lang="ts">
    import { onMount } from "svelte";
    import { cubicOut } from "svelte/easing";

    function panelSlide(
        node: Element,
        { duration = 260 }: { duration?: number } = {},
    ) {
        return {
            duration,
            easing: cubicOut,
            css: (t: number) => `transform: translateX(${(1 - t) * 100}%);`,
        };
    }
    import { fetchCategories } from "$lib/services/categories";
    import { fetchMenuItems } from "$lib/services/menuItems";
    import { fetchMealData, saveMealForDate } from "$lib/services/mealData";
    import { fetchPrompts } from "$lib/services/prompts";
    import type {
        Category,
        MenuItem,
        MealEntry,
        Prompt,
    } from "$lib/types/models";
    import type { CalendarDay } from "$lib/types/ui";
    import {
        buildCalendarDays,
        dateKey as _dateKey,
        isToday as _isToday,
    } from "$lib/utils/calendarUtils";
    import {
        getWindowDates,
        buildAvailableMenusText,
        buildRecentMealsText,
        calculateMenuScores,
        formatScoreTable,
        parseAIMenuResponse,
    } from "$lib/services/mealGeneration";
    import { geminiKey } from "$lib/stores";
    import { showSuccess } from "$lib/stores";
    import { askGemini, suggestCombos } from "$lib/services/mealService";
    import { fetchCombos, createCombo } from "$lib/services/combos";
    import type { Combo } from "$lib/types/models";
    import html2canvas from "html2canvas";

    let currentDate = new Date();
    let mealData: Record<string, MealEntry[]> = {};
    let categories: Category[] = [];
    let menuItems: MenuItem[] = [];
    let prompts: Prompt[] = [];
    let combos: Combo[] = [];

    // Panel State
    let selectedDate: string | null = null;
    let searchInput = "";
    let activeCategoryFilter: number | null = null;
    let sidebarTab: "explore" | "selected" = "explore";
    let showPanel = true;

    // AI Generation State
    let isAILoading = false;

    interface ComboOption {
        title: string;
        description: string;
        entries: MealEntry[];
        menuIds: number[];
    }
    let aiOptions: ComboOption[] = [];
    let selectedOptionIdx: number | null = null;
    let registeredOptionIndices: number[] = [];

    // ── Infinite Scroll ────────────────────────────────────
    const MENU_PAGE_SIZE = 20;
    let visibleMenuCount = MENU_PAGE_SIZE;

    // 검색/필터 변경 시 visibleMenuCount 리셋
    let _prevFilterKey = "";
    $: {
        const key = `${searchInput}|${activeCategoryFilter}`;
        if (key !== _prevFilterKey) {
            _prevFilterKey = key;
            visibleMenuCount = MENU_PAGE_SIZE;
        }
    }

    $: visibleMenuItems = sortedMenuItems.slice(0, visibleMenuCount);
    $: hasMoreMenus = sortedMenuItems.length > visibleMenuCount;

    function loadMoreMenus() {
        if (hasMoreMenus) {
            visibleMenuCount = Math.min(
                visibleMenuCount + MENU_PAGE_SIZE,
                sortedMenuItems.length,
            );
        }
    }

    /** IntersectionObserver 기반 무한 스크롤 액션 */
    function infiniteScroll(
        node: HTMLElement,
        params: { loadMore: () => void },
    ) {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) params.loadMore();
            },
            { threshold: 0.1 },
        );
        observer.observe(node);
        return {
            destroy() {
                observer.disconnect();
            },
        };
    }

    // ── AI Combo Suggestion ────────────────────────────────
    interface ComboSuggestion {
        name: string;
        items: string[];
    }
    let aiCombos: ComboSuggestion[] = [];
    let isLoadingCombo = false;

    function parseComboResponse(
        raw: string,
        allMenuNames: string[],
    ): ComboSuggestion[] {
        return raw
            .split("\n")
            .map((line) => line.match(/^\[(.+?)\][:：]\s*(.+)$/))
            .filter(Boolean)
            .map((m) => ({
                name: m![1].trim(),
                items: m![2]
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => allMenuNames.includes(s)),
            }))
            .filter((c) => c.items.length > 0);
    }

    async function generateAICombo() {
        if (isLoadingCombo) return;
        const apiKey = $geminiKey;
        if (!apiKey) {
            alert("환경설정에서 Gemini API 키를 먼저 입력해주세요.");
            return;
        }
        isLoadingCombo = true;
        try {
            const raw = await suggestCombos(
                menuItems,
                categories,
                apiKey,
                prompts,
            );
            const allMenuNames = menuItems.map((m) => m.name);
            aiCombos = parseComboResponse(raw, allMenuNames);
            if (aiCombos.length === 0)
                showSuccess("추천 결과를 파싱하지 못했습니다.");
        } catch (e: any) {
            alert(`오류: ${e.message}`);
        } finally {
            isLoadingCombo = false;
        }
    }

    function addComboToDate(combo: ComboSuggestion) {
        if (!selectedDate) {
            alert("먼저 날짜를 선택해주세요.");
            return;
        }
        for (const itemName of combo.items) {
            addMealToDate(itemName);
        }
        showSuccess(`"${combo.name}" 배정 완료`);
    }

    // ── AI Combo Option Generation ──────────────────────────
    function buildExistingCombosText(): string {
        const active = combos.filter((c) => c.is_active);
        if (active.length === 0) return "(등록된 콤보 없음)";
        return active
            .map((c) => `${c.name}: ${(c.items ?? []).map((i) => i.name).join(", ")}`)
            .join("\n");
    }

    function parseComboOptions(
        response: string,
        allMenuNames: string[],
    ): ComboOption[] {
        const blocks = response.split(/\[콤보\d+\]/);
        const options: ComboOption[] = [];

        for (const block of blocks) {
            if (!block.trim()) continue;
            const titleMatch = block.match(/^제목[:：]\s*(.+)$/m);
            const descMatch = block.match(/^설명[:：]\s*(.+)$/m);
            const menuMatch = block.match(/^메뉴[:：]\s*(.+)$/m);
            if (!menuMatch) continue;

            const title = titleMatch?.[1].trim() ?? "AI 추천";
            const description = descMatch?.[1].trim() ?? "";
            // parseAIMenuResponse already deduplicates, but explicitly unique by name
            const rawNames = parseAIMenuResponse(menuMatch[1], allMenuNames);
            const names = [...new Set(rawNames)];
            if (names.length === 0) continue;

            const entries = names.map(menuNameToEntry);
            const menuIds = names
                .map((n) => menuItems.find((m) => m.name === n)?.id)
                .filter((id): id is number => id != null);

            options.push({ title, description, entries, menuIds });
        }

        return options;
    }

    async function generateAIMenus() {
        if (isAILoading) return;
        const apiKey = $geminiKey;
        if (!apiKey) {
            alert("환경설정에서 Gemini API 키를 먼저 입력해주세요.");
            return;
        }

        const count = parseInt(
            localStorage.getItem("aiRecommendCount") || "5",
            10,
        );
        const autoGenPrompt =
            prompts.find((p) => p.id === "auto_gen")?.content ?? "";
        if (!autoGenPrompt) {
            alert("AI 프롬프트를 불러오지 못했습니다. 앱을 재시작해주세요.");
            return;
        }

        isAILoading = true;
        aiOptions = [];
        selectedOptionIdx = null;
        registeredOptionIndices = [];
        try {
            const targetDate = selectedDate ?? new Date().toISOString().split("T")[0];
            const mealDataNames: Record<string, string[]> =
                Object.fromEntries(
                    Object.entries(mealData).map(([d, entries]) => [
                        d,
                        entries.map((e) => e.name),
                    ]),
                );
            const windowDates = getWindowDates(mealDataNames, targetDate);
            const availableMenusText = buildAvailableMenusText(
                menuItems,
                categories,
            );
            const recentMealsText = buildRecentMealsText(
                mealDataNames,
                targetDate,
                windowDates,
            );
            const existingCombosText = buildExistingCombosText();
            const allMenuNames = menuItems.map((m) => m.name);

            const promptStr = autoGenPrompt
                .replace("{count}", String(count))
                .replace("{availableMenusText}", availableMenusText)
                .replace("{existingCombosText}", existingCombosText)
                .replace("{recentMealsText}", recentMealsText);

            const response = await askGemini(
                promptStr,
                apiKey,
                allMenuNames,
                prompts,
            );
            const options = parseComboOptions(response, allMenuNames);

            if (options.length === 0) {
                alert("AI 추천 결과가 유효하지 않습니다. 메뉴 목록을 확인해주세요.");
                return;
            }

            aiOptions = options;
        } catch (e: any) {
            alert(`AI 추천 오류: ${e.message}`);
        } finally {
            isAILoading = false;
        }
    }

    function applyOptionToDate(option: ComboOption) {
        if (!selectedDate) {
            alert("날짜를 먼저 선택해주세요.");
            return;
        }
        mealData = { ...mealData, [selectedDate]: option.entries };
        saveMealForDate(selectedDate, option.entries);
        showSuccess(`${option.entries.length}개 메뉴 배정 완료`);
        aiOptions = [];
        selectedOptionIdx = null;
    }

    function hasDuplicateComposition(menuIds: number[]): boolean {
        const newSet = new Set(menuIds);
        return combos.some((c) => {
            if (!c.is_active) return false;
            const existingIds = (c.items ?? []).map((i) => i.id);
            if (existingIds.length !== newSet.size) return false;
            return existingIds.every((id) => newSet.has(id));
        });
    }

    // ── Today label for AI modal header ───────────────────
    const todayKey = new Date().toISOString().split("T")[0];
    const todayLabel = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

    // ── 3-week history for AI modal ────────────────────────
    $: threeWeekHistory = (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weeks: { weekLabel: string; days: { key: string; dayNum: number; dayName: string; meals: MealEntry[] }[] }[] = [];
        for (let w = 2; w >= 0; w--) {
            const days = [];
            for (let d = 6; d >= 0; d--) {
                const dt = new Date(today);
                dt.setDate(today.getDate() - w * 7 - d);
                const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
                days.push({
                    key,
                    dayNum: dt.getDate(),
                    monthNum: dt.getMonth() + 1,
                    dayName: ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()],
                    meals: mealData[key] || [],
                    isSunday: dt.getDay() === 0,
                    isSaturday: dt.getDay() === 6,
                });
            }
            const first = days[0];
            const last = days[6];
            weeks.push({
                weekLabel: `${first.monthNum}/${first.dayNum} – ${last.monthNum}/${last.dayNum}`,
                days,
            });
        }
        return weeks;
    })();

    async function registerOptionAsCombo(option: ComboOption, idx: number) {
        if (hasDuplicateComposition(option.menuIds)) {
            alert("이미 동일한 메뉴 구성의 콤보가 등록되어 있습니다.");
            return;
        }
        const combo = await createCombo({
            name: option.title,
            description: option.description,
            item_ids: option.menuIds,
        });
        if (combo) {
            combos = [...combos, combo];
            registeredOptionIndices = [...registeredOptionIndices, idx];
            showSuccess(`"${option.title}" 콤보 등록 완료`);
            // 모달 유지 — aiOptions 닫지 않음
        } else {
            alert("콤보 등록에 실패했습니다.");
        }
    }

    // Double-click tracking
    let lastClickTarget: string | null = null;
    let lastClickTime = 0;

    // Panel menu filter
    $: filteredMenuItems = menuItems.filter((item) => {
        const matchSearch =
            !searchInput ||
            item.name.toLowerCase().includes(searchInput.toLowerCase()) ||
            (item.ingredients &&
                item.ingredients.some((ing) =>
                    ing.toLowerCase().includes(searchInput.toLowerCase()),
                ));
        const matchCategory =
            activeCategoryFilter === null ||
            item.category_id === activeCategoryFilter;
        return matchSearch && matchCategory;
    });

    $: sortedMenuItems = [...filteredMenuItems].sort((a, b) =>
        a.name.localeCompare(b.name, "ko"),
    );

    $: selectedDateMeals = selectedDate ? mealData[selectedDate] || [] : [];
    $: formattedSelectedDate = selectedDate
        ? (() => {
              const d = new Date(selectedDate);
              return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
          })()
        : "";

    $: year = currentDate.getFullYear();
    $: month = currentDate.getMonth();
    $: monthName = currentDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
    });
    $: calendarDays = buildCalendarDays(year, month);
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    onMount(async () => {
        [categories, menuItems, mealData, prompts, combos] = await Promise.all([
            fetchCategories(),
            fetchMenuItems(),
            fetchMealData(),
            fetchPrompts(),
            fetchCombos(),
        ]);
    });

    function saveMealData() {
        if (selectedDate) {
            saveMealForDate(selectedDate, mealData[selectedDate] || []);
        }
    }

    function selectDate(cd: CalendarDay) {
        if (cd.isOtherMonth) return;
        selectedDate = dateKey(cd.day);
        if (!showPanel) showPanel = true;
    }

    // Double-click assign from panel
    function handleMenuDblClick(item: MenuItem) {
        if (!selectedDate) return;
        addMealToDate(item.name);
    }

    function addMealToDate(menuName: string) {
        if (!selectedDate) return;
        const currentMeals = mealData[selectedDate] || [];
        if (!currentMeals.some((e) => e.name === menuName)) {
            mealData = {
                ...mealData,
                [selectedDate]: [...currentMeals, menuNameToEntry(menuName)],
            };
            saveMealData();
            showSuccess(`${menuName} 배정 완료`);
        }
    }

    // Double-click remove from calendar cell
    function removeMealFromCell(dateStr: string, menuName: string) {
        const currentMeals = mealData[dateStr] || [];
        const newMeals = currentMeals.filter((e) => e.name !== menuName);
        mealData = { ...mealData, [dateStr]: newMeals };
        saveMealForDate(dateStr, newMeals);
    }

    function removeMealFromDate(index: number) {
        if (!selectedDate) return;
        const currentMeals = mealData[selectedDate] || [];
        const newMeals = [...currentMeals];
        newMeals.splice(index, 1);
        mealData = { ...mealData, [selectedDate]: newMeals };
        saveMealData();
    }

    function clearAllMealsDate(dateStr?: string) {
        const targetDate = dateStr || selectedDate;
        if (!targetDate || typeof targetDate !== "string") return;
        mealData = { ...mealData, [targetDate]: [] };
        saveMealForDate(targetDate, []);
    }

    // Drag and drop
    let draggedIdx: number | null = null;
    let dragOverIdx: number | null = null;

    function handleDragStart(e: DragEvent, idx: number) {
        draggedIdx = idx;
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    }

    function handleDrop(e: DragEvent, dropIdx: number) {
        e.preventDefault();
        dragOverIdx = null;
        if (draggedIdx === null || draggedIdx === dropIdx || !selectedDate)
            return;
        const currentMeals = [...(mealData[selectedDate] || [])];
        const [movedItem] = currentMeals.splice(draggedIdx, 1);
        currentMeals.splice(dropIdx, 0, movedItem);
        mealData = { ...mealData, [selectedDate]: currentMeals };
        saveMealData();
        draggedIdx = null;
    }

    function handleDragOver(e: DragEvent, idx: number) {
        e.preventDefault();
        dragOverIdx = idx;
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    }

    function handleDragLeave(e: DragEvent, idx: number) {
        if (dragOverIdx === idx) dragOverIdx = null;
    }

    function handleDragEnd() {
        draggedIdx = null;
        dragOverIdx = null;
    }

    function getMenuColor(menuName: string): string {
        const item = menuItems.find((m) => m.name === menuName);
        if (!item) return "#ced4da";
        const cat = categories.find((c) => c.id === item.category_id);
        return cat?.color || "#ced4da";
    }

    function getCategoryName(item: MenuItem): string {
        const cat = categories.find((c) => c.id === item.category_id);
        return cat?.name || "";
    }

    function menuNameToEntry(name: string): MealEntry {
        const item = menuItems.find((m) => m.name === name);
        const cat =
            item?.category_id != null
                ? categories.find((c) => c.id === item.category_id)
                : null;
        return {
            name,
            category_id: item?.category_id ?? null,
            color: cat?.color ?? "#ced4da",
        };
    }

    function dateKey(day: number): string {
        return _dateKey(year, month, day);
    }

    function getMenus(
        cd: CalendarDay,
        md: Record<string, MealEntry[]>,
    ): MealEntry[] {
        if (cd.isOtherMonth) return [];
        return md[dateKey(cd.day)] || [];
    }

    function isToday(cd: CalendarDay): boolean {
        if (cd.isOtherMonth) return false;
        return _isToday(year, month, cd.day);
    }

    function prevMonth() {
        currentDate = new Date(year, month - 1, 1);
    }
    function nextMonth() {
        currentDate = new Date(year, month + 1, 1);
    }
    function goToToday() {
        currentDate = new Date();
    }

    let calendarEl: HTMLElement;
    let isDownloading = false;

    async function downloadCalendarPng() {
        if (!calendarEl || isDownloading) return;
        isDownloading = true;
        try {
            const canvas = await html2canvas(calendarEl, {
                backgroundColor: "#f8f9fa",
                scale: 2,
                useCORS: true,
            });
            const link = document.createElement("a");
            link.download = `MealChart_${year}_${month + 1}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (e) {
            console.error(e);
        } finally {
            isDownloading = false;
        }
    }
</script>

<div class="flex h-full overflow-hidden relative">
    <!-- Left: Calendar Main -->
    <div
        class="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar pb-20"
        bind:this={calendarEl}
    >
        <div class="max-w-6xl mx-auto w-full">
            <!-- Header -->
            <div class="flex items-center justify-between mb-5 no-drag">
                <div>
                    <span
                        class="text-primary font-bold tracking-widest text-xs uppercase block mb-0.5"
                        >Planner</span
                    >
                    <h1
                        class="text-2xl font-extrabold tracking-tight text-on-surface font-headline"
                    >
                        {monthName}
                    </h1>
                </div>
                <div class="flex items-center gap-2">
                    <button
                        class="px-4 py-2 bg-surface-container-lowest text-on-surface-variant font-bold rounded-full shadow-sm hover:shadow transition-all text-sm"
                        on:click={goToToday}>Today</button
                    >
                    <button
                        class="p-3 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-full"
                        on:click={prevMonth}
                    >
                        <span class="material-symbols-outlined"
                            >chevron_left</span
                        >
                    </button>
                    <button
                        class="p-3 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-full"
                        on:click={nextMonth}
                    >
                        <span class="material-symbols-outlined"
                            >chevron_right</span
                        >
                    </button>
                    <div class="w-px h-6 bg-surface-container-high mx-1"></div>
                    <button
                        class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all
                               {showPanel
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}"
                        on:click={() => (showPanel = !showPanel)}
                        title="큐레이션 패널 토글"
                    >
                        <span
                            class="material-symbols-outlined"
                            style="font-size:18px">tune</span
                        >
                        Panel
                    </button>
                    <button
                        class="flex items-center gap-1.5 px-4 py-2 bg-surface-container-low text-on-surface-variant rounded-full text-sm font-bold hover:bg-surface-container-high transition-all"
                        on:click={downloadCalendarPng}
                        disabled={isDownloading}
                        title="PNG 다운로드"
                    >
                        <span
                            class="material-symbols-outlined"
                            style="font-size:18px">download</span
                        >
                    </button>
                </div>
            </div>

            <!-- Calendar Grid -->
            <div class="grid grid-cols-7 gap-2">
                <!-- Day Headers -->
                {#each weekDays as wd}
                    <div
                        class="text-center text-xs font-bold text-outline uppercase tracking-widest pb-4"
                    >
                        {wd}
                    </div>
                {/each}

                {#each calendarDays as cd}
                    {@const dKey = cd.isOtherMonth ? "" : dateKey(cd.day)}
                    {@const cellMeals = getMenus(cd, mealData)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        class="rounded-xl p-2 transition-all cursor-pointer relative group flex flex-col min-h-[90px]
                               {cd.isOtherMonth
                            ? 'bg-surface-container-low/30 text-outline/40'
                            : 'bg-surface-container-lowest hover:shadow-md'}
                               {!cd.isOtherMonth && dKey === selectedDate
                            ? 'ring-2 ring-primary shadow-lg shadow-primary/10'
                            : ''}"
                        on:click={() => selectDate(cd)}
                    >
                        <div
                            class="flex justify-between items-start min-h-[1.75rem]"
                        >
                            {#if isToday(cd)}
                                <span
                                    class="text-sm font-bold bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center"
                                    >{cd.day}</span
                                >
                            {:else}
                                <span
                                    class="text-sm font-semibold {cd.isOtherMonth
                                        ? 'text-outline/40'
                                        : 'text-on-surface'}">{cd.day}</span
                                >
                            {/if}

                            {#if !cd.isOtherMonth && cellMeals.length > 0}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                <span
                                    class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-error-container/20 rounded-full cursor-pointer"
                                    title="전체 삭제"
                                    on:click|stopPropagation={() =>
                                        clearAllMealsDate(dKey)}
                                >
                                    <span
                                        class="material-symbols-outlined text-error"
                                        style="font-size:12px">close</span
                                    >
                                </span>
                            {:else if !cd.isOtherMonth}
                                <!-- AI 추천 버튼 (빈 셀, 호버 시 표시) -->
                                <button
                                    class="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-primary/10 rounded-full"
                                    on:click|stopPropagation={() => {
                                        selectedDate = dateKey(cd.day);
                                        generateAIMenus();
                                    }}
                                    title="AI 식단 추천"
                                    disabled={isAILoading}
                                >
                                    <span
                                        class="material-symbols-outlined text-primary/70"
                                        style="font-size:14px"
                                        >auto_awesome</span
                                    >
                                </button>
                            {/if}
                        </div>

                        <!-- Menu tags — double-click to remove -->
                        <div class="mt-1 space-y-0.5">
                            {#if !cd.isOtherMonth}
                                {#each cellMeals as menu}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                                    <div
                                        class="px-1.5 py-px rounded text-[9px] font-semibold truncate leading-4 cursor-pointer hover:opacity-70 transition-opacity"
                                        style="background-color: {menu.color}20; color: {menu.color}"
                                        title="더블클릭으로 삭제"
                                        on:dblclick|stopPropagation={() =>
                                            removeMealFromCell(dKey, menu.name)}
                                        on:click|stopPropagation
                                    >
                                        {menu.name}
                                    </div>
                                {/each}
                            {/if}
                        </div>

                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Full-screen AI Overlay: loading or N-option picker -->
    {#if isAILoading || aiOptions.length > 0}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
            on:click={() => {
                if (!isAILoading) {
                    aiOptions = [];
                    selectedOptionIdx = null;
                    registeredOptionIndices = [];
                }
            }}
        >
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
                class="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
                style="max-height: 85vh"
                on:click|stopPropagation
            >
                {#if isAILoading}
                    <!-- Loading -->
                    <div class="p-10 flex flex-col items-center justify-center gap-4 flex-1">
                        <div
                            class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
                        >
                            <div
                                class="ai-loading-spinner"
                                style="width:28px; height:28px; border-width:3px;"
                            ></div>
                        </div>
                        <div class="text-center">
                            <p
                                class="text-sm font-extrabold text-on-surface font-headline"
                            >
                                AI 콤보 추천 중
                            </p>
                            <p class="text-xs text-on-surface-variant mt-1">
                                잠시만 기다려주세요...
                            </p>
                        </div>
                    </div>
                {:else}
                    <!-- Header -->
                    <div class="px-5 pt-4 pb-3 flex items-center justify-between flex-shrink-0 border-b border-surface-container-high">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                <span class="material-symbols-outlined text-primary" style="font-size:16px">auto_awesome</span>
                            </div>
                            <div>
                                <p class="text-sm font-extrabold text-on-surface font-headline leading-tight">AI 추천 콤보</p>
                                <p class="text-[10px] text-on-surface-variant">{aiOptions.length}가지 옵션</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                                <span class="material-symbols-outlined text-primary" style="font-size:13px">today</span>
                                <span class="text-[11px] font-bold text-primary">{todayLabel}</span>
                            </div>
                            <button
                                class="p-1.5 hover:bg-surface-container-low rounded-full transition-colors text-outline"
                                on:click={() => { aiOptions = []; selectedOptionIdx = null; registeredOptionIndices = []; }}
                            ><span class="material-symbols-outlined" style="font-size:16px">close</span></button>
                        </div>
                    </div>

                    <!-- 3주 이력 dot grid -->
                    <div class="px-5 py-3 bg-surface-container-low/50 border-b border-surface-container-high flex-shrink-0">
                        <p class="text-[9px] font-black uppercase tracking-widest text-outline mb-2">최근 3주 배정 이력</p>
                        <div class="grid grid-cols-7 gap-x-1 gap-y-1">
                            {#each threeWeekHistory.flatMap(w => w.days) as day}
                                {@const isToday = day.key === todayKey}
                                <div
                                    class="flex flex-col items-center gap-0.5 rounded-lg py-1 {isToday ? 'bg-primary/10' : ''}"
                                    title="{day.monthNum}/{day.dayNum} ({day.dayName}): {day.meals.length > 0 ? day.meals.map(m => m.name).join(', ') : '없음'}"
                                >
                                    <span class="text-[8px] font-semibold leading-none {day.isSunday ? 'text-red-400' : day.isSaturday ? 'text-blue-400' : 'text-outline'}">{day.dayName}</span>
                                    <span class="text-[9px] leading-none font-bold {isToday ? 'text-primary' : 'text-on-surface-variant/50'}">{day.dayNum}</span>
                                    <div class="flex flex-wrap gap-px justify-center mt-0.5 min-h-[10px]">
                                        {#each day.meals.slice(0, 6) as meal}
                                            <div class="w-1.5 h-1.5 rounded-full" style="background-color:{meal.color}"></div>
                                        {/each}
                                        {#if day.meals.length === 0}
                                            <div class="w-1.5 h-1.5 rounded-full bg-on-surface/10"></div>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Option cards (2-col grid, scrollable) -->
                    <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
                        <div class="grid grid-cols-2 gap-2">
                            {#each aiOptions as option, i}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                {@const isRegistered = registeredOptionIndices.includes(i)}
                                <div
                                    class="rounded-xl p-3 cursor-pointer transition-all border-2
                                           {selectedOptionIdx === i ? 'border-primary bg-primary/5' : 'border-transparent bg-surface-container-low hover:bg-surface-container-high'}"
                                    on:click={() => (selectedOptionIdx = selectedOptionIdx === i ? null : i)}
                                >
                                    <div class="flex items-start justify-between gap-1 mb-1.5">
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-1 mb-0.5">
                                                <span class="text-[9px] font-black text-primary uppercase tracking-widest">옵션 {i + 1}</span>
                                                {#if isRegistered}
                                                    <span class="text-[9px] font-bold text-white bg-primary px-1.5 py-px rounded-full">등록됨</span>
                                                {/if}
                                            </div>
                                            <p class="font-bold text-on-surface text-xs leading-tight">{option.title}</p>
                                            {#if option.description}
                                                <p class="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed line-clamp-2">{option.description}</p>
                                            {/if}
                                        </div>
                                        {#if selectedOptionIdx === i}
                                            <span class="material-symbols-outlined text-primary flex-shrink-0" style="font-size:16px">check_circle</span>
                                        {/if}
                                    </div>
                                    <div class="flex flex-wrap gap-0.5">
                                        {#each option.entries as entry}
                                            <span class="text-[9px] font-semibold px-1.5 py-px rounded-full" style="background-color:{entry.color}20; color:{entry.color}">{entry.name}</span>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <!-- Action bar -->
                    <div class="px-4 py-3 border-t border-surface-container-high flex-shrink-0">
                        {#if selectedOptionIdx !== null}
                            <div class="flex gap-2">
                                <button
                                    class="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-sm transition-all
                                           {selectedDate ? 'signature-gradient text-white hover:opacity-90 shadow-md shadow-primary/20' : 'bg-surface-container-low text-outline cursor-not-allowed'}"
                                    on:click={() => applyOptionToDate(aiOptions[selectedOptionIdx!])}
                                    disabled={!selectedDate}
                                    title={selectedDate ? `${formattedSelectedDate}에 배정` : "날짜를 먼저 선택하세요"}
                                >
                                    <span class="material-symbols-outlined" style="font-size:16px">calendar_add_on</span>
                                    날짜 배정
                                </button>
                                <button
                                    class="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-sm transition-colors
                                           {registeredOptionIndices.includes(selectedOptionIdx!) ? 'bg-primary/10 text-primary cursor-not-allowed' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'}"
                                    on:click={() => registerOptionAsCombo(aiOptions[selectedOptionIdx!], selectedOptionIdx!)}
                                    disabled={registeredOptionIndices.includes(selectedOptionIdx!)}
                                >
                                    <span class="material-symbols-outlined" style="font-size:16px">{registeredOptionIndices.includes(selectedOptionIdx!) ? "bookmark" : "bookmark_add"}</span>
                                    {registeredOptionIndices.includes(selectedOptionIdx!) ? "등록됨" : "콤보 등록"}
                                </button>
                            </div>
                            {#if selectedDate}
                                <p class="text-[10px] text-on-surface-variant text-center mt-1.5">{formattedSelectedDate} 기존 식단을 대체합니다</p>
                            {/if}
                        {:else}
                            <p class="text-center text-[11px] text-outline py-1">카드를 클릭해 옵션을 선택하세요</p>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <!-- Right Sidebar: Curation Panel -->
    {#if showPanel}
        <aside
            class="w-80 flex-shrink-0 bg-surface-container-lowest flex flex-col shadow-xl no-drag"
            transition:panelSlide
        >
            <!-- Sidebar Header -->
            <div class="p-6 pb-0">
                <div class="flex items-center justify-between mb-1">
                    <div>
                        <h2
                            class="text-lg font-extrabold tracking-tight text-on-surface font-headline"
                        >
                            Curation Panel
                        </h2>
                        <p class="text-xs text-on-surface-variant mt-0.5">
                            {#if selectedDate}
                                {formattedSelectedDate} · {selectedDateMeals.length}개
                                배정됨
                            {:else}
                                날짜를 클릭해 선택하세요
                            {/if}
                        </p>
                    </div>
                    <button
                        class="p-2 hover:bg-surface-container-low rounded-full transition-colors text-on-surface-variant"
                        on:click={() => (showPanel = false)}
                        title="패널 닫기"
                    >
                        <span
                            class="material-symbols-outlined"
                            style="font-size:20px">chevron_right</span
                        >
                    </button>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div
                class="px-6 mt-4 flex gap-6 border-b border-surface-container-high"
            >
                <button
                    class="pb-3 text-sm font-bold transition-colors {sidebarTab ===
                    'explore'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-on-surface-variant hover:text-on-surface'}"
                    on:click={() => (sidebarTab = "explore")}
                    >Explore Menus</button
                >
                <button
                    class="pb-3 text-sm font-bold transition-colors flex items-center gap-1.5 {sidebarTab ===
                    'selected'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-on-surface-variant hover:text-on-surface'}"
                    on:click={() => (sidebarTab = "selected")}
                >
                    <span
                        class="material-symbols-outlined"
                        style="font-size:16px">checklist</span
                    >
                    Selected Menu
                </button>
            </div>

            <div
                class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 pb-4"
            >
                {#if sidebarTab === "explore"}
                    <!-- Search & Filters -->
                    <div class="space-y-3">
                        <div class="relative">
                            <span
                                class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg"
                                >search</span
                            >
                            <input
                                class="w-full bg-surface-container-low rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all outline-none"
                                placeholder="메뉴 검색..."
                                type="text"
                                bind:value={searchInput}
                            />
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button
                                class="px-3 py-1.5 rounded-full text-xs font-bold transition-all {activeCategoryFilter ===
                                null
                                    ? 'bg-primary text-white'
                                    : 'bg-surface-container-low text-on-surface-variant hover:bg-primary/5 hover:text-primary'}"
                                on:click={() => (activeCategoryFilter = null)}
                                >전체</button
                            >
                            {#each categories as cat}
                                <button
                                    class="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                    style={activeCategoryFilter === cat.id
                                        ? `background-color: ${cat.color}; color: white`
                                        : `background-color: ${cat.color}15; color: ${cat.color}`}
                                    on:click={() =>
                                        (activeCategoryFilter =
                                            activeCategoryFilter === cat.id
                                                ? null
                                                : cat.id)}>{cat.name}</button
                                >
                            {/each}
                        </div>
                    </div>

                    <!-- Hint when no date selected -->
                    {#if !selectedDate}
                        <div class="bg-primary/5 rounded-xl p-4 text-center">
                            <span
                                class="material-symbols-outlined text-primary block mb-1"
                                style="font-size:24px">touch_app</span
                            >
                            <p class="text-xs text-primary font-bold">
                                날짜를 먼저 선택하세요
                            </p>
                            <p
                                class="text-[10px] text-on-surface-variant mt-0.5"
                            >
                                선택 후 메뉴 더블클릭으로 배정
                            </p>
                        </div>
                    {/if}

                    <!-- Individual Menu List (infinite scroll) -->
                    <div>
                        <p
                            class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1"
                        >
                            <span
                                class="material-symbols-outlined"
                                style="font-size:14px">list_alt</span
                            >
                            Individual Menu List
                        </p>
                        <div class="space-y-2">
                            {#each visibleMenuItems as item}
                                {@const isAdded = selectedDate
                                    ? selectedDateMeals.some(
                                          (e) => e.name === item.name,
                                      )
                                    : false}
                                {@const color = getMenuColor(item.name)}
                                {@const catName = getCategoryName(item)}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                <div
                                    class="p-3 rounded-xl flex items-center gap-3 transition-all select-none
                                       {isAdded
                                        ? 'bg-primary/5 opacity-70'
                                        : selectedDate
                                          ? 'bg-surface-container-low hover:bg-surface-container-high cursor-pointer group'
                                          : 'bg-surface-container-low opacity-60'}"
                                    on:dblclick={() =>
                                        !isAdded && handleMenuDblClick(item)}
                                    title={selectedDate && !isAdded
                                        ? "더블클릭으로 배정"
                                        : ""}
                                >
                                    <div
                                        class="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                        style="background-color: {color}15"
                                    >
                                        <span
                                            class="material-symbols-outlined"
                                            style="color: {color}; font-size:20px"
                                            >restaurant</span
                                        >
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p
                                            class="text-sm font-bold text-on-surface truncate"
                                        >
                                            {item.name}
                                        </p>
                                        {#if catName}
                                            <span
                                                class="text-[9px] font-bold uppercase"
                                                style="color: {color}"
                                                >{catName}</span
                                            >
                                        {/if}
                                    </div>
                                    {#if isAdded}
                                        <span
                                            class="material-symbols-outlined text-primary"
                                            style="font-size:16px"
                                            >check_circle</span
                                        >
                                    {:else if selectedDate}
                                        <span
                                            class="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 transition-opacity"
                                            style="font-size:16px"
                                            >add_circle</span
                                        >
                                    {/if}
                                </div>
                            {/each}

                            {#if sortedMenuItems.length === 0}
                                <div
                                    class="text-center py-8 text-outline/50 text-sm"
                                >
                                    메뉴가 없습니다.
                                </div>
                            {/if}

                            <!-- Infinite scroll sentinel -->
                            {#if hasMoreMenus}
                                <div
                                    use:infiniteScroll={{
                                        loadMore: loadMoreMenus,
                                    }}
                                    class="flex items-center justify-center py-3"
                                >
                                    <div
                                        class="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"
                                    ></div>
                                </div>
                            {:else if sortedMenuItems.length > MENU_PAGE_SIZE}
                                <p
                                    class="text-center text-[10px] text-outline/50 py-2"
                                >
                                    전체 {sortedMenuItems.length}개 표시 완료
                                </p>
                            {/if}
                        </div>
                    </div>

                    <!-- AI Combo Section -->
                    <div class="pt-4 border-t border-surface-container-high">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-1.5">
                                <span
                                    class="material-symbols-outlined text-purple-500"
                                    style="font-size:16px">auto_awesome</span
                                >
                                <span
                                    class="text-[10px] font-bold uppercase tracking-widest text-purple-700"
                                    >AI Recommended</span
                                >
                            </div>
                            {#if aiCombos.length > 0}
                                <button
                                    class="p-1 hover:bg-purple-50 rounded-full transition-colors text-purple-400 hover:text-purple-600"
                                    on:click={generateAICombo}
                                    title="다시 추천받기"
                                    disabled={isLoadingCombo}
                                >
                                    <span
                                        class="material-symbols-outlined"
                                        style="font-size:16px">refresh</span
                                    >
                                </button>
                            {/if}
                        </div>

                        {#if aiCombos.length > 0}
                            <div class="space-y-3 mb-3">
                                {#each aiCombos as combo}
                                    <div
                                        class="bg-purple-50 border border-purple-200/60 rounded-xl p-3.5"
                                    >
                                        <div
                                            class="flex items-center justify-between mb-2"
                                        >
                                            <span
                                                class="text-sm font-bold text-purple-900"
                                                >{combo.name}</span
                                            >
                                            <button
                                                class="p-1 hover:bg-purple-100 rounded-full transition-colors text-purple-500 hover:text-purple-700"
                                                on:click={() =>
                                                    addComboToDate(combo)}
                                                title="이 콤보 배정"
                                            >
                                                <span
                                                    class="material-symbols-outlined"
                                                    style="font-size:18px"
                                                    >add_circle</span
                                                >
                                            </button>
                                        </div>
                                        <p
                                            class="text-xs text-purple-700 leading-relaxed"
                                        >
                                            {combo.items.join(", ")}
                                        </p>
                                    </div>
                                {/each}
                            </div>
                        {:else if !isLoadingCombo}
                            <p
                                class="text-center text-[11px] text-on-surface-variant/60 py-3 mb-2"
                            >
                                메뉴 목록 기반으로 균형 잡힌<br />콤보 세트를
                                추천받아보세요
                            </p>
                        {/if}

                        <button
                            class="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all
                                   {isLoadingCombo
                                ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/20'}"
                            on:click={generateAICombo}
                            disabled={isLoadingCombo}
                        >
                            <span
                                class="material-symbols-outlined"
                                style="font-size:16px"
                                >{isLoadingCombo
                                    ? "hourglass_empty"
                                    : "bolt"}</span
                            >
                            {isLoadingCombo
                                ? "추천 생성 중..."
                                : "Generate AI Combo"}
                        </button>
                    </div>
                {:else}
                    <!-- Selected Menu Tab -->
                    {#if !selectedDate}
                        <div
                            class="flex flex-col items-center justify-center py-16 text-center"
                        >
                            <div
                                class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mb-4"
                            >
                                <span
                                    class="material-symbols-outlined text-outline text-2xl"
                                    >calendar_today</span
                                >
                            </div>
                            <h3
                                class="text-base font-extrabold text-on-surface mb-1"
                            >
                                날짜를 선택하세요
                            </h3>
                            <p class="text-sm text-on-surface-variant">
                                캘린더에서 날짜를 클릭하면<br />배정된 식단을
                                확인할 수 있습니다.
                            </p>
                        </div>
                    {:else}
                        <div class="space-y-4">
                            <!-- Current plan preview -->
                            {#if selectedDateMeals.length > 0}
                                <div>
                                    <p
                                        class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2"
                                    >
                                        현재 배정된 식단 ({selectedDateMeals.length}개)
                                    </p>
                                    <div class="space-y-1.5">
                                        {#each selectedDateMeals as meal, index}
                                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                                            <div
                                                class="bg-surface-container-low p-3 rounded-xl flex items-center justify-between group
                                                   {draggedIdx === index
                                                    ? 'opacity-50'
                                                    : ''}
                                                   {dragOverIdx === index
                                                    ? 'border-t-2 border-t-primary'
                                                    : ''}"
                                                draggable="true"
                                                on:dragstart={(e) =>
                                                    handleDragStart(e, index)}
                                                on:dragover={(e) =>
                                                    handleDragOver(e, index)}
                                                on:dragleave={(e) =>
                                                    handleDragLeave(e, index)}
                                                on:drop={(e) =>
                                                    handleDrop(e, index)}
                                                on:dragend={handleDragEnd}
                                            >
                                                <div
                                                    class="flex items-center gap-2"
                                                >
                                                    <div
                                                        class="w-1 h-6 rounded-full"
                                                        style="background-color: {getMenuColor(
                                                            meal.name,
                                                        )}"
                                                    ></div>
                                                    <span
                                                        class="font-bold text-sm text-on-surface"
                                                        >{meal.name}</span
                                                    >
                                                </div>
                                                <button
                                                    class="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-outline hover:text-error rounded"
                                                    on:click={() =>
                                                        removeMealFromDate(
                                                            index,
                                                        )}
                                                >
                                                    <span
                                                        class="material-symbols-outlined"
                                                        style="font-size:16px"
                                                        >close</span
                                                    >
                                                </button>
                                            </div>
                                        {/each}
                                    </div>
                                    <button
                                        class="mt-2 text-[10px] font-bold text-error uppercase tracking-widest hover:opacity-70 transition-opacity"
                                        on:click={() => clearAllMealsDate()}
                                        >전체 지우기</button
                                    >
                                </div>
                            {:else}
                                <div
                                    class="bg-surface-container-low rounded-xl p-6 text-center"
                                >
                                    <span
                                        class="material-symbols-outlined text-outline block mb-2"
                                        style="font-size:32px"
                                        >restaurant_menu</span
                                    >
                                    <p
                                        class="text-sm font-bold text-on-surface-variant"
                                    >
                                        배정된 식단이 없습니다
                                    </p>
                                    <p class="text-[10px] text-outline mt-1">
                                        Explore 탭에서 메뉴를 더블클릭하거나<br
                                        />아래 AI 추천 버튼을 눌러보세요
                                    </p>
                                </div>
                            {/if}

                            <p
                                class="text-[10px] text-on-surface-variant text-center"
                            >
                                드래그로 순서 변경 · 호버 시 삭제 버튼 표시
                            </p>
                        </div>
                    {/if}
                {/if}
            </div>

            <!-- Bottom action: AI + Export PNG -->
            <div
                class="px-4 py-3 border-t border-surface-container-high flex items-center gap-2"
            >
                <button
                    class="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-sm transition-all
                           {isAILoading || !selectedDate
                        ? 'bg-surface-container-low text-outline cursor-not-allowed'
                        : 'signature-gradient text-white hover:opacity-90 shadow-md shadow-primary/20'}"
                    on:click={generateAIMenus}
                    disabled={isAILoading || !selectedDate}
                    title={selectedDate
                        ? "AI가 선택 날짜 식단을 추천합니다"
                        : "날짜를 먼저 선택하세요"}
                >
                    <span
                        class="material-symbols-outlined"
                        style="font-size:16px">auto_awesome</span
                    >
                    AI 추천
                </button>
                <button
                    class="p-2.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant rounded-xl transition-colors"
                    on:click={downloadCalendarPng}
                    disabled={isDownloading}
                    title="PNG 다운로드"
                >
                    <span
                        class="material-symbols-outlined"
                        style="font-size:18px">download</span
                    >
                </button>
            </div>
        </aside>
    {:else}
        <!-- Collapsed: chevron trigger -->
        <button
            class="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-14 bg-surface-container-lowest shadow-md flex items-center justify-center rounded-l-xl hover:bg-surface-container-low transition-colors"
            on:click={() => (showPanel = true)}
            title="큐레이션 패널 열기"
        >
            <span
                class="material-symbols-outlined text-on-surface-variant"
                style="font-size:18px">chevron_left</span
            >
        </button>
    {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e1e3e4;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #becab9;
    }

    /* AI Loading Spinner */
    .ai-loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid var(--color-primary, #4caf50);
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

</style>
