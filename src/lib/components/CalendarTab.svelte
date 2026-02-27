<script lang="ts">
    import { onMount } from "svelte";

    interface CalendarDay {
        day: number;
        isOtherMonth: boolean;
    }

    interface Category {
        id: string;
        name: string;
        color: string;
    }

    interface MenuItem {
        id: string;
        name: string;
        category: string;
        ingredients?: string[];
    }

    let currentDate = new Date();
    let mealData: Record<string, string[]> = {};
    let categories: Category[] = [];
    let menuItems: MenuItem[] = [];

    // Right Panel State
    let selectedDate: string | null = null;
    let searchInput = "";
    let activeCategoryFilter: string | null = null;

    $: filteredMenuItems = menuItems.filter((item) => {
        const matchSearch =
            !searchInput ||
            item.name.toLowerCase().includes(searchInput.toLowerCase()) ||
            (item.ingredients &&
                item.ingredients.some((ing) =>
                    ing.toLowerCase().includes(searchInput.toLowerCase()),
                ));
        const matchCategory =
            !activeCategoryFilter || item.category === activeCategoryFilter;
        return matchSearch && matchCategory;
    });

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
        // 이전 달 날짜
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            days.push({ day: prevMonthDays - i, isOtherMonth: true });
        }
        // 이번 달 날짜
        for (let d = 1; d <= daysInMonth; d++) {
            days.push({ day: d, isOtherMonth: false });
        }
        // 다음 달 날짜
        let nextDay = 1;
        while (days.length % 7 !== 0) {
            days.push({ day: nextDay++, isOtherMonth: true });
        }
        return days;
    })();

    $: totalRows = Math.ceil(calendarDays.length / 7);

    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

    onMount(() => {
        const saved = localStorage.getItem("mealData");
        if (saved) mealData = JSON.parse(saved);

        const savedCats = localStorage.getItem("menuCategories");
        if (savedCats) categories = JSON.parse(savedCats);

        const savedItems = localStorage.getItem("menuItems");
        if (savedItems) menuItems = JSON.parse(savedItems);
    });

    function saveMealData() {
        localStorage.setItem("mealData", JSON.stringify(mealData));
    }

    function toggleCategoryFilter(catId: string) {
        if (activeCategoryFilter === catId) activeCategoryFilter = null;
        else activeCategoryFilter = catId;
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
        mealData = {
            ...mealData,
            [selectedDate]: [...currentMeals, menuName],
        };
        saveMealData();
    }

    function removeMealFromDate(index: number) {
        if (!selectedDate || !mealData[selectedDate]) return;
        const newMeals = [...mealData[selectedDate]];
        newMeals.splice(index, 1);
        mealData = {
            ...mealData,
            [selectedDate]: newMeals,
        };
        saveMealData();
    }

    function getMenuColor(menuName: string): string {
        const item = menuItems.find((m) => m.name === menuName);
        if (!item) return "#ced4da";
        const cat = categories.find((c) => c.id === item.category);
        return cat?.color || "#ced4da";
    }

    function dateKey(day: number): string {
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function getMenus(cd: CalendarDay, md = mealData): string[] {
        if (cd.isOtherMonth) return [];
        return md[dateKey(cd.day)] || [];
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
    function goToday() {
        currentDate = new Date();
    }
</script>

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
        <button class="btn-today" on:click={goToday}>오늘</button>
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
                    {@const menus = getMenus(cd, mealData)}
                    {#if menus.length > 0}
                        <ul class="cell-menu-list">
                            {#each menus as menu}
                                <li
                                    class="cell-menu-item"
                                    style="--item-color: {getMenuColor(menu)};"
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

{#if selectedDate}
    <div class="side-panel">
        <div class="panel-header">
            <h3>{formattedSelectedDate} 식단</h3>
            <button class="btn-close" on:click={closePanel}>×</button>
        </div>

        <!-- Search & Filter -->
        <div
            class="panel-section"
            style="flex: 1; display:flex; flex-direction:column; overflow:hidden;"
        >
            <div
                style="font-weight: 600; font-size: 0.9rem; margin-bottom: 8px;"
            >
                메뉴 검색 및 추가
            </div>
            <div class="search-bar" style="margin-bottom: 12px;">
                <span class="search-icon">🔍</span>
                <input
                    type="text"
                    placeholder="메뉴 이름, 재료 검색"
                    bind:value={searchInput}
                    class="search-input"
                />
            </div>

            <div class="tag-filter-bar" style="margin-bottom: 12px;">
                <button
                    class="tag-filter-chip"
                    class:active={activeCategoryFilter === null}
                    on:click={() => (activeCategoryFilter = null)}
                >
                    전체
                </button>
                {#each categories as cat}
                    <button
                        class="tag-filter-chip"
                        class:active={activeCategoryFilter === cat.id}
                        style={activeCategoryFilter === cat.id
                            ? `background-color: ${cat.color}; color: white; border-color: ${cat.color};`
                            : ""}
                        on:click={() => toggleCategoryFilter(cat.id)}
                        >{cat.name}</button
                    >
                {/each}
            </div>

            <div class="menu-list" style="flex: 1; overflow-y: auto;">
                {#if filteredMenuItems.length === 0}
                    <div class="empty-state"><p>검색 결과가 없습니다.</p></div>
                {:else}
                    {#each filteredMenuItems as item}
                        {@const isAdded = selectedDateMeals.includes(item.name)}
                        <div class="menu-row" class:is-added={isAdded}>
                            <div class="menu-info">
                                <div class="menu-title-row">
                                    <span
                                        class="cat-pill small"
                                        style="background-color: {getMenuColor(
                                            item.name,
                                        )};"
                                    >
                                        {categories.find(
                                            (c) => c.id === item.category,
                                        )?.name || "미지정"}
                                    </span>
                                    <span class="menu-name">{item.name}</span>
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
                                    <span class="added-badge">✓ 추가됨</span>
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
                                        >
                                            <path d="M12 5v14M5 12h14" />
                                        </svg>
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;" />

        <!-- Selected Meals -->
        <div
            class="panel-section"
            style="max-height: 300px; display:flex; flex-direction:column;"
        >
            <div
                style="font-weight: 600; font-size: 0.9rem; margin-bottom: 8px;"
            >
                등록된 식단
            </div>
            {#if selectedDateMeals.length === 0}
                <div class="empty-state">
                    <p style="margin:0; font-size:0.85rem; color:#888;">
                        식단이 비어있습니다.
                    </p>
                </div>
            {:else}
                <div class="selected-meals" style="flex: 1; overflow-y: auto;">
                    {#each selectedDateMeals as menu, index}
                        <div
                            class="selected-meal-item"
                            style="border-left: 4px solid {getMenuColor(menu)};"
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
    </div>
{/if}
