/**
 * 식단 자동 생성 서비스
 * AI 추천에 사용되는 메뉴 점수 계산, 텍스트 생성, 응답 파싱 로직
 */

import type { Category, MenuItem } from "$lib/types/models";

/** 점수 계산 설정값 — 여기서 가중치를 조정하세요 */
export const SCORE_CONFIG = {
    BASE: 100,           // 기본 점수
    FREQ_PENALTY: 10,    // 등장 1회당 차감
    RECENCY_THRESHOLD: 7,  // 이 일수 이내면 근접 패널티 적용
    RECENCY_PENALTY: 20,   // 근접 패널티
    WINDOW_DAYS: 30,       // 날짜 창 (±일수)
} as const;

export interface MenuScore {
    name: string;
    score: number;
    freq: number;
    closestDays: number | null;
}

/**
 * ±WINDOW_DAYS 범위에서 데이터가 있는 날짜 목록 반환 (targetDate 제외)
 */
export function getWindowDates(
    mealData: Record<string, string[]>,
    targetDate: string,
    windowDays = SCORE_CONFIG.WINDOW_DAYS,
): string[] {
    const target = new Date(targetDate);
    const start = new Date(target);
    start.setDate(start.getDate() - windowDays);
    const end = new Date(target);
    end.setDate(end.getDate() + windowDays);

    return Object.keys(mealData).filter((d) => {
        if (!mealData[d].length || d === targetDate) return false;
        const dObj = new Date(d);
        return dObj >= start && dObj <= end;
    });
}

/**
 * 카테고리별 메뉴 목록 텍스트 생성 (프롬프트 주입용)
 * 예: "[한식]: 김치찌개, 된장국\n[중식]: 짜장면"
 */
export function buildAvailableMenusText(
    menuItems: MenuItem[],
    categories: Category[],
): string {
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const grouped: Record<string, string[]> = {};

    for (const m of menuItems) {
        const cat = m.category_id != null ? (catMap.get(m.category_id) ?? "미분류") : "미분류";
        (grouped[cat] ??= []).push(m.name);
    }

    return Object.entries(grouped)
        .map(([cat, names]) => `[${cat}]: ${names.join(", ")}`)
        .join("\n");
}

/**
 * 최근 식단 이력 텍스트 생성 (targetDate 이전 최대 7일)
 */
export function buildRecentMealsText(
    mealData: Record<string, string[]>,
    targetDate: string,
    windowDates: string[],
): string {
    const target = new Date(targetDate);
    const past7 = windowDates
        .filter((d) => new Date(d) < target)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, 7);

    if (past7.length === 0) return "(최근 식단 이력 없음)";
    return past7.map((d) => `[${d}]: ${mealData[d].join(", ")}`).join("\n");
}

/**
 * 메뉴별 점수 계산 (카테고리별 그룹, 점수 내림차순 정렬)
 */
export function calculateMenuScores(
    menuItems: MenuItem[],
    categories: Category[],
    mealData: Record<string, string[]>,
    targetDate: string,
    windowDates: string[],
    config = SCORE_CONFIG,
): Record<string, MenuScore[]> {
    const target = new Date(targetDate);
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const result: Record<string, MenuScore[]> = {};

    for (const m of menuItems) {
        const catName = m.category_id != null ? (catMap.get(m.category_id) ?? "미분류") : "미분류";

        let freq = 0;
        let closestDays: number | null = null;

        for (const d of windowDates) {
            if (mealData[d].includes(m.name)) {
                freq++;
                const absDays = Math.round(
                    Math.abs(new Date(d).getTime() - target.getTime()) / 86_400_000,
                );
                if (closestDays === null || absDays < closestDays) {
                    closestDays = absDays;
                }
            }
        }

        let score = config.BASE - freq * config.FREQ_PENALTY;
        if (closestDays !== null && closestDays <= config.RECENCY_THRESHOLD) {
            score -= config.RECENCY_PENALTY;
        }
        score = Math.max(0, score);

        (result[catName] ??= []).push({ name: m.name, score, freq, closestDays });
    }

    for (const cat of Object.keys(result)) {
        result[cat].sort((a, b) => b.score - a.score);
    }

    return result;
}

/**
 * 점수표 문자열 생성 (프롬프트 {frequencyData} 치환용)
 */
export function formatScoreTable(
    categoryScores: Record<string, MenuScore[]>,
    config = SCORE_CONFIG,
): string {
    let out = `[계산 기준: 기본 ${config.BASE}점 / 등장 -${config.FREQ_PENALTY}점/회 / ${config.RECENCY_THRESHOLD}일 이내 추가 -${config.RECENCY_PENALTY}점]\n\n`;

    for (const [cat, scores] of Object.entries(categoryScores)) {
        out += `[${cat}]\n`;
        for (const s of scores) {
            const lastStr =
                s.closestDays !== null
                    ? `±${s.closestDays}일 이내 ${s.freq}회`
                    : "미사용";
            out += `  ${s.name}: ${s.score}점 (${lastStr})\n`;
        }
    }

    return out;
}

/**
 * AI 응답에서 메뉴 이름 파싱 (중복 제거, 메뉴 목록 검증)
 */
export function parseAIMenuResponse(
    response: string,
    allMenuNames: string[],
): string[] {
    const raw = response.split(/,|\n|- |\* |\d+\.\s*/);
    const result: string[] = [];

    for (const token of raw) {
        const name = token.trim();
        const matched = allMenuNames.find((n) => n.trim() === name);
        if (matched && !result.includes(matched)) {
            result.push(matched);
        }
    }

    return result;
}
