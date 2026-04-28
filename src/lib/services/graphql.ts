/**
 * GraphQL 클라이언트 — 도메인 지식 없는 순수 HTTP 래퍼
 * server/graphql 핸들러(/graphql)와 통신
 *
 * 사용:
 *   const { categories } = await gql<{ categories: Category[] }>(`query { categories { id name } }`);
 *
 * Dev 로그: `import.meta.env.DEV`가 true이면 (vite dev / SvelteKit dev) 모든 호출을
 * console로 출력. production 빌드(`npm run build:client`)에서는 트리쉐이킹으로 제거된다.
 */

const GRAPHQL_ENDPOINT = "/graphql";

interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

// "query GetX(…) { … }" / "mutation X { … }" / 익명 "{ categories { … } }" → { type, name }
// 디버깅용 식별자만 추출. 파서가 아니라 단순 정규식이라 엣지케이스 무시.
function inspectOperation(query: string): { type: string; name: string } {
    const trimmed = query.trim();
    const match = /^(query|mutation|subscription)(?:\s+([A-Za-z_][\w]*))?/.exec(trimmed);
    if (match) {
        return { type: match[1], name: match[2] ?? "(anonymous)" };
    }
    // 키워드 생략된 query (예: `{ categories { … } }`)
    return { type: "query", name: "(shorthand)" };
}

export async function gql<T>(
    query: string,
    variables?: Record<string, unknown>,
): Promise<T> {
    const dev = import.meta.env.DEV;
    const op = dev ? inspectOperation(query) : null;
    const start = dev ? performance.now() : 0;

    if (dev && op) {
        const hasVars = variables && Object.keys(variables).length > 0;
        // 그룹으로 묶어 변수가 있을 때만 펼쳐 보이게
        if (hasVars) {
            console.groupCollapsed(`%c[GQL →] ${op.type} ${op.name}`, "color:#06c");
            console.log("variables:", variables);
            console.groupEnd();
        } else {
            console.log(`%c[GQL →] ${op.type} ${op.name}`, "color:#06c");
        }
    }

    let res: Response;
    try {
        res = await fetch(GRAPHQL_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, variables }),
        });
    } catch (err) {
        if (dev && op) {
            const ms = (performance.now() - start).toFixed(1);
            console.error(`%c[GQL ✕] ${op.name} (${ms}ms · network error)`, "color:#c00", err);
        }
        throw err;
    }

    if (!res.ok) {
        if (dev && op) {
            const ms = (performance.now() - start).toFixed(1);
            console.error(`%c[GQL ✕] ${op.name} (${ms}ms · HTTP ${res.status})`, "color:#c00");
        }
        throw new Error(`GraphQL HTTP ${res.status}`);
    }

    const json = (await res.json()) as GraphQLResponse<T>;

    if (json.errors && json.errors.length > 0) {
        if (dev && op) {
            const ms = (performance.now() - start).toFixed(1);
            console.error(
                `%c[GQL ✕] ${op.name} (${ms}ms · GraphQL error)`,
                "color:#c00",
                json.errors,
            );
        }
        throw new Error(json.errors[0].message);
    }
    if (!json.data) {
        if (dev && op) {
            console.error(`%c[GQL ✕] ${op.name} · empty response`, "color:#c00");
        }
        throw new Error("GraphQL: empty response");
    }

    if (dev && op) {
        const ms = (performance.now() - start).toFixed(1);
        console.log(`%c[GQL ←] ${op.name} (${ms}ms)`, "color:#0a0");
    }

    return json.data;
}
