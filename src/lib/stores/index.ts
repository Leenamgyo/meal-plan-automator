/**
 * 앱 전역 Svelte 스토어
 * geminiKey를 prop drilling 없이 어느 컴포넌트에서나 읽고 쓸 수 있습니다.
 */
import { writable } from "svelte/store";

/** Gemini API 키 — SettingsTab에서 쓰고, CalendarTab에서 읽습니다. */
export const geminiKey = writable<string>("");

/** 메뉴 등록 시 AI 재료 자동 추천 on/off — SettingsTab에서 설정합니다. */
export const aiIngredientsEnabled = writable<boolean>(true);
