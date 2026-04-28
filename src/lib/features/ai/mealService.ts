/**
 * 식단 도메인 AI 서비스
 * Gemini API 클라이언트(gemini.ts)를 사용하는 3가지 AI 기능 구현
 *
 * Feature 1: PLAN NOW       — auto_gen 프롬프트, PlannerTab에서 사용
 * Feature 2: 메뉴 추천       — menu_recommend 프롬프트, recommendMenus() 사용
 * Feature 3: 콤보 추천       — combo_suggest 프롬프트, suggestCombos() 사용
 * 보조:      재료 자동 추천   — ingredient_suggest 프롬프트, suggestIngredients() 사용
 */

import { callGeminiText } from "$lib/features/ai/gemini";
import type { MenuItem, Category, Prompt } from "$lib/shared/types/models";
import { buildAvailableMenusText } from "$lib/features/meal/scoring";

const MENU_CONSTRAINT = (menus: string[]) =>
    `\n\n[중요 제약조건]\n반드시 다음 <가용한 사용자 메뉴 목록> 안에 존재하는 요리들로만 구성하세요.\n여기에 없는 메뉴는 절대 사용하지 마세요.\n\n<가용한 사용자 메뉴 목록>\n${menus.join(", ")}`;

function getSystemInstruction(prompts: Prompt[] | undefined): string {
    return (
        prompts?.find((p) => p.id === "chat_base")?.content ??
        "당신은 구내식당 식단 전문가입니다. 주어진 규칙과 데이터를 정확히 따라 요청한 형식으로만 응답하세요."
    );
}

// ── Feature 1: PLAN NOW ────────────────────────────────────────────────────
/**
 * 달력 선택 날짜의 하루 식단 전체 자동 구성 (auto_gen 프롬프트)
 * PlannerTab에서 직접 호출. 프롬프트 컨텍스트 조립은 호출 측에서 처리.
 */
export async function askGemini(
    prompt: string,
    apiKey: string,
    availableMenus?: string[],
    prompts?: Prompt[],
): Promise<string> {
    const systemInstruction =
        availableMenus && availableMenus.length > 0
            ? getSystemInstruction(prompts) + MENU_CONSTRAINT(availableMenus)
            : getSystemInstruction(prompts);

    return callGeminiText(prompt, systemInstruction, apiKey);
}

// ── Feature 2: 메뉴 추천 ───────────────────────────────────────────────────
/**
 * 최근 식단 이력 기반 단품 메뉴 추천 (menu_recommend 프롬프트)
 */
export async function recommendMenus(
    menuItems: MenuItem[],
    categories: Category[],
    recentMealsText: string,
    apiKey: string,
    prompts?: Prompt[],
): Promise<string[]> {
    const basePrompt =
        prompts?.find((p) => p.id === "menu_recommend")?.content ??
        "가용한 메뉴 목록과 최근 식단 이력을 참고해서, 다음 식단에 포함하면 좋을 메뉴 5~8개를 쉼표로 구분하여 한 줄로 추천하세요.";

    const availableMenusText = buildAvailableMenusText(menuItems, categories);
    const promptText = basePrompt
        .replace("{availableMenusText}", availableMenusText)
        .replace("{recentMealsText}", recentMealsText);

    const allMenuNames = menuItems.map((m) => m.name);
    const raw = await callGeminiText(
        promptText,
        getSystemInstruction(prompts),
        apiKey,
    );

    return raw
        .split(/,|\n/)
        .map((s) => s.trim())
        .filter((name) => allMenuNames.includes(name));
}

// ── Feature 3: 콤보 추천 ───────────────────────────────────────────────────
/**
 * 단품 메뉴 목록에서 콤보 세트 구성 제안 (combo_suggest 프롬프트)
 *   형식: "[콤보명]: 메뉴A, 메뉴B, 메뉴C\n[콤보명2]: ..."
 */
export async function suggestCombos(
    menuItems: MenuItem[],
    categories: Category[],
    apiKey: string,
    prompts?: Prompt[],
): Promise<string> {
    const basePrompt =
        prompts?.find((p) => p.id === "combo_suggest")?.content ??
        "단품 메뉴 목록에서 함께 제공하면 좋을 콤보 세트 2~3가지를 [콤보명]: 메뉴A, 메뉴B 형식으로 제안하세요.";

    const availableMenusText = buildAvailableMenusText(menuItems, categories);
    const promptText = basePrompt.replace(
        "{availableMenusText}",
        availableMenusText,
    );

    return callGeminiText(promptText, getSystemInstruction(prompts), apiKey);
}

// ── 보조: 재료 자동 추천 ───────────────────────────────────────────────────
/**
 * 메뉴 이름으로 재료 추천 (ingredient_suggest 프롬프트)
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
