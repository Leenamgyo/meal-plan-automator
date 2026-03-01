<script lang="ts">
    import { onMount } from "svelte";
    import { askGemini } from "$lib/services/mealService";
    import { PUBLIC_GEMINI_API_KEY } from "$env/static/public";
    import { fetchCategories } from "$lib/services/categories";
    import { fetchMenuItems } from "$lib/services/menuItems";
    import { fetchMealData, saveMealForDate } from "$lib/services/mealData";
    import { fetchPrompts } from "$lib/services/prompts";
    import type { Category, MenuItem, Prompt } from "$lib/types/models";
    import type { Message, CalendarDay } from "$lib/types/ui";
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

    let currentDate = new Date();
    let mealData: Record<string, string[]> = {};
    let categories: Category[] = [];
    let menuItems: MenuItem[] = [];
    let prompts: Prompt[] = [];

    // Calendar filter state
    let calendarCategoryFilter: number | null = null;
    let calendarSearchText = "";

    // Right Panel State
    let selectedDate: string | null = null;
    let searchInput = "";
    let activeCategoryFilter: number | null = null;
    let sortOrder: "name" | "category" = "name";

    // AI Chat State
    let chatInput = "";
    let chatMessages: Message[] = [];
    let isConverting = false;
    let chatMessagesEl: HTMLElement;

    async function handleChatSend() {
        if (!chatInput.trim() || isConverting) return;
        const userMsg = chatInput.trim();
        chatInput = "";
        chatMessages = [...chatMessages, { role: "user", text: userMsg }];
        const apiKey = PUBLIC_GEMINI_API_KEY || $geminiKey;
        if (!apiKey) {
            chatMessages = [
                ...chatMessages,
                {
                    role: "ai",
                    text: "오류: Gemini API 키가 설정되지 않았습니다. 환경설정 탭에서 키를 입력해주세요.",
                },
            ];
            return;
        }
        isConverting = true;
        try {
            const availableMenus = menuItems.map((m) => m.name);
            const aiResponse = await askGemini(
                userMsg,
                apiKey,
                availableMenus,
                prompts,
            );
            chatMessages = [...chatMessages, { role: "ai", text: aiResponse }];
        } catch (error: any) {
            chatMessages = [
                ...chatMessages,
                { role: "ai", text: `오류: ${error.message}` },
            ];
        } finally {
            isConverting = false;
            setTimeout(() => {
                if (chatMessagesEl) chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
            }, 10);
        }
    }

    function handleChatKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleChatSend();
        }
    }

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

    $: sortedMenuItems = (() => {
        const items = [...filteredMenuItems];
        if (sortOrder === "name")
            items.sort((a, b) => a.name.localeCompare(b.name, "ko"));
        else
            items.sort((a, b) => {
                const catA = categories.findIndex(
                    (c) => c.id === a.category_id,
                );
                const catB = categories.findIndex(
                    (c) => c.id === b.category_id,
                );
                return catA - catB || a.name.localeCompare(b.name, "ko");
            });
        return items;
    })();

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

    $: totalRows = Math.ceil(calendarDays.length / 7);
    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

    onMount(async () => {
        [categories, menuItems, mealData, prompts] = await Promise.all([
            fetchCategories(),
            fetchMenuItems(),
            fetchMealData(),
            fetchPrompts(),
        ]);
    });

    function saveMealData() {
        localStorage.setItem("mealData", JSON.stringify(mealData));
        if (selectedDate) {
            saveMealForDate(selectedDate, mealData[selectedDate] || []);
        }
    }

    function toggleCalendarCategoryFilter(catId: number) {
        if (calendarCategoryFilter === catId) {
            calendarCategoryFilter = null;
        } else {
            calendarCategoryFilter = catId;
        }
    }

    function toggleCategoryFilter(catId: number) {
        if (activeCategoryFilter === catId) {
            activeCategoryFilter = null;
        } else {
            activeCategoryFilter = catId;
        }
    }

    function selectDate(cd: CalendarDay) {
        if (cd.isOtherMonth) return;
        selectedDate = dateKey(cd.day);
    }
    function closePanel() {
        selectedDate = null;
        searchInput = "";
        activeCategoryFilter = null;
    }

    function addMealToDate(menuName: string) {
        if (!selectedDate) return;
        const currentMeals = mealData[selectedDate] || [];
        // Prevent duplicate adds if already present
        if (!currentMeals.includes(menuName)) {
            mealData = {
                ...mealData,
                [selectedDate]: [...currentMeals, menuName],
            };
            saveMealData();
        }
    }

    async function autoGenerateMeal() {
        if (!selectedDate || isConverting) return;

        // 비동기 처리 중 selectedDate가 바뀌어도 처음 클릭한 날짜에 저장
        const targetDate = selectedDate;

        const apiKey = PUBLIC_GEMINI_API_KEY || $geminiKey;
        if (!apiKey) {
            alert("환경설정에서 Gemini API 키를 먼저 입력해주세요.");
            return;
        }

        const autoGenPrompt =
            prompts.find((p) => p.id === "auto_gen")?.content || "";
        if (!autoGenPrompt) {
            alert("auto_gen 프롬프트를 DB에서 불러오지 못했습니다. 앱을 재시작해주세요.");
            return;
        }

        isConverting = true;
        try {
            const windowDates = getWindowDates(mealData, targetDate);
            const availableMenusText = buildAvailableMenusText(menuItems, categories);
            const recentMealsText = buildRecentMealsText(mealData, targetDate, windowDates);
            const categoryScores = calculateMenuScores(menuItems, categories, mealData, targetDate, windowDates);
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

            const updatedMeals = parseAIMenuResponse(aiResponse, allMenuNames);

            if (updatedMeals.length > 0) {
                mealData = { ...mealData, [targetDate]: updatedMeals };
                localStorage.setItem("mealData", JSON.stringify(mealData));
                saveMealForDate(targetDate, updatedMeals);
            } else {
                alert(
                    "AI가 추천한 메뉴가 메뉴 목록에 없거나 파싱에 실패했습니다.\n다시 시도해보세요.",
                );
            }
        } catch (error: unknown) {
            console.error(error);
            alert(`오류 발생: ${error instanceof Error ? error.message : String(error)}`);
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
        localStorage.setItem("mealData", JSON.stringify(mealData));
        saveMealForDate(targetDate, []);
    }

    // Drag and drop state
    let draggedIdx: number | null = null;
    let dragOverIdx: number | null = null;

    function handleDragStart(e: DragEvent, idx: number) {
        draggedIdx = idx;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
        }
    }

    function handleDrop(e: DragEvent, dropIdx: number) {
        e.preventDefault();
        dragOverIdx = null; // reset visual indicator
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
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "move";
        }
    }

    function handleDragLeave(e: DragEvent, idx: number) {
        if (dragOverIdx === idx) {
            dragOverIdx = null;
        }
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

    function getMenuCategoryId(menuName: string): number | null {
        const item = menuItems.find((m) => m.name === menuName);
        return item?.category_id || null;
    }

    function dateKey(day: number): string {
        return _dateKey(year, month, day);
    }

    function getMenus(
        cd: CalendarDay,
        md: Record<string, string[]>,
        catFilter: number | null,
        searchText: string,
    ): string[] {
        if (cd.isOtherMonth) return [];
        let menus = md[dateKey(cd.day)] || [];
        // Apply calendar-level filters
        if (catFilter !== null) {
            menus = menus.filter((m) => {
                const catId = getMenuCategoryId(m);
                return catId === catFilter;
            });
        }
        if (searchText) {
            const q = searchText.toLowerCase();
            menus = menus.filter((m) => m.toLowerCase().includes(q));
        }
        return menus;
    }

    function isToday(cd: CalendarDay): boolean {
        if (cd.isOtherMonth) return false;
        return _isToday(year, month, cd.day);
    }

    function isWeekend(idx: number): boolean {
        return idx % 7 === 0 || idx % 7 === 6;
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
</script>

<div class="calendar-layout">
    <!-- Left: Calendar -->
    <div class="calendar-main">
        <div class="meal-schedule">

            <!-- ── 통합 헤더 바 ── -->
            <div class="sch-header-bar">
                <div class="sch-nav-group">
                    <button class="sch-nav-btn" on:click={prevMonth} aria-label="이전 달">‹</button>
                    <h2 class="sch-title">{monthName}</h2>
                    <button class="sch-nav-btn" on:click={nextMonth} aria-label="다음 달">›</button>
                    <button class="btn-today" on:click={goToToday}>오늘</button>
                </div>

                <div class="sch-filter-group">
                    <div class="cal-search-wrap">
                        <svg class="search-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input
                            type="text"
                            placeholder="메뉴 검색"
                            bind:value={calendarSearchText}
                            class="cal-search-input"
                        />
                        {#if calendarSearchText}
                            <button class="cal-search-clear" on:click={() => (calendarSearchText = "")}>×</button>
                        {/if}
                    </div>

                    <div class="cat-chips-scroll">
                        <button
                            class="cat-chip"
                            class:active={calendarCategoryFilter === null}
                            on:click={() => (calendarCategoryFilter = null)}
                        >전체</button>
                        {#each categories as cat}
                            <button
                                class="cat-chip"
                                class:active={calendarCategoryFilter === cat.id}
                                style={calendarCategoryFilter === cat.id
                                    ? `background:${cat.color}; color:#fff; border-color:${cat.color};`
                                    : `border-left: 3px solid ${cat.color};`}
                                on:click={() => toggleCalendarCategoryFilter(cat.id)}
                            >{cat.name}</button>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- ── 요일 헤더 ── -->
            <div class="sch-weekdays">
                {#each weekDays as wd, i}
                    <div class="sch-wd" class:sun={i === 0} class:sat={i === 6}>{wd}</div>
                {/each}
            </div>

            <!-- ── 달력 그리드 ── -->
            <div class="sch-grid" style="--rows: {totalRows};">
                {#each calendarDays as cd, idx}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        class="sch-cell"
                        class:other-month={cd.isOtherMonth}
                        class:weekend={isWeekend(idx)}
                        class:selected={!cd.isOtherMonth && dateKey(cd.day) === selectedDate}
                        on:click={() => selectDate(cd)}
                    >
                        <!-- 날짜 번호 -->
                        <div class="cell-top">
                            <span
                                class="cell-day"
                                class:sun={idx % 7 === 0}
                                class:sat={idx % 7 === 6}
                                class:today-num={isToday(cd)}
                            >{cd.day}</span>

                            {#if !cd.isOtherMonth && mealData[dateKey(cd.day)]?.length > 0}
                                <div class="cell-top-right">
                                    <span class="cell-count">{mealData[dateKey(cd.day)].length}</span>
                                    <button
                                        class="cell-clear-btn"
                                        title="이 날 식단 전체 삭제"
                                        on:click|stopPropagation={() => clearAllMealsDate(dateKey(cd.day))}
                                    >✕</button>
                                </div>
                            {/if}
                        </div>

                        <!-- 메뉴 이름 목록 -->
                        {#if !cd.isOtherMonth}
                            {@const menus = getMenus(cd, mealData, calendarCategoryFilter, calendarSearchText)}
                            {#if menus.length > 0}
                                <ul class="cell-menu-list">
                                    {#each menus as menu}
                                        <li class="cell-menu-item" style="--item-color: {getMenuColor(menu)};">
                                            {menu}
                                        </li>
                                    {/each}
                                </ul>
                            {/if}
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Right: Meal Selection / AI Chat -->
    <div class="ai-chat-panel">
        {#if selectedDate}
            <div class="ai-chat-header panel-header-row">
                <div class="panel-header-left">
                    <span class="panel-date-label">📋 {formattedSelectedDate}</span>
                    <button
                        class="btn-ai-gen"
                        on:click={autoGenerateMeal}
                        disabled={isConverting}
                    >
                        {#if isConverting}
                            추천 중...
                        {:else}
                            ✨ AI 자동 추천
                        {/if}
                    </button>
                </div>
                <button class="btn-close" on:click={closePanel}>×</button>
            </div>

            <!-- 등록된 식단 -->
            <div class="panel-section panel-meals-section">
                <div class="panel-section-header">
                    <span class="panel-section-title">등록된 식단 <span class="meal-count-badge">{selectedDateMeals.length}</span></span>
                    {#if selectedDateMeals.length > 0}
                        <button class="btn-text-danger" on:click={() => clearAllMealsDate()}>전체 삭제</button>
                    {/if}
                </div>
                {#if selectedDateMeals.length === 0}
                    <div class="empty-state">
                        <p class="empty-state-text">식단이 비어있습니다.</p>
                    </div>
                {:else}
                    <div class="selected-meals">
                        {#each selectedDateMeals as menu, index}
                            <div
                                class="selected-meal-item"
                                class:dragging={draggedIdx === index}
                                class:drag-over={dragOverIdx === index && draggedIdx !== index}
                                style="border-left: 3px solid {getMenuColor(menu)};"
                                draggable="true"
                                on:dragstart={(e) => handleDragStart(e, index)}
                                on:dragover={(e) => handleDragOver(e, index)}
                                on:dragleave={(e) => handleDragLeave(e, index)}
                                on:drop={(e) => handleDrop(e, index)}
                                on:dragend={handleDragEnd}
                                role="listitem"
                            >
                                <span class="meal-name">{menu}</span>
                                <button class="btn-remove-meal" on:click={() => removeMealFromDate(index)}>×</button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <div class="panel-divider"></div>

            <!-- 메뉴 선택 -->
            <div class="panel-section panel-menu-pick-section">
                <div class="panel-section-title" style="margin-bottom:8px; flex-shrink:0;">메뉴 선택</div>
                <div class="search-bar" style="margin-bottom: 8px; flex-shrink:0;">
                    <span class="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="메뉴 이름, 재료 검색"
                        bind:value={searchInput}
                        class="search-input"
                    />
                </div>
                <div class="tag-filter-bar" style="margin-bottom:8px; flex-shrink:0;">
                    <button
                        class="tag-filter-chip"
                        class:active={activeCategoryFilter === null}
                        on:click={() => (activeCategoryFilter = null)}
                    >전체</button>
                    {#each categories as cat}
                        <button
                            class="tag-filter-chip"
                            class:active={activeCategoryFilter === cat.id}
                            style={activeCategoryFilter === cat.id
                                ? `background-color: ${cat.color}; color: white; border-color: ${cat.color};`
                                : `border-left: 3px solid ${cat.color};`}
                            on:click={() => toggleCategoryFilter(cat.id)}
                        >{cat.name}</button>
                    {/each}
                </div>
                <div class="menu-list">
                    {#if filteredMenuItems.length === 0}
                        <div class="empty-state">
                            <p>검색 결과가 없습니다.</p>
                        </div>
                    {:else}
                        {#each filteredMenuItems as item}
                            {@const isAdded = selectedDateMeals.includes(item.name)}
                            <div class="menu-row" class:is-added={isAdded}>
                                <div class="menu-info">
                                    <div class="menu-title-row">
                                        <span class="cat-dot" style="background-color: {getMenuColor(item.name)};"></span>
                                        <span class="menu-name">{item.name}</span>
                                    </div>
                                </div>
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                <div class="menu-actions" on:click={() => { if (!isAdded) addMealToDate(item.name); }}>
                                    {#if isAdded}
                                        <span class="added-badge">✓</span>
                                    {:else}
                                        <button class="btn-icon add-btn" aria-label="추가">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        {:else}
            <div class="ai-chat-header">🤖 AI 식단 변환기</div>
            <div class="side-chat-messages" bind:this={chatMessagesEl}>
                <div class="side-chat-msg ai">
                    날짜를 클릭하면 식단을 선택할 수 있습니다.<br />또는 식단
                    텍스트를 붙여넣으면 분석해드릴게요!
                </div>
                {#each chatMessages as msg}
                    <div class="side-chat-msg {msg.role}">{msg.text}</div>
                {/each}
                {#if isConverting}
                    <div class="side-chat-msg ai">
                        <div class="loading-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                    </div>
                {/if}
            </div>
            <div class="side-chat-input-area">
                <textarea
                    class="side-chat-input"
                    placeholder="식단 텍스트를 입력하세요..."
                    rows="2"
                    bind:value={chatInput}
                    on:keydown={handleChatKeydown}
                ></textarea>
                <button
                    class="btn-send-side"
                    on:click={handleChatSend}
                    disabled={isConverting || !chatInput.trim()}
                    aria-label="전송"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        {/if}
    </div>
</div>
