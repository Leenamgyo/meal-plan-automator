<script lang="ts">
    import { onMount } from "svelte";

    interface CalendarDay {
        day: number;
        isOtherMonth: boolean;
    }

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
    });

    function dateKey(day: number): string {
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    function getMenus(cd: CalendarDay): string[] {
        if (cd.isOtherMonth) return [];
        return mealData[dateKey(cd.day)] || [];
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
            <div
                class="sch-cell"
                class:other-month={cd.isOtherMonth}
                class:today={isToday(cd)}
                class:weekend={isWeekend(idx)}
            >
                <div
                    class="cell-day"
                    class:sun={idx % 7 === 0}
                    class:sat={idx % 7 === 6}
                >
                    {cd.day}
                </div>
                {#if !cd.isOtherMonth}
                    {@const menus = getMenus(cd)}
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
