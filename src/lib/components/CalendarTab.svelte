<script lang="ts">
    import { onMount } from "svelte";
    import { askGemini } from "$lib/gemini";
    import { PUBLIC_GEMINI_API_KEY } from "$env/static/public";
    import {
        fetchCategories,
        fetchMenuItems,
        fetchMealData,
        saveMealForDate,
        fetchPrompts,
        type Prompt,
    } from "$lib/db";

    export let geminiKey: string = "";

    interface CalendarDay {
        day: number;
        isOtherMonth: boolean;
    }
    interface Category {
        id: number;
        name: string;
        color: string;
    }
    interface MenuItem {
        id: number;
        name: string;
        category_id: number | null;
        ingredients?: string[];
    }

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
    interface Message {
        role: "user" | "ai";
        text: string;
    }
    let chatInput = "";
    let chatMessages: Message[] = [];
    let isConverting = false;

    async function handleChatSend() {
        if (!chatInput.trim() || isConverting) return;
        const userMsg = chatInput.trim();
        chatInput = "";
        chatMessages = [...chatMessages, { role: "user", text: userMsg }];
        const apiKey = PUBLIC_GEMINI_API_KEY || geminiKey;
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
                const el = document.querySelector(".side-chat-messages");
                if (el) el.scrollTop = el.scrollHeight;
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
    $: daysInMonth = new Date(year, month + 1, 0).getDate();
    $: firstDayOfWeek = new Date(year, month, 1).getDay();
    $: prevMonthDays = new Date(year, month, 0).getDate();

    $: calendarDays = (() => {
        const days: CalendarDay[] = [];
        for (let i = firstDayOfWeek - 1; i >= 0; i--)
            days.push({ day: prevMonthDays - i, isOtherMonth: true });
        for (let d = 1; d <= daysInMonth; d++)
            days.push({ day: d, isOtherMonth: false });
        let nextDay = 1;
        while (days.length % 7 !== 0)
            days.push({ day: nextDay++, isOtherMonth: true });
        return days;
    })();

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

        const apiKey = PUBLIC_GEMINI_API_KEY || geminiKey;
        if (!apiKey) {
            alert("환경설정에서 Gemini API 키를 먼저 입력해주세요.");
            return;
        }

        isConverting = true;
        try {
            // Group menus by category name for better AI understanding
            const categoryMap = new Map<number, string>();
            categories.forEach((c) => categoryMap.set(c.id, c.name));

            const groupedMenus: Record<string, string[]> = {};
            menuItems.forEach((m) => {
                const catName = m.category_id
                    ? categoryMap.get(m.category_id) || "미분류"
                    : "미분류";
                if (!groupedMenus[catName]) groupedMenus[catName] = [];
                groupedMenus[catName].push(m.name);
            });

            let availableMenusText =
                "--- 가용한 사용자 메뉴 목록 (카테고리별) ---\n";
            for (const [cat, menus] of Object.entries(groupedMenus)) {
                availableMenusText += `[${cat}]: ${menus.join(", ")}\n`;
            }

            // Get recent meals as context for the AI
            const recentDates = Object.keys(mealData)
                .filter((d) => mealData[d].length > 0 && d !== selectedDate)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
                .slice(0, 30); // up to 30 recent meal records

            let recentMealsText = "";
            if (recentDates.length > 0) {
                recentMealsText =
                    "\n--- 참고: 최근 사용자의 식단 조합 예시 ---\n";
                for (const d of recentDates) {
                    recentMealsText += `[${d}]: ${mealData[d].join(", ")}\n`;
                }
                recentMealsText +=
                    "위의 최근 조합들을 참고하여, 메뉴들이 조화롭게 어울리도록 구성하되 직전 날짜와 메인 메뉴가 너무 똑같이 겹치지 않도록 골고루 섞어주세요.\n";
            }

            // Calculate menu frequency from recent meals
            const frequencyMap: Record<string, number> = {};
            for (const d of recentDates) {
                for (const menu of mealData[d]) {
                    frequencyMap[menu] = (frequencyMap[menu] || 0) + 1;
                }
            }
            let frequencyData = "--- 최근 30일 메뉴 등장 빈도 ---\n";
            const sortedFreq = Object.entries(frequencyMap).sort(
                (a, b) => b[1] - a[1],
            );
            if (sortedFreq.length === 0) {
                frequencyData += "(식단 이력 없음)\n";
            } else {
                for (const [menu, count] of sortedFreq) {
                    frequencyData += `- ${menu}: ${count}회\n`;
                }
            }

            const autoGenPrompt =
                prompts.find((p) => p.id === "auto_gen")?.content || "";
            if (!autoGenPrompt) {
                throw new Error("auto_gen 프롬프트를 DB에서 불러오지 못했습니다. 앱을 재시작해주세요.");
            }
            const promptContextStr = autoGenPrompt
                .replace("{frequencyData}", frequencyData)
                .replace("{recentMealsText}", recentMealsText)
                .replace("{availableMenusText}", availableMenusText);

            // For askGemini, we skip passing the basic availableMenus array because we already embedded the grouped string in the prompt.
            // But to preserve the final fallback constraint in gemini.ts, we can pass all names as a flat array.
            const allMenuNames = menuItems.map((m) => m.name);
            const aiResponse = await askGemini(
                promptContextStr,
                apiKey,
                allMenuNames,
                prompts,
            );

            // Parse response: handle commas, newlines, and bullet points (e.g. -, *, 1.)
            const rawMenus = aiResponse.split(/,|\n|- |\* |\d+\.\s*/);
            const generatedMenus = rawMenus
                .map((m) => m.trim())
                .filter((m) => m.length > 0);

            const currentMeals = mealData[selectedDate] || [];
            let updatedMeals: string[] = [];

            let addedCount = 0;
            for (const menu of generatedMenus) {
                // Verify AI didn't hallucinate
                const matchedMenu = allMenuNames.find((m) => m.trim() === menu);
                if (matchedMenu && !updatedMeals.includes(matchedMenu)) {
                    updatedMeals.push(matchedMenu);
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                mealData = { ...mealData, [selectedDate]: updatedMeals };
                saveMealData();
            } else {
                alert(
                    "AI가 추천한 메뉴들 중 기존에 이미 전부 등록되어 있거나, 보유하신 메뉴 목록에 없는 요리를 AI가 임의로 추천하여 제외되었습니다.\n다른 방식으로 다시 시도해보세요.",
                );
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
        if (!targetDate) return;
        mealData = { ...mealData, [targetDate]: [] };
        saveMealData();
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
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
        const today = new Date();
        return (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === cd.day
        );
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
</script>

<div class="calendar-layout">
    <!-- Left: Calendar -->
    <div class="calendar-main">
        <div class="meal-schedule">
            <div class="schedule-header">
                <div class="schedule-nav">
                    <button
                        class="sch-nav-btn"
                        on:click={prevMonth}
                        aria-label="이전 달">‹</button
                    >
                    <h2 class="sch-title">{monthName} 식단표</h2>
                    <button
                        class="sch-nav-btn"
                        on:click={nextMonth}
                        aria-label="다음 달">›</button
                    >
                </div>
            </div>

            <!-- Calendar-level Filter Bar -->
            <div class="calendar-filter-bar">
                <div class="search-bar cal-search">
                    <span class="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="달력 내 메뉴 검색"
                        bind:value={calendarSearchText}
                        class="search-input"
                    />
                </div>
                <div class="tag-filter-bar cal-tags">
                    <button
                        class="tag-filter-chip"
                        class:active={calendarCategoryFilter === null}
                        on:click={() => (calendarCategoryFilter = null)}
                        >전체</button
                    >
                    {#each categories as cat}
                        <button
                            class="tag-filter-chip"
                            class:active={calendarCategoryFilter === cat.id}
                            style={calendarCategoryFilter === cat.id
                                ? `background-color: ${cat.color}; color: white; border-color: ${cat.color};`
                                : ""}
                            on:click={() =>
                                toggleCalendarCategoryFilter(cat.id)}
                            >{cat.name}</button
                        >
                    {/each}
                </div>
            </div>

            <div class="sch-weekdays">
                {#each weekDays as wd, i}
                    <div class="sch-wd" class:sun={i === 0} class:sat={i === 6}>
                        {wd}
                    </div>
                {/each}
            </div>

            <div class="sch-grid" style="--rows: {totalRows};">
                {#each calendarDays as cd, idx}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        class="sch-cell"
                        class:other-month={cd.isOtherMonth}
                        class:today={isToday(cd)}
                        class:weekend={isWeekend(idx)}
                        class:selected={!cd.isOtherMonth &&
                            dateKey(cd.day) === selectedDate}
                        on:click={() => selectDate(cd)}
                    >
                        <div
                            style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;"
                        >
                            <div
                                class="cell-day"
                                class:sun={idx % 7 === 0}
                                class:sat={idx % 7 === 6}
                            >
                                {cd.day}
                            </div>

                            {#if !cd.isOtherMonth && mealData[dateKey(cd.day)] && mealData[dateKey(cd.day)].length > 0}
                                <button
                                    class="btn-mac btn-cell-clear"
                                    style="padding: 1px 4px; font-size: 0.6rem; color: #888; border: none; background: transparent; box-shadow: none;"
                                    title="이 날의 메뉴 전체 삭제"
                                    on:click|stopPropagation={() =>
                                        clearAllMealsDate(dateKey(cd.day))}
                                >
                                    ✕
                                </button>
                            {/if}
                        </div>
                        {#if !cd.isOtherMonth}
                            {@const menus = getMenus(
                                cd,
                                mealData,
                                calendarCategoryFilter,
                                calendarSearchText,
                            )}
                            {#if menus.length > 0}
                                <ul class="cell-menu-list">
                                    {#each menus as menu}
                                        <li
                                            class="cell-menu-item"
                                            style="--item-color: {getMenuColor(
                                                menu,
                                            )};"
                                        >
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
    <div
        class="ai-chat-panel"
        style="display:flex; flex-direction:column; overflow:hidden;"
    >
        {#if selectedDate}
            <div
                class="ai-chat-header"
                style="display:flex; justify-content:space-between; align-items:center;"
            >
                <div style="display:flex; align-items:center; gap:8px;">
                    <span>📋 {formattedSelectedDate}</span>
                    <button
                        class="btn-mac"
                        style="padding: 2px 8px; font-size: 0.75rem; border-radius: 12px; background: linear-gradient(to bottom, #f0f0f0, #e0e0e0); color: #333;"
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

            <div
                class="panel-section"
                style="height: 220px; display:flex; flex-direction:column; flex-shrink:0;"
            >
                <div
                    style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;"
                >
                    <div
                        style="font-weight: 600; font-size: 0.8rem; color:#555;"
                    >
                        등록된 식단 ({selectedDateMeals.length})
                    </div>
                    {#if selectedDateMeals.length > 0}
                        <button
                            class="btn-mac"
                            style="padding: 2px 6px; font-size: 0.65rem;"
                            on:click={clearAllMealsDate}
                        >
                            전체 삭제
                        </button>
                    {/if}
                </div>
                {#if selectedDateMeals.length === 0}
                    <div class="empty-state">
                        <p style="margin:0; font-size:0.8rem; color:#888;">
                            식단이 비어있습니다.
                        </p>
                    </div>
                {:else}
                    <div
                        class="selected-meals"
                        style="flex: 1; overflow-y: auto;"
                    >
                        {#each selectedDateMeals as menu, index}
                            <div
                                class="selected-meal-item"
                                style="border-left: 3px solid {getMenuColor(
                                    menu,
                                )}; cursor: grab; background-color: {draggedIdx ===
                                index
                                    ? '#f0f0f0'
                                    : 'white'}; {dragOverIdx === index &&
                                draggedIdx !== index
                                    ? 'border-top: 2px dashed #007aff; margin-top: -2px;'
                                    : ''}"
                                draggable="true"
                                on:dragstart={(e) => handleDragStart(e, index)}
                                on:dragover={(e) => handleDragOver(e, index)}
                                on:dragleave={(e) => handleDragLeave(e, index)}
                                on:drop={(e) => handleDrop(e, index)}
                                on:dragend={handleDragEnd}
                                role="listitem"
                            >
                                <span
                                    class="meal-name"
                                    style="font-size: 0.8rem;">{menu}</span
                                >
                                <button
                                    class="btn-remove-meal"
                                    style="font-size: 0.8rem;"
                                    on:click={() => removeMealFromDate(index)}
                                    >×</button
                                >
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <hr
                style="border: 0; border-top: 1px solid #eee; margin: 0; flex-shrink:0;"
            />

            <div
                class="panel-section"
                style="flex: 1; display:flex; flex-direction:column; overflow:hidden; min-height: 0;"
            >
                <div
                    style="font-weight: 600; font-size: 0.82rem; margin-bottom: 8px; color:#555; flex-shrink:0;"
                >
                    메뉴 선택
                </div>
                <div
                    class="search-bar"
                    style="margin-bottom: 8px; flex-shrink:0;"
                >
                    <span class="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="메뉴 이름, 재료 검색"
                        bind:value={searchInput}
                        class="search-input"
                    />
                </div>
                <div
                    style="display:flex; align-items:center; gap:6px; margin-bottom:8px; flex-wrap:wrap; flex-shrink:0;"
                >
                    <div class="tag-filter-bar" style="flex:1; margin:0;">
                        <button
                            class="tag-filter-chip"
                            class:active={activeCategoryFilter === null}
                            on:click={() => (activeCategoryFilter = null)}
                            >전체</button
                        >
                        {#each categories as cat}
                            <button
                                class="tag-filter-chip"
                                class:active={activeCategoryFilter === cat.id}
                                style={activeCategoryFilter === cat.id
                                    ? `background-color: ${cat.color}; color: white; border-color: ${cat.color};`
                                    : `border-left: 3px solid ${cat.color};`}
                                on:click={() => toggleCategoryFilter(cat.id)}
                                >{cat.name}</button
                            >
                        {/each}
                    </div>
                </div>
                <div class="menu-list" style="flex: 1; overflow-y: auto;">
                    {#if filteredMenuItems.length === 0}
                        <div class="empty-state">
                            <p>검색 결과가 없습니다.</p>
                        </div>
                    {:else}
                        {#each filteredMenuItems as item}
                            {@const isAdded = selectedDateMeals.includes(
                                item.name,
                            )}
                            <div class="menu-row" class:is-added={isAdded}>
                                <div class="menu-info">
                                    <div class="menu-title-row">
                                        <span
                                            class="cat-dot"
                                            style="background-color: {getMenuColor(
                                                item.name,
                                            )};"
                                        ></span>
                                        <span class="menu-name"
                                            >{item.name}</span
                                        >
                                    </div>
                                </div>
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <!-- svelte-ignore a11y-no-static-element-interactions -->
                                <div
                                    class="menu-actions"
                                    on:click={() => {
                                        if (!isAdded) addMealToDate(item.name);
                                    }}
                                >
                                    {#if isAdded}
                                        <span class="added-badge">✓</span>
                                    {:else}
                                        <button
                                            class="btn-icon add-btn"
                                            aria-label="추가"
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                stroke-width="2"
                                                ><path
                                                    d="M12 5v14M5 12h14"
                                                /></svg
                                            >
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
            <div class="side-chat-messages">
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
