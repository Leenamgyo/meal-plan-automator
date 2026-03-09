/**
 * 식단 도메인 AI 서비스
 * Gemini API 클라이언트(gemini.ts)를 사용하는 도메인별 ask 로직
 */

import { callGeminiText } from "$lib/services/gemini";
import type { Prompt } from "$lib/types/models";

const MENU_CONSTRAINT = (menus: string[]) =>
    `\n\n[중요 제약조건]\n반드시 다음 <가용한 사용자 메뉴 목록> 안에 존재하는 요리들로만 식단을 구성하세요.\n여기에 없는 메뉴는 절대 발명하거나 추천하지 마세요.\n\n<가용한 사용자 메뉴 목록>\n${menus.join(", ")}`;

/**
 * 자유 텍스트 식단표를 JSON으로 변환 (json_parser 프롬프트 사용)
 */
export async function convertMealText(
    text: string,
    apiKey: string,
    availableMenus?: string[],
    prompts?: Prompt[],
): Promise<unknown> {
    const base =
        prompts?.find((p) => p.id === "json_parser")?.content ??
        "당신은 식단 분석 및 데이터 정형화 전문가입니다. 사용자가 제공하는 자유로운 텍스트 형식의 식단표를 분석하여 구조화된 JSON 데이터 포맷으로만 응답해야 합니다.";

    const systemInstruction =
        availableMenus && availableMenus.length > 0
            ? base + MENU_CONSTRAINT(availableMenus)
            : base;

    const raw = await callGeminiText(text, systemInstruction, apiKey);

    // 마크다운 백틱 제거
    const jsonText = raw
        .replace(/^```json\s*/, "")
        .replace(/^```\s*/, "")
        .replace(/```$/, "")
        .trim();

    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("JSON 파싱 에러:", e, "Raw text:", jsonText);
        throw new Error("AI 응답을 JSON으로 변환하는 데 실패했습니다.");
    }
}

/**
 * 메뉴 이름으로 재료 추천 (ingredient_suggest 프롬프트 사용)
 */
export async function suggestIngredients(
    menuName: string,
    apiKey: string,
    prompts?: Prompt[],
): Promise<string[]> {
    const base =
        prompts?.find((p) => p.id === "ingredient_suggest")?.content ??
        "당신은 요리 전문가입니다. 메뉴 이름을 받으면 해당 요리의 주요 재료를 한국어로 나열합니다. 재료 이름만 쉼표로 구분하여 한 줄로 응답하세요. 다른 설명은 하지 마세요.";

    const raw = await callGeminiText(`재료 추천: ${menuName}`, base, apiKey);

    return raw
        .split(/[,，\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 20);
}

/**
 * 일반 식단 채팅 (chat_base 프롬프트 사용)
 */
export async function askGemini(
    prompt: string,
    apiKey: string,
    availableMenus?: string[],
    prompts?: Prompt[],
): Promise<string> {
    const base =
        prompts?.find((p) => p.id === "chat_base")?.content ??
        "당신은 사용자의 식단을 분석하고 추천해주는 다정한 AI 비서입니다.";

    const systemInstruction =
        availableMenus && availableMenus.length > 0
            ? base + MENU_CONSTRAINT(availableMenus)
            : base;

    return callGeminiText(prompt, systemInstruction, apiKey);
}
