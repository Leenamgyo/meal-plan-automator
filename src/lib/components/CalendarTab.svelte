<script lang="ts">
    import { onMount } from "svelte";

    // 날짜별 중식 메뉴 목록 (최대 9개 정도)
    let currentDate = new Date();
    let mealData: Record<string, string[]> = {};

    $: year = currentDate.getFullYear();
    $: month = currentDate.getMonth();
    $: monthName = currentDate.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
    });

    $: daysInMonth = new Date(year, month + 1, 0).getDate();
    $: firstDayOfWeek = new Date(year, month, 1).getDay();

    $: calendarDays = (() => {
        const days: (number | null)[] = [];
        for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(d);
        // 마지막 행 패딩
        while (days.length % 7 !== 0) days.push(null);
        return days;
    })();

    $: totalRows = Math.ceil(calendarDays.length / 7);

    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

    onMount(() => {
        const saved = localStorage.getItem("mealData");
        if (saved) mealData = JSON.parse(saved);
    });

    function dateKey(day: number): string {
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function getMenus(day: number | null): string[] {
        if (!day) return [];
        return mealData[dateKey(day)] || [];
    }

    function isToday(day: number | null): boolean {
        if (!day) return false;
        const today = new Date();
        return (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
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
    <!-- Header -->
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

    <!-- Weekday Row -->
    <div class="sch-weekdays">
        {#each weekDays as wd, i}
            <div class="sch-wd" class:sun={i === 0} class:sat={i === 6}>
                {wd}
            </div>
        {/each}
    </div>

    <!-- Grid -->
    <div class="sch-grid" style="--rows: {totalRows};">
        {#each calendarDays as day, idx}
            <div
                class="sch-cell"
                class:empty={day === null}
                class:today={isToday(day)}
                class:weekend={isWeekend(idx)}
            >
                {#if day !== null}
                    <div
                        class="cell-day"
                        class:sun={idx % 7 === 0}
                        class:sat={idx % 7 === 6}
                    >
                        {day}
                    </div>
                    {@const menus = getMenus(day)}
                    {#if menus.length > 0}
                        <ul class="cell-menu-list">
                            {#each menus as menu}
                                <li class="cell-menu-item">{menu}</li>
                            {/each}
                        </ul>
                    {/if}
                {/if}
            </div>
        {/each}
    </div>
</div>
