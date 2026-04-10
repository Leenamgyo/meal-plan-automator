<script lang="ts">
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";
    import { fetchCategories } from "$lib/services/categories";
    import { fetchMenuItems } from "$lib/services/menuItems";
    import { fetchMealData, saveMealForDate } from "$lib/services/mealData";
    import { fetchPrompts } from "$lib/services/prompts";
    import type { Category, MenuItem, MealEntry, Prompt } from "$lib/types/models";
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
    import { askGemini } from "$lib/services/mealService";
    import html2canvas from "html2canvas";

    let currentDate = new Date();
    let mealData: Record<string, MealEntry[]> = {};
    let categories: Category[] = [];
    let menuItems: MenuItem[] = [];
    let prompts: Prompt[] = [];

    // Panel State
    let selectedDate: string | null = null;
    let searchInput = "";
    let activeCategoryFilter: number | null = null;
    let sidebarTab: "explore" | "ai" = "explore";
    let showPanel = true;

    // AI Generation State
    let isConverting = false;

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
        [categories, menuItems, mealData, prompts] = await Promise.all([
            fetchCategories(),
            fetchMenuItems(),
            fetchMealData(),
            fetchPrompts(),
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

    async function autoGenerateMeal() {
        if (!selectedDate || isConverting) return;

        const targetDate = selectedDate;
        const apiKey = $geminiKey;
        if (!apiKey) {
            alert("환경설정에서 Gemini API 키를 먼저 입력해주세요.");
            return;
        }

        const autoGenPrompt =
            prompts.find((p) => p.id === "auto_gen")?.content || "";
        if (!autoGenPrompt) {
            alert("auto_gen 프롬프트를 불러오지 못했습니다.");
            return;
        }

        isConverting = true;
        try {
            const mealDataNames: Record<string, string[]> = Object.fromEntries(
                Object.entries(mealData).map(([d, entries]) => [d, entries.map((e) => e.name)]),
            );
            const windowDates = getWindowDates(mealDataNames, targetDate);
            const availableMenusText = buildAvailableMenusText(menuItems, categories);
            const recentMealsText = buildRecentMealsText(mealDataNames, targetDate, windowDates);
            const categoryScores = calculateMenuScores(menuItems, categories, mealDataNames, targetDate, windowDates);
            const frequencyData = formatScoreTable(categoryScores);

            const allMenuNames = menuItems.map((m) => m.name);
            const promptContextStr = autoGenPrompt
                .replace("{frequencyData}", frequencyData)
                .replace("{recentMealsText}", recentMealsText)
                .replace("{availableMenusText}", availableMenusText);

            const aiResponse = await askGemini(
                promptContextStr,
                apiKey,
                allMenuNames,
                prompts,
            );

            const updatedNames = parseAIMenuResponse(aiResponse, allMenuNames);

            if (updatedNames.length > 0) {
                const updatedEntries = updatedNames.map(menuNameToEntry);
                mealData = { ...mealData, [targetDate]: updatedEntries };
                saveMealForDate(targetDate, updatedEntries);
                showSuccess("AI 식단 생성 완료");
            } else {
                alert("AI 추천 결과가 유효하지 않습니다.");
            }
        } catch (error: any) {
            console.error(error);
            alert(`오류 발생: ${error.message}`);
        } finally {
            isConverting = false;
        }
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
        if (draggedIdx === null || draggedIdx === dropIdx || !selectedDate) return;
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
        const cat = item?.category_id != null ? categories.find((c) => c.id === item.category_id) : null;
        return { name, category_id: item?.category_id ?? null, color: cat?.color ?? "#ced4da" };
    }

    function dateKey(day: number): string {
        return _dateKey(year, month, day);
    }

    function getMenus(cd: CalendarDay, md: Record<string, MealEntry[]>): MealEntry[] {
        if (cd.isOtherMonth) return [];
        return md[dateKey(cd.day)] || [];
    }

    function isToday(cd: CalendarDay): boolean {
        if (cd.isOtherMonth) return false;
        return _isToday(year, month, cd.day);
    }

    function prevMonth() { currentDate = new Date(year, month - 1, 1); }
    function nextMonth() { currentDate = new Date(year, month + 1, 1); }
    function goToToday() { currentDate = new Date(); }

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
        class="flex flex-col p-6 overflow-y-auto custom-scrollbar pb-20 transition-all duration-[260ms]"
        class:flex-1={showPanel}
        class:w-full={!showPanel}
        bind:this={calendarEl}
    >
        <div class="max-w-6xl mx-auto w-full">
            <!-- Header -->
            <div class="flex items-center justify-between mb-5 no-drag">
                <div>
                    <span class="text-primary font-bold tracking-widest text-xs uppercase block mb-0.5">Planner</span>
                    <h1 class="text-2xl font-extrabold tracking-tight text-on-surface font-headline">{monthName}</h1>
                </div>
                <div class="flex items-center gap-2">
                    <button
                        class="px-4 py-2 bg-surface-container-lowest text-on-surface-variant font-bold rounded-full shadow-sm hover:shadow transition-all text-sm"
                        on:click={goToToday}
                    >Today</button>
                    <button
                        class="p-3 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-full"
                        on:click={prevMonth}
                    >
                        <span class="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                        class="p-3 bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-full"
                        on:click={nextMonth}
                    >
                        <span class="material-symbols-outlined">chevron_right</span>
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
                        <span class="material-symbols-outlined" style="font-size:18px">tune</span>
                        Panel
                    </button>
                    <button
                        class="flex items-center gap-1.5 px-4 py-2 bg-surface-container-low text-on-surface-variant rounded-full text-sm font-bold hover:bg-surface-container-high transition-all"
                        on:click={downloadCalendarPng}
                        disabled={isDownloading}
                        title="PNG 다운로드"
                    >
                        <span class="material-symbols-outlined" style="font-size:18px">download</span>
                    </button>
                </div>
            </div>

            <!-- Calendar Grid -->
            <div class="grid grid-cols-7 gap-2">
                <!-- Day Headers -->
                {#each weekDays as wd}
                    <div class="text-center text-xs font-bold text-outline uppercase tracking-widest pb-4">{wd}</div>
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
                        <div class="flex justify-between items-start min-h-[1.75rem]">
                            {#if isToday(cd)}
                                <span class="text-sm font-bold bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center">{cd.day}</span>
                            {:else}
                                <span class="text-sm font-semibold {cd.isOtherMonth ? 'text-outline/40' : 'text-on-surface'}">{cd.day}</span>
                            {/if}

                            {#if !cd.isOtherMonth && cellMeals.length > 0}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                <span
                                    class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-error-container/20 rounded-full cursor-pointer"
                                    title="전체 삭제"
                                    on:click|stopPropagation={() => clearAllMealsDate(dKey)}
                                >
                                    <span class="material-symbols-outlined text-error" style="font-size:12px">close</span>
                                </span>
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
                                        on:dblclick|stopPropagation={() => removeMealFromCell(dKey, menu.name)}
                                        on:click|stopPropagation
                                    >{menu.name}</div>
                                {/each}
                            {/if}
                        </div>

                        {#if isToday(cd) && cellMeals.length === 0}
                            <div class="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                                <div class="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-lg flex items-center gap-1 whitespace-nowrap">
                                    <span class="material-symbols-outlined" style="font-size:10px">auto_awesome</span>
                                    Plan Now
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Right Sidebar: Curation Panel -->
    {#if showPanel}
    <aside
        class="w-80 flex-shrink-0 bg-surface-container-lowest flex flex-col shadow-xl no-drag"
        transition:fly={{ x: 320, duration: 260, opacity: 1 }}
    >
        <!-- Sidebar Header -->
        <div class="p-6 pb-0">
            <div class="flex items-center justify-between mb-1">
                <div>
                    <h2 class="text-lg font-extrabold tracking-tight text-on-surface font-headline">Curation Panel</h2>
                    <p class="text-xs text-on-surface-variant mt-0.5">
                        {#if selectedDate}
                            {formattedSelectedDate} · {selectedDateMeals.length}개 배정됨
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
                    <span class="material-symbols-outlined" style="font-size:20px">chevron_right</span>
                </button>
            </div>
        </div>

        <!-- Tab Navigation -->
        <div class="px-6 mt-4 flex gap-6 border-b border-surface-container-high">
            <button
                class="pb-3 text-sm font-bold transition-colors {sidebarTab === 'explore' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}"
                on:click={() => (sidebarTab = "explore")}
            >Explore Menus</button>
            <button
                class="pb-3 text-sm font-bold transition-colors flex items-center gap-1.5 {sidebarTab === 'ai' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}"
                on:click={() => (sidebarTab = "ai")}
            >
                <span class="material-symbols-outlined" style="font-size:16px">auto_awesome</span>
                AI Recommend
            </button>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 pb-4">

            {#if sidebarTab === "explore"}
                <!-- Search & Filters -->
                <div class="space-y-3">
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
                        <input
                            class="w-full bg-surface-container-low rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all outline-none"
                            placeholder="메뉴 검색..."
                            type="text"
                            bind:value={searchInput}
                        />
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button
                            class="px-3 py-1.5 rounded-full text-xs font-bold transition-all {activeCategoryFilter === null ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-primary/5 hover:text-primary'}"
                            on:click={() => (activeCategoryFilter = null)}
                        >전체</button>
                        {#each categories as cat}
                            <button
                                class="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                                style={activeCategoryFilter === cat.id
                                    ? `background-color: ${cat.color}; color: white`
                                    : `background-color: ${cat.color}15; color: ${cat.color}`}
                                on:click={() => (activeCategoryFilter = activeCategoryFilter === cat.id ? null : cat.id)}
                            >{cat.name}</button>
                        {/each}
                    </div>
                </div>

                <!-- Hint when no date selected -->
                {#if !selectedDate}
                    <div class="bg-primary/5 rounded-xl p-4 text-center">
                        <span class="material-symbols-outlined text-primary block mb-1" style="font-size:24px">touch_app</span>
                        <p class="text-xs text-primary font-bold">날짜를 먼저 선택하세요</p>
                        <p class="text-[10px] text-on-surface-variant mt-0.5">선택 후 메뉴 더블클릭으로 배정</p>
                    </div>
                {/if}

                <!-- Menu List -->
                <div class="space-y-2">
                    {#each sortedMenuItems as item}
                        {@const isAdded = selectedDate ? selectedDateMeals.some((e) => e.name === item.name) : false}
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
                            on:dblclick={() => !isAdded && handleMenuDblClick(item)}
                            title={selectedDate && !isAdded ? "더블클릭으로 배정" : ""}
                        >
                            <div
                                class="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style="background-color: {color}15"
                            >
                                <span class="material-symbols-outlined" style="color: {color}; font-size:20px">restaurant</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-on-surface truncate">{item.name}</p>
                                {#if catName}
                                    <span
                                        class="text-[9px] font-bold uppercase"
                                        style="color: {color}"
                                    >{catName}</span>
                                {/if}
                            </div>
                            {#if isAdded}
                                <span class="material-symbols-outlined text-primary" style="font-size:16px">check_circle</span>
                            {:else if selectedDate}
                                <span class="material-symbols-outlined text-outline opacity-0 group-hover:opacity-100 transition-opacity" style="font-size:16px">add_circle</span>
                            {/if}
                        </div>
                    {/each}

                    {#if sortedMenuItems.length === 0}
                        <div class="text-center py-8 text-outline/50 text-sm">메뉴가 없습니다.</div>
                    {/if}
                </div>

            {:else}
                <!-- AI Recommend Tab -->
                {#if !selectedDate}
                    <div class="flex flex-col items-center justify-center py-16 text-center">
                        <div class="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
                            <span class="material-symbols-outlined text-outline text-2xl">calendar_today</span>
                        </div>
                        <h3 class="text-base font-extrabold text-on-surface mb-1">날짜를 선택하세요</h3>
                        <p class="text-sm text-on-surface-variant">캘린더에서 날짜를 클릭하면<br/>AI 추천을 받을 수 있습니다.</p>
                    </div>
                {:else}
                    <div class="space-y-4">
                        <!-- Current plan preview -->
                        {#if selectedDateMeals.length > 0}
                            <div>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">현재 배정된 식단 ({selectedDateMeals.length}개)</p>
                                <div class="space-y-1.5">
                                    {#each selectedDateMeals as meal, index}
                                        <div
                                            class="bg-surface-container-low p-3 rounded-xl flex items-center justify-between group
                                                   {draggedIdx === index ? 'opacity-50' : ''}
                                                   {dragOverIdx === index ? 'border-t-2 border-t-primary' : ''}"
                                            draggable="true"
                                            on:dragstart={(e) => handleDragStart(e, index)}
                                            on:dragover={(e) => handleDragOver(e, index)}
                                            on:dragleave={(e) => handleDragLeave(e, index)}
                                            on:drop={(e) => handleDrop(e, index)}
                                            on:dragend={handleDragEnd}
                                        >
                                            <div class="flex items-center gap-2">
                                                <div class="w-1 h-6 rounded-full" style="background-color: {getMenuColor(meal.name)}"></div>
                                                <span class="font-bold text-sm text-on-surface">{meal.name}</span>
                                            </div>
                                            <button
                                                class="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-outline hover:text-error rounded"
                                                on:click={() => removeMealFromDate(index)}
                                            >
                                                <span class="material-symbols-outlined" style="font-size:16px">close</span>
                                            </button>
                                        </div>
                                    {/each}
                                </div>
                                <button
                                    class="mt-2 text-[10px] font-bold text-error uppercase tracking-widest hover:opacity-70 transition-opacity"
                                    on:click={() => clearAllMealsDate()}
                                >전체 지우기</button>
                            </div>
                        {/if}

                        <!-- AI Generate -->
                        <button
                            class="w-full signature-gradient text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            on:click={autoGenerateMeal}
                            disabled={isConverting}
                        >
                            <span class="material-symbols-outlined" style="font-size:18px">{isConverting ? 'progress_activity' : 'auto_awesome'}</span>
                            {isConverting ? '생성 중...' : 'AI 식단 자동 생성'}
                        </button>

                        <p class="text-[10px] text-on-surface-variant text-center">
                            ±30일 식단 이력을 분석해<br/>중복 없는 8가지 메뉴를 추천합니다
                        </p>
                    </div>
                {/if}
            {/if}
        </div>

        <!-- Bottom action: Export PNG -->
        <div class="px-6 py-4 border-t border-surface-container-high flex items-center justify-between">
            <p class="text-[10px] text-on-surface-variant font-medium">
                <span class="font-bold text-primary">더블클릭</span>으로 메뉴 배정/삭제
            </p>
            <button
                class="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest hover:text-green-700 transition-colors"
                on:click={downloadCalendarPng}
                disabled={isDownloading}
            >
                <span class="material-symbols-outlined" style="font-size:14px">download</span>
                PNG
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
        <span class="material-symbols-outlined text-on-surface-variant" style="font-size:18px">chevron_left</span>
    </button>
    {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e1e3e4; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #becab9; }

</style>
