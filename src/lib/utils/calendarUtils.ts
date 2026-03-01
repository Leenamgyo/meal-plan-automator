/**
 * 달력 날짜 계산 유틸리티
 */

export type { CalendarDay } from "$lib/types/ui";
import type { CalendarDay } from "$lib/types/ui";

/** "YYYY-MM-DD" 형식의 날짜 키 생성 */
export function dateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 주어진 연/월의 달력 그리드 배열 생성 (7열 기준, 앞/뒤 여백 포함) */
export function buildCalendarDays(year: number, month: number): CalendarDay[] {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--)
        days.push({ day: prevMonthDays - i, isOtherMonth: true });
    for (let d = 1; d <= daysInMonth; d++)
        days.push({ day: d, isOtherMonth: false });
    let nextDay = 1;
    while (days.length % 7 !== 0)
        days.push({ day: nextDay++, isOtherMonth: true });
    return days;
}

/** 주어진 연/월/일이 오늘인지 확인 */
export function isToday(year: number, month: number, day: number): boolean {
    const today = new Date();
    return (
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day
    );
}
