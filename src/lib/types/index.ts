/**
 * 공유 UI 인터페이스
 * 도메인 타입은 $lib/services/db 에서 export됩니다.
 */

export interface Message {
    role: "user" | "ai";
    text: string;
}
