/**
 * 앱 전역 Svelte 스토어
 */
import { writable } from "svelte/store";

/** Gemini API 키 — SettingsTab에서 쓰고, PlannerTab에서 읽습니다. */
export const geminiKey = writable<string>("");

/** 메뉴 등록 시 AI 재료 자동 추천 on/off */
export const aiIngredientsEnabled = writable<boolean>(true);

/** Toast 메시지 — AlertSuccess 컴포넌트가 구독합니다. */
export const toastMessage = writable<string>("");

export function showSuccess(msg: string) {
    toastMessage.set(msg);
    setTimeout(() => toastMessage.set(""), 3200);
}

/** Confirm 다이얼로그 상태 */
interface ConfirmState {
    open: boolean;
    title: string;
    description: string;
    resolve: ((value: boolean) => void) | null;
}

export const confirmDialog = writable<ConfirmState>({
    open: false,
    title: "",
    description: "",
    resolve: null,
});

export function showConfirm(title: string, description = ""): Promise<boolean> {
    return new Promise((resolve) => {
        confirmDialog.set({ open: true, title, description, resolve });
    });
}
