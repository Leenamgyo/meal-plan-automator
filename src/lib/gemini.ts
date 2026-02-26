import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `당신은 식단 분석 및 데이터 정형화 전문가입니다.
사용자가 제공하는 자유로운 텍스트 형식의 식단표를 분석하여 아래의 구조화된 JSON 데이터 포맷으로만 응답해야 합니다. 
다른 설명이나 마크다운 백틱(\`\`\`json ... \`\`\`) 없이 순수 JSON 배열 객체만 반환하세요.

[JSON 출력 형식 예시]
[
  {
    "date": "2024-03-01",
    "day": "금요일",
    "meals": {
      "breakfast": ["현미밥", "미역국", "계란말이", "김치"],
      "lunch": ["잡곡밥", "제육볶음", "상추쌈", "된장찌개"],
      "dinner": ["닭가슴살 샐러드", "고구마 1개", "아몬드 브리즈"]
    }
  }
]

명시되지 않은 식사 시간(예: 아침이 없는 경우)에는 빈 배열 "[]"을 할당하세요.`;

export async function convertMealText(text: string, apiKey: string) {
    if (!apiKey) {
        throw new Error("Gemini API Key가 설정되지 않았습니다. 환경설정에서 확인해주세요.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        systemInstruction: SYSTEM_PROMPT
    });

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
}

export async function askGemini(prompt: string, apiKey: string) {
    if (!apiKey) {
        throw new Error("Gemini API Key가 설정되지 않았습니다.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
}
