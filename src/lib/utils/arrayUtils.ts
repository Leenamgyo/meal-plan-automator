/**
 * 범용 배열 유틸리티
 */

/** 두 인덱스의 요소를 교체한 새 배열 반환 (immutable) */
export function swapItems<T>(arr: T[], i: number, j: number): T[] {
    if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return [...arr];
    const result = [...arr];
    [result[i], result[j]] = [result[j], result[i]];
    return result;
}

/** 인덱스의 요소를 한 칸 위로 이동한 새 배열 반환 */
export function moveItemUp<T>(arr: T[], index: number): T[] {
    return index > 0 ? swapItems(arr, index, index - 1) : [...arr];
}

/** 인덱스의 요소를 한 칸 아래로 이동한 새 배열 반환 */
export function moveItemDown<T>(arr: T[], index: number): T[] {
    return index < arr.length - 1 ? swapItems(arr, index, index + 1) : [...arr];
}
