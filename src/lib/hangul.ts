// 한글 자모 분해 유틸리티 (초성/중성/종성)
const CHOSUNG = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ",
    "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

const JUNGSUNG = [
    "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ",
    "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
];

const JONGSUNG = [
    "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ",
    "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ",
    "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/**
 * 한글 문자열을 자모 단위로 분해
 * "오징어" → "ㅇㅗㅈㅣㅇㅇㅓ"
 */
export function decomposeHangul(str: string): string {
    let result = "";
    for (const char of str) {
        const code = char.charCodeAt(0);
        // 완성된 한글 음절 (가~힣)
        if (code >= 0xAC00 && code <= 0xD7A3) {
            const offset = code - 0xAC00;
            const cho = Math.floor(offset / (21 * 28));
            const jung = Math.floor((offset % (21 * 28)) / 28);
            const jong = offset % 28;
            result += CHOSUNG[cho] + JUNGSUNG[jung] + JONGSUNG[jong];
        }
        // 한글 호환 자모 (ㄱ~ㅎ, ㅏ~ㅣ)
        else if ((code >= 0x3131 && code <= 0x3163)) {
            result += char;
        }
        // 나머지 문자는 그대로
        else {
            result += char.toLowerCase();
        }
    }
    return result;
}

/**
 * 한글 자모 기반 문자열 포함 검색
 * "옺" 입력 중에도 "오징어" 매칭 가능
 */
export function hangulIncludes(target: string, query: string): boolean {
    if (!query) return true;
    return decomposeHangul(target).includes(decomposeHangul(query));
}
