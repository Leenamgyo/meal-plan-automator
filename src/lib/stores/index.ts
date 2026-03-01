/**
 * 앱 전역 Svelte 스토어
 * geminiKey를 prop drilling 없이 어느 컴포넌트에서나 읽고 쓸 수 있습니다.
 */
import { writable } from "svelte/store";

/** Gemini API 키 — SettingsTab에서 쓰고, CalendarTab에서 읽습니다. */
export const geminiKey = writable<string>("");
