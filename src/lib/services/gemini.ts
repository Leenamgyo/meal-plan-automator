/**
 * Gemini API 클라이언트 — 도메인 지식 없는 순수 API 래퍼
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-2.5-flash-lite";

function rethrowGeminiError(error: unknown): never {
    if (error instanceof Error && error.message.includes("429")) {
        throw new Error("Gemini API 무료 요청 할당량을 초과했습니다. 잠시 후(약 1분) 다시 시도해주세요.");
    }
    throw error;
}

/**
 * 주어진 systemInstruction과 prompt로 Gemini를 호출하고 텍스트 응답을 반환
 */
export async function callGeminiText(
    prompt: string,
    systemInstruction: string,
    apiKey: string,
): Promise<string> {
    if (!apiKey) {
        throw new Error("Gemini API Key가 설정되지 않았습니다.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction });
    try {
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error: unknown) {
        rethrowGeminiError(error);
    }
}
