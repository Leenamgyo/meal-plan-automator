/**
 * HTTP API 클라이언트 — 도메인 지식 없는 순수 HTTP 래퍼
 * main.cjs 로컬 서버(port 3737)와 통신
 */

const API_BASE = ""; // same origin (localhost:3737)

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || `POST ${path} failed: ${res.status}`);
    }
    return res.json();
}

export async function apiPut(path: string, body: unknown): Promise<boolean> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return res.ok;
}

export async function apiDelete(path: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
    return res.ok;
}
