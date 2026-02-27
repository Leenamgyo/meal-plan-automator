<script lang="ts">
    import { onMount } from "svelte";
    import { askGemini } from "$lib/gemini";
    import { PUBLIC_GEMINI_API_KEY } from "$env/static/public";
    import {
        fetchCategories,
        fetchMenuItems,
        fetchMealData,
        saveMealForDate,
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

    // Calendar filter state
    let calendarCategoryFilters: string[] = [];
    let calendarSearchText = "";

    // Right Panel State
    let selectedDate: string | null = null;
    let searchInput = "";
    let activeCategoryFilters: string[] = [];
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
            const aiResponse = await askGemini(userMsg, apiKey);
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
            activeCategoryFilters.length === 0 ||
            activeCategoryFilters.includes(item.category_id);
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
        categories = await fetchCategories();
        menuItems = await fetchMenuItems();
        mealData = await fetchMealData();
    });

    function saveMealData() {
        localStorage.setItem("mealData", JSON.stringify(mealData));
        if (selectedDate) {
            saveMealForDate(selectedDate, mealData[selectedDate] || []);
        }
    }

    function toggleCalendarCategoryFilter(catId: string) {
        if (calendarCategoryFilters.includes(catId))
            calendarCategoryFilters = calendarCategoryFilters.filter(
                (f) => f !== catId,
            );
        else calendarCategoryFilters = [...calendarCategoryFilters, catId];
    }

    function toggleCategoryFilter(catId: string) {
        if (activeCategoryFilters.includes(catId))
            activeCategoryFilters = activeCategoryFilters.filter(
                (f) => f !== catId,
            );
        else activeCategoryFilters = [...activeCategoryFilters, catId];
    }

    function selectDate(cd: CalendarDay) {
        if (cd.isOtherMonth) return;
        selectedDate = dateKey(cd.day);
    }
    function closePanel() {
        selectedDate = null;
        searchInput = "";
        activeCategoryFilters = [];
    }

    function addMealToDate(menuName: string) {
        if (!selectedDate) return;
        const currentMeals = mealData[selectedDate] || [];
        mealData = { ...mealData, [selectedDate]: [...currentMeals, menuName] };
        saveMealData();
    }

    function removeMealFromDate(index: number) {
        if (!selectedDate || !mealData[selectedDate]) return;
        const newMeals = [...mealData[selectedDate]];
        newMeals.splice(index, 1);
        mealData = { ...mealData, [selectedDate]: newMeals };
        saveMealData();
    }

    function getMenuColor(menuName: string): string {
        const item = menuItems.find((m) => m.name === menuName);
        if (!item) return "#ced4da";
        const cat = categories.find((c) => c.id === item.category_id);
        return cat?.color || "#ced4da";
    }

    function getMenuCategoryId(menuName: string): string | null {
        const item = menuItems.find((m) => m.name === menuName);
        return item?.category_id || null;
    }

    function dateKey(day: number): string {
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function getMenus(
        cd: CalendarDay,
        md: Record<string, string[]>,
        catFilters: string[],
        searchText: string,
    ): string[] {
        if (cd.isOtherMonth) return [];
        let menus = md[dateKey(cd.day)] || [];
        // Apply calendar-level filters
        if (catFilters.length > 0) {
            menus = menus.filter((m) => {
                const catId = getMenuCategoryId(m);
                return catId && catFilters.includes(catId);
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
                        class:active={calendarCategoryFilters.length === 0}
                        on:click={() => (calendarCategoryFilters = [])}
                        >전체</button
                    >
                    {#each categories as cat}
                        <button
                            class="tag-filter-chip"
                            class:active={calendarCategoryFilters.includes(
                                cat.id,
                            )}
                            style={calendarCategoryFilters.includes(cat.id)
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
                            class="cell-day"
                            class:sun={idx % 7 === 0}
                            class:sat={idx % 7 === 6}
                        >
                            {cd.day}
                        </div>
                        {#if !cd.isOtherMonth}
                            {@const menus = getMenus(
                                cd,
                                mealData,
                                calendarCategoryFilters,
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
    <div class="ai-chat-panel">
        {#if selectedDate}
            <div
                class="ai-chat-header"
                style="display:flex; justify-content:space-between; align-items:center;"
            >
                <span>📋 {formattedSelectedDate} 식단 선택</span>
                <button class="btn-close" on:click={closePanel}>×</button>
            </div>

            <div
                class="panel-section"
                style="flex: 1; display:flex; flex-direction:column; overflow:hidden;"
            >
                <div class="search-bar" style="margin-bottom: 8px;">
                    <span class="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="메뉴 이름, 재료 검색"
                        bind:value={searchInput}
                        class="search-input"
                    />
                </div>
                <div
                    style="display:flex; align-items:center; gap:6px; margin-bottom:8px; flex-wrap:wrap;"
                >
                    <div class="tag-filter-bar" style="flex:1; margin:0;">
                        <button
                            class="tag-filter-chip"
                            class:active={activeCategoryFilters.length === 0}
                            on:click={() => (activeCategoryFilters = [])}
                            >전체</button
                        >
                        {#each categories as cat}
                            <button
                                class="tag-filter-chip"
                                class:active={activeCategoryFilters.includes(
                                    cat.id,
                                )}
                                style={activeCategoryFilters.includes(cat.id)
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

            <hr style="border: 0; border-top: 1px solid #eee; margin: 0;" />

            <div
                class="panel-section"
                style="height: 160px; display:flex; flex-direction:column; flex-shrink:0;"
            >
                <div
                    style="font-weight: 600; font-size: 0.82rem; margin-bottom: 4px; color:#555;"
                >
                    등록된 식단 ({selectedDateMeals.length})
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
                                )};"
                            >
                                <span class="meal-name">{menu}</span>
                                <button
                                    class="btn-remove-meal"
                                    on:click={() => removeMealFromDate(index)}
                                    >×</button
                                >
                            </div>
                        {/each}
                    </div>
                {/if}
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
