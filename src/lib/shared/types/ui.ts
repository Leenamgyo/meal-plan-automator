/**
 * UI 전용 타입 — DB 스키마와 무관한 화면/인터랙션 관련 타입
 */

export interface Message {
    role: "user" | "ai";
    text: string;
}

export interface CalendarDay {
    day: number;
    isOtherMonth: boolean;
}
