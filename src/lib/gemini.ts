import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Prompt } from "$lib/db";

export async function convertMealText(text: string, apiKey: string, availableMenus?: string[], prompts?: Prompt[]) {
    if (!apiKey) {
        throw new Error("Gemini API Key가 설정되지 않았습니다. 환경설정에서 확인해주세요.");
    }

    const jsonPromptObj = prompts?.find(p => p.id === 'json_parser');
    let finalPrompt = jsonPromptObj ? jsonPromptObj.content : "당신은 식단 분석 및 데이터 정형화 전문가입니다. 사용자가 제공하는 자유로운 텍스트 형식의 식단표를 분석하여 구조화된 JSON 데이터 포맷으로만 응답해야 합니다.";

    if (availableMenus && availableMenus.length > 0) {
        finalPrompt += `\n\n[중요 제약조건]\n반드시 다음 <가용한 사용자 메뉴 목록> 안에 존재하는 요리들로만 식단을 구성하세요.\n여기에 없는 메뉴는 절대 발명하거나 추천하지 마세요.\n\n<가용한 사용자 메뉴 목록>\n${availableMenus.join(', ')}`;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        systemInstruction: finalPrompt
    });

    try {
        const result = await model.generateContent(text);
        const response = await result.response;
        let jsonText = response.text().trim();

        // 마크다운 백틱 제거 (만약 포함되어 있다면)
        if (jsonText.startsWith("```json")) {
            jsonText = jsonText.replace(/^```json/, "").replace(/```$/, "").trim();
        } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/^```/, "").replace(/```$/, "").trim();
        }

        try {
            return JSON.parse(jsonText);
        } catch (e) {
            console.error("JSON 파싱 에러:", e, "Raw text:", jsonText);
            throw new Error("AI 응답을 JSON으로 변환하는 데 실패했습니다.");
        }
    } catch (error: any) {
        if (error.message && error.message.includes("429")) {
            throw new Error("Gemini API 무료 요청 할당량을 초과했습니다. 잠시 후(약 1분) 다시 시도해주세요.");
        }
        throw error;
    }
}

export async function askGemini(prompt: string, apiKey: string, availableMenus?: string[], prompts?: Prompt[]) {
    if (!apiKey) {
        throw new Error("Gemini API Key가 설정되지 않았습니다.");
    }

    const chatPromptObj = prompts?.find(p => p.id === 'chat_base');
    let finalSystemPrompt = chatPromptObj ? chatPromptObj.content : "당신은 사용자의 식단을 분석하고 추천해주는 다정한 AI 비서입니다.";

    if (availableMenus && availableMenus.length > 0) {
        finalSystemPrompt += `\n\n[중요 제약조건]\n사용자가 식단 구성을 요청할 경우, 반드시 다음 <가용한 사용자 메뉴 목록> 안에 존재하는 요리들로만 구성하세요.\n여기에 없는 메뉴는 절대 발명하지 마세요.\n\n<가용한 사용자 메뉴 목록>\n${availableMenus.join(', ')}`;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        systemInstruction: finalSystemPrompt
    });

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error: any) {
        if (error.message && error.message.includes("429")) {
            throw new Error("Gemini API 무료 요청 할당량을 초과했습니다. 잠시 후(약 1분) 다시 시도해주세요.");
        }
        throw error;
    }
}
