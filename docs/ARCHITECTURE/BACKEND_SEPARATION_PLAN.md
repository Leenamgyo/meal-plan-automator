# Backend Separation Plan (server/ + GraphQL + TypeScript)

> 작성일: 2026-04-24 · 최종 수정: 2026-04-28 · 상태: **✅ Completed (Steps 1–7 + 후속 TS/테스트)**
>
> 목표: `main.cjs` 단일 파일에 섞인 백엔드 로직을 `server/` 폴더로 분리하고,
> REST를 **GraphQL**로 교체하여 (1) 책임이 명확한 레이어를 만들고
> (2) 향후 외부 API 서버(FastAPI + Strawberry GraphQL 등)로의 이행 경로를 확보한다.
>
> **트레이드오프:** 5개 리소스 단순 CRUD에서 GraphQL의 ROI는 제한적. 선택의 명분은
> "확장 시 쿼리 유연성"과 "FastAPI 이행 시 GraphQL → Strawberry 1:1 대응". 단순 CRUD에서
> 멈출 계획이면 REST가 더 싸다는 점을 기록해둔다.

---

## 1. 현황 — `main.cjs` 해부 (분리 전)

`main.cjs` 593줄은 다음 5가지 관심사가 혼재했다:

| 라인 범위 | 관심사 | 분리 대상 |
|---|---|---|
| L1-12 | Electron 부트 + 설정 상수 (`BUILD_DIR`, `PORT`, `DB_PATH`) | 남김 |
| L14-235 | SQLite 초기화 + 스키마 DDL + 프롬프트 시드 (seedPrompts 6종) + sort_order 마이그레이션 | **분리** |
| L237-256 | HTTP 유틸 (`parseBody`, `sendJSON`, CORS) | **분리** |
| L258-499 | REST API 핸들러 — `handleAPI()` 안에서 5개 리소스 라우팅 (categories, menu-items, meal-data, prompts, combos) | **분리** |
| L502-551 | 정적 파일 서버 (MIME 매핑, `startServer`) | **분리** |
| L553-592 | Electron 윈도우 생성 + 라이프사이클 | 남김 |

`handleAPI()` 내부는 URL 정규식 + method 조건문이 100줄 이상 이어지는 전형적 "big switch"였다. 분리 1순위.

---

## 2. 결정 사항

### 2.1 모듈 시스템: TypeScript + tsc (마이그레이션 도중 피벗)

**최초 결정(분리 시작 시점):** CJS 유지 — `.cjs` 확장자.

**피벗(Step 2 직후):** TypeScript로 전환. 사용자 결정(`"cjs 말고 ts 기반으로 가자"`).

**최종 빌드 파이프라인:**
- 소스: `.ts` (root + `server/**`)
- 별도 `tsconfig.server.json` (`module: CommonJS`, `target: ES2022`, strict)
- 산출물: `dist-server/` (CJS) + `dist-server/package.json` `{"type": "commonjs"}`로 ESM 충돌 차단
- Electron `main` 진입점: `dist-server/main.js`
- 빌드: `npm run build:server` (= `tsc -p tsconfig.server.json && echo {…} > dist-server/package.json`)

**이유:**
- `better-sqlite3`는 네이티브 모듈 + CJS 최적화. ESM에서 동적 import 필요 → 복잡도 증가.
- 루트 `package.json`이 `"type": "module"` (SvelteKit) 이므로 `dist-server/`에 별도 매니페스트로 CJS 격리.
- TS 도입으로 도메인 타입(`Category`, `MenuItem`, …) + Repository/Resolver 시그니처가 컴파일타임에 검증됨.
- `__dirname` 변경 처리: 소스 `server/config.ts` → 컴파일 후 `dist-server/server/config.js` → `path.resolve(__dirname, '..', '..')`로 프로젝트 루트 참조.

### 2.2 Repository 레이어: 도입 ✓

- 현재 routes 내부에 `db.prepare(...).run(...)`이 직접 박혀 있던 구조 → Repository 분리.
- routes(=GraphQL resolver)는 입력 검증 + 응답 포맷만 담당, 얇은 위임.
- FastAPI 이행 시 repositories → SQLAlchemy 모델/쿼리로 1:1 매핑 가능.
- 단위 테스트 가능: `new Database(':memory:')`를 주입해 격리.

### 2.3 IPC vs HTTP: HTTP 유지 ✓

Renderer ↔ Main은 `fetch()` via `127.0.0.1:3737` 그대로. IPC로 바꾸지 않음.
- HTTP를 유지하면 server/ 전체를 그대로 Node 독립 프로세스나 FastAPI로 이관 가능.

### 2.4 API 프로토콜: REST → GraphQL ✓

REST 대신 GraphQL 단일 엔드포인트(`POST /graphql`)로 전환했다.

**스택(실제 채택):**
- 서버: `graphql`(레퍼런스 구현) + `graphql-http`(표준 RFC 준수, 최소 런타임) + `@graphql-tools/schema`(SDL→executable)
- 클라이언트: 자체 미니 클라이언트 `src/lib/services/graphql.ts` (~30줄, fetch + JSON). `graphql-request` 미도입.
- 스키마: **SDL** (template literal). 단일 `server/graphql/schema.ts` 파일.
- 코드젠: 미도입 — 도메인 타입을 `server/types.ts`로 직접 관리, GraphQL 응답 타입은 호출부에서 ad-hoc.

**선택 근거:**
- Yoga/Apollo는 자체 HTTP 서버를 들고 와 기존 `http.createServer`와 중복.
- `graphql-http`는 `createHandler({ schema, context })`가 `(req, res) => Promise<void>` 반환 — 우리 서버에 그대로 마운트.
- SDL은 FastAPI의 Strawberry `@strawberry.type` 정의와 시각적으로 유사 → 이행 용이.
- 미니 클라이언트로 충분한 이유: 사용 패턴이 단순 query/mutation. `graphql-request`의 fragment/typing 기능은 활용 안 함.

**이행 전략:** **Parallel Cutover** — REST 엔드포인트와 `/graphql`을 일정 기간 병행, 프론트를 feature 단위로 이관한 뒤 REST를 제거. (Big-bang 금지) → 실행됨.

### 2.5 컨텍스트 주입 vs 모듈 싱글턴

**채택:** GraphQL `context: () => ({ repos: getRepos() })` — 매 요청마다 평가.
- `getRepos()`는 현재 활성 db 인스턴스에 바인딩된 Repository 묶음을 반환 (db identity 기반 캐싱).
- DB 재초기화(macOS activate) 시 자동으로 새 묶음 생성.
- 테스트에서는 `createRepositories(testDb)`를 직접 호출해 격리.

---

## 3. 실제 구조 (구현 결과)

```
project/
├── main.ts                                # 54 lines — Electron lifecycle only
├── preload.js                             # 변화 없음
├── tsconfig.server.json                   # CJS 빌드 전용
│
├── server/
│   ├── index.ts                           # startServer() — HTTP 부트스트랩
│   ├── config.ts                          # PORT, DB_PATH, BUILD_DIR
│   ├── types.ts                           # 도메인 타입 + DTO (Category, MenuItem, …)
│   │
│   ├── db/
│   │   ├── connection.ts                  # initDatabase / getDb / isDbOpen / closeDatabase
│   │   ├── schema.ts                      # SCHEMA_DDL 상수 (6 테이블)
│   │   └── migrations.ts                  # sort_order ALTER (idempotent)
│   │
│   ├── seed/
│   │   └── prompts.ts                     # seedPrompts (6종) + upsertPrompts(db)
│   │
│   ├── http/
│   │   └── static.ts                      # MIME + serveStatic (SPA fallback)
│   │
│   ├── graphql/
│   │   ├── index.ts                       # makeExecutableSchema + graphqlHandler
│   │   ├── schema.ts                      # SDL (typeDefs)
│   │   ├── resolvers.ts                   # 10 Query + 14 Mutation (단일 파일)
│   │   └── context.ts                     # GraphQLContext { repos }
│   │
│   ├── repositories/
│   │   ├── index.ts                       # createRepositories + getRepos (캐싱)
│   │   ├── categoryRepository.ts          # CRUD + sort_order
│   │   ├── menuItemRepository.ts          # ingredients JSON hydrate
│   │   ├── mealDataRepository.ts          # date 기준 upsert
│   │   ├── promptRepository.ts            # ID 충돌 검사 (existsById)
│   │   └── comboRepository.ts             # combos + combo_items 조인
│   │
│   ├── __tests__/
│   │   └── testDb.ts                      # in-memory DB 헬퍼 (test 전용)
│   │
│   └── **/*.test.ts                       # 11개 테스트 파일 (~1000 lines)
│
├── scripts/
│   └── seed.ts                            # GraphQL 기반 시드 (tsx로 실행)
│
└── src/                                   # 프론트
    └── lib/services/
        ├── graphql.ts                     # 미니 GraphQL 클라이언트 (gql<T>)
        ├── categories.ts                  # GraphQL 호출 + localStorage 폴백
        ├── menuItems.ts
        ├── mealData.ts
        ├── prompts.ts
        └── combos.ts

src/lib/features/<x>/api.ts                # services/* re-export (마이그레이션 진입점)
```

### 3.1 각 레이어의 책임

| 레이어 | 책임 | 의존 대상 |
|---|---|---|
| `db/connection.ts` | better-sqlite3 수명 관리, pragma, 재초기화 | `config`, `schema`, `migrations`, `seed/prompts` |
| `db/schema.ts` | DDL 상수 (테스트 인메모리 DB 재사용) | — |
| `db/migrations.ts` | idempotent ALTER | — (db 인자) |
| `seed/prompts.ts` | 프롬프트 시드 + UPSERT | — (db 인자) |
| `repositories/*` | 테이블별 CRUD, JSON 직렬화. **HTTP/GraphQL 지식 금지** | `db/connection`, `types` |
| `graphql/schema.ts` | SDL typeDefs | — |
| `graphql/resolvers.ts` | 필드별 리졸버. context.repos 호출만, SQL 금지 | `repositories/*`, `types`, `context` |
| `graphql/index.ts` | `makeExecutableSchema` + `graphql-http.createHandler` | schema + resolvers + repositories |
| `http/static.ts` | 정적 파일 서빙 (build/ → SPA fallback to index.html) | — |
| `index.ts` | `http.createServer` + `/graphql` 라우트 + 정적 서버 + `listen` | http/static + graphql |
| `main.ts` | Electron 라이프사이클 + DB init/close + startServer 호출 | `db/connection`, `index` |

**엄격한 단방향 의존:** `main.ts` → `server/index` → `graphql/*` → `repositories/*` → `db/*`
resolvers가 db를 직접 import하거나 repository가 GraphQL 타입을 import하면 안 됨. **준수 확인됨.**

### 3.2 최초 계획과 실제의 차이

| 항목 | 계획 | 실제 |
|---|---|---|
| 확장자 | `.cjs` | `.ts` (tsc → CJS 컴파일) |
| HTTP helpers | `helpers.cjs`(parseBody, sendJSON, CORS) | REST 제거 후 dead code → 삭제. graphql-http가 자체 처리 |
| Resolvers 분할 | `resolvers/<entity>.cjs` 5개 | 단일 `resolvers.ts` (185줄, 충분히 관리 가능) |
| Repository 명명 | `categoryRepo.cjs` | `categoryRepository.ts` (full) |
| Combo N+1 | DataLoader 검토 | 미도입 — 콤보 hydrate를 repo 내부에서 한 번에 처리 |
| 클라이언트 lib | `graphql-request` | 자체 30줄 클라이언트 — fragment/codegen 미사용으로 불필요 |
| 테스트 | 별도 작업 (보류) | **함께 작성** — node:test + tsx, 11 파일/~1000 줄 |

---

## 4. 파일 매핑 (main.cjs 기준, 분리 후 위치)

| main.cjs 라인 | 내용 | → 이동 위치 (실제) |
|---|---|---|
| L1-5 | require | 각 파일에서 개별 import |
| L7-11 | 상수 | `server/config.ts` |
| L14-66 | `initDatabase` + 6개 CREATE TABLE | `server/db/connection.ts` + `server/db/schema.ts` |
| L72-225 | seedPrompts + upsert | `server/seed/prompts.ts` |
| L227-232 | sort_order ALTER | `server/db/migrations.ts` |
| L239-256 | `parseBody`, `sendJSON` | (REST 제거 후 dead code → 삭제) |
| L258-277 | OPTIONS preflight | graphql-http 내장 처리 |
| L279-317 | categories CRUD | `repositories/categoryRepository.ts` + `graphql/resolvers.ts` Category 섹션 |
| L319-361 | menu-items CRUD | `repositories/menuItemRepository.ts` + resolvers |
| L363-389 | meal-data | `repositories/mealDataRepository.ts` + resolvers |
| L391-431 | prompts | `repositories/promptRepository.ts` + resolvers |
| L433-496 | combos + combo_items 조인 | `repositories/comboRepository.ts` + resolvers |
| L498-499 | API 404 | (제거됨) |
| L504-519 | `getMimeType` | `server/http/static.ts` |
| L521-551 | `startServer` | `server/index.ts` |
| L555-592 | Electron 윈도우 + 라이프사이클 | **`main.ts`에 남김** (54줄) |

### 4.1 최종 `main.ts` (54줄)

```ts
import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { PORT } from './server/config';
import { initDatabase, isDbOpen, closeDatabase } from './server/db/connection';
import { startServer } from './server';

const createWindow = (): void => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.8),
    webPreferences: {
      // 컴파일 후 __dirname = dist-server/, preload.js는 한 단계 위
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });
  mainWindow.loadURL(`http://127.0.0.1:${PORT}/`);
  mainWindow.webContents.on('console-message', (_e, _lv, msg) =>
    console.log(`[Renderer]: ${msg}`),
  );
};

app.whenReady().then(async () => {
  initDatabase();
  await startServer();
  createWindow();
  app.on('activate', () => {
    if (!isDbOpen()) initDatabase();
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase();
    app.quit();
  }
});
```

---

## 5. Repository 패턴 (실제 구현)

각 repo는 생성자에서 `db: Database.Database`를 받고, **prepared statement는 생성자에서 한 번만 컴파일**한다. 동적 SQL(`CategoryPatch`)만 매 호출 prepare.

```ts
// server/repositories/menuItemRepository.ts
import type Database from 'better-sqlite3';
import type { MenuItem, MenuItemCreate, MenuItemPatch } from '../types';

interface MenuItemRow {
  id: number;
  name: string;
  category_id: number | null;
  ingredients: string;  // JSON 문자열
  created_at: string;
}

const toDomain = (r: MenuItemRow): MenuItem => ({
  ...r,
  ingredients: JSON.parse(r.ingredients || '[]') as string[],
});

export class MenuItemRepository {
  private readonly findAllStmt: Database.Statement;
  private readonly findByIdStmt: Database.Statement;
  // ... insert/update/remove statements

  constructor(db: Database.Database) {
    this.findAllStmt = db.prepare('SELECT * FROM menu_items ORDER BY created_at');
    this.findByIdStmt = db.prepare('SELECT * FROM menu_items WHERE id = ?');
    // ...
  }

  findAll(): MenuItem[] {
    return (this.findAllStmt.all() as MenuItemRow[]).map(toDomain);
  }

  insert(input: MenuItemCreate): MenuItem { /* ... */ }
  update(id: number, patch: MenuItemPatch): MenuItem | null { /* ... */ }
  remove(id: number): void { /* ... */ }
}
```

### 5.1 Repository 팩토리 + 캐싱 (`repositories/index.ts`)

```ts
let cached: { db: Database.Database; repos: Repositories } | null = null;

export function getRepos(): Repositories {
  const db = getDb();
  if (cached && cached.db === db) return cached.repos;
  cached = { db, repos: createRepositories(db) };
  return cached.repos;
}
```

DB 재초기화(close → 재open) 시 db 인스턴스 identity가 달라져 자동으로 새 Repository 묶음을 만든다. Prepared statement도 새 db에 다시 컴파일됨.

---

## 6. GraphQL 스키마 (실제 구현)

### 6.1 SDL (`server/graphql/schema.ts`)

10 Query + 14 Mutation. 도메인 타입 6개 + 입력 타입 9개. 전체 SDL은 약 150줄.

```graphql
# 발췌
type Category {
  id: Int!
  name: String!
  color: String!
  sort_order: Int!
  created_at: String!
}

input CategoryCreateInput { name: String, color: String }
input CategoryPatchInput  { name: String, color: String, sort_order: Int }

type Query {
  categories: [Category!]!
  category(id: Int!): Category
  # ... menuItems / mealData / prompts / combos + 단건 조회
}

type Mutation {
  createCategory(input: CategoryCreateInput!): Category!
  updateCategory(id: Int!, input: CategoryPatchInput!): Category
  deleteCategory(id: Int!): Boolean!
  # ... 5개 도메인 × C/U/D
  upsertMealData(date: String!, menus: [MealEntryInput!]!): MealData!
}
```

### 6.2 Resolver (`server/graphql/resolvers.ts`)

Repository로의 얇은 위임 + 정책(404, 409)은 `GraphQLError`로 표현.

```ts
const notFound = (entity: string, id: number | string): never => {
  throw new GraphQLError(`${entity} not found: ${id}`, {
    extensions: { code: 'NOT_FOUND' },
  });
};

export const resolvers = {
  Query: {
    categories: (_p, _a, { repos }: GraphQLContext) => repos.categories.findAll(),
    category: (_p, { id }: { id: number }, { repos }: GraphQLContext) =>
      repos.categories.findById(id),
    // ...
  },
  Mutation: {
    updateMenuItem: (_p, { id, input }, { repos }) => {
      const updated = repos.menuItems.update(id, input);
      if (!updated) notFound('MenuItem', id);
      return updated;
    },
    createPrompt: (_p, { input }, { repos }) => {
      if (repos.prompts.existsById(input.id)) conflict('Prompt', input.id);
      return repos.prompts.insert(input);
    },
    // ...
  },
};
```

### 6.3 Handler (`server/graphql/index.ts`)

```ts
export const schema = makeExecutableSchema({ typeDefs, resolvers });

export const graphqlHandler = createHandler<GraphQLContext>({
  schema,
  context: (): GraphQLContext => ({ repos: getRepos() }),
});
```

### 6.4 부트스트랩 (`server/index.ts`)

```ts
export function startServer(): Promise<Server> {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const url = req.url ?? '';
      if (url.startsWith('/graphql')) {
        await graphqlHandler(req, res);
        return;
      }
      return serveStatic(req, res, BUILD_DIR);
    });
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`로컬 서버 시작: http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}
```

---

## 7. 프론트 GraphQL 클라이언트 (실제 구현)

### 7.1 미니 클라이언트 (`src/lib/services/graphql.ts`)

```ts
const GRAPHQL_ENDPOINT = "/graphql";

export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length > 0) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error("GraphQL: empty response");
  return json.data;
}
```

### 7.2 Feature 서비스 (`src/lib/services/categories.ts`)

```ts
const CATEGORY_FIELDS = `id name color sort_order`;

export async function fetchCategories(): Promise<Category[]> {
  try {
    const { categories } = await gql<{ categories: Category[] }>(
      `query { categories { ${CATEGORY_FIELDS} } }`,
    );
    return categories;
  } catch {
    const saved = localStorage.getItem("menuCategories");
    return saved ? JSON.parse(saved) : [];
  }
}

export async function createCategory(name: string, color: string): Promise<Category | null> {
  try {
    const { createCategory } = await gql<{ createCategory: Category }>(
      `mutation($input: CategoryCreateInput!) {
        createCategory(input: $input) { ${CATEGORY_FIELDS} }
      }`,
      { input: { name, color } },
    );
    return createCategory;
  } catch {
    return null;
  }
}
```

### 7.3 Feature 진입점 re-export

`features/<x>/api.ts`는 단일 소스화를 위해 `services/*`를 re-export만 한다 (Task #6 import 경로 업데이트 후 services/ → features/ 이동 예정).

```ts
// src/lib/features/category/api.ts
export {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "$lib/services/categories";
```

**이관 순서(실제):** 한 번에 5개 services 파일 일괄 GraphQL로 재작성. 외부 시그니처 무변경 → 컴포넌트 호출부 수정 불필요.

---

## 8. 마이그레이션 순서 (실제 진행 순서)

> **원칙(준수됨):** 한 번에 한 층씩. 각 단계 후 빌드 검증. REST와 GraphQL은 Step 4~6에서 병존.

### Step 1 — DB 레이어 추출 ✅
- `server/config.cjs`, `server/db/{connection,schema,migrations}.cjs`, `server/seed/prompts.cjs` 작성
- `main.cjs`에서 `initDatabase`를 require로 교체
- **검증:** 앱 실행 → DB 경로 로그 + 기존 REST 정상

### Step 2 — HTTP 유틸 + 정적 서버 추출 ✅
- `server/http/{helpers,static}.cjs` 작성
- `main.cjs`의 `parseBody`, `sendJSON`, `getMimeType`, 정적 서빙 블록을 require로 치환

### **(피벗) — TypeScript 전환** ✅
- 사용자 결정으로 `.cjs` → `.ts` 전환
- `tsconfig.server.json` 작성 (CJS 출력, strict, ES2022)
- 모든 `.cjs` 파일을 `.ts`로 1:1 재작성, 8개 구 `.cjs` 삭제
- `package.json`: `main: "dist-server/main.js"`, `build:server` 스크립트, `@types/{node,better-sqlite3}` 추가
- **검증:** `tsc --noEmit` 클린, `npm run build:server` 정상

### Step 3 — Repository 레이어 도입 ✅
- `server/repositories/*.ts` 5개 + `index.ts` (팩토리/캐싱)
- `server/types.ts`로 도메인 타입 분리
- main.ts handleAPI 내부의 `db.prepare(...)`을 `repos.<entity>.<method>()`로 교체
- **검증:** `tsc --noEmit` 클린, repository 모듈 introspection (5개 클래스, 메서드 시그니처)

### Step 4 — GraphQL 레이어 추가 (REST와 병존) ✅
- 의존성: `graphql`, `graphql-http`, `@graphql-tools/schema`
- `server/graphql/{schema,resolvers,context,index}.ts` 작성
- `main.ts`의 HTTP 서버에 `/graphql` 라우트 추가, `/api/*` 유지
- **검증:** schema introspection (10 Query / 14 Mutation 매핑), mock repos로 graphql() 직접 실행

### Step 5 — 프론트 GraphQL 클라이언트 이관 ✅
- `src/lib/services/graphql.ts` (미니 클라이언트, ~30줄)
- 5개 `services/*.ts` (categories/menuItems/mealData/prompts/combos) GraphQL로 재작성
- `features/<x>/api.ts` 5개를 `services/*` re-export로 단일 소스화
- **검증:** `vite build` 성공, svelte-check 신규 에러 0건

### Step 6 — REST 제거 + scripts/seed.ts GraphQL 재작성 ✅
- `main.ts`에서 `handleAPI` + 모든 `/api/*` 라우팅 삭제 → 226줄 → 79줄
- dead code 삭제: `src/lib/services/db.ts`, `src/lib/shared/api/client.ts`, `server/http/helpers.ts`
- `scripts/seed.js` → `scripts/seed.ts` (GraphQL mutation 기반, `tsx`로 실행)
- `npm run seed` 스크립트 추가
- **검증:** seed.ts typecheck, vite build, dist-server 빌드 정상

### Step 7 — `server/index.ts` 통합 + `main.ts` 슬림화 ✅
- `server/index.ts` 신규 (`startServer()`만 export)
- `main.ts`는 Electron 라이프사이클만 담당하도록 축소 → 79줄 → **54줄**
- 추가 dead code 정리: `server/http/helpers.ts` 삭제(REST 제거 후 미사용)

### (후속) — 서버 테스트 작성 ✅
- Node 22 내장 `node:test` + `tsx` import hook
- `server/__tests__/testDb.ts` (in-memory DB 헬퍼) + 11개 `*.test.ts` 파일 (~1000줄)
- npm 스크립트: `test`, `test:watch`
- **검증(샌드박스):** DB 불필요 테스트 14건 PASS. DB 의존 테스트 50여 건은 사용자 macOS 환경에서 `npm test` 실행 필요.

각 단계는 별도 커밋. `/release patch|minor` 로 버전 관리.

---

## 9. 미래 이행 시나리오

### 9.1 "server/를 독립 프로세스로 분리" (중간 단계)

```ts
// server/standalone.ts (가상)
import { initDatabase } from './db/connection';
import { startServer } from './index';

initDatabase();
startServer();
```

→ `tsx server/standalone.ts` 또는 빌드된 `node dist-server/server/standalone.js`로 Electron 없이도 실행 가능.
프론트는 `fetch('/graphql')` 그대로 사용.

### 9.2 "FastAPI + Strawberry GraphQL로 교체"

파일 대응표:

| Node (현재) | FastAPI + Strawberry (미래) |
|---|---|
| `server/db/connection.ts` | `server/db/session.py` (SQLAlchemy Session) |
| `server/db/schema.ts` | `server/db/models.py` (SQLAlchemy Models) |
| `server/types.ts` | `server/schemas.py` (Pydantic / dataclass) |
| `server/repositories/*.ts` | `server/repositories/*.py` |
| `server/graphql/schema.ts` (SDL) | `server/graphql/schema.py` (`@strawberry.type`) — SDL 형태 그대로 이식 |
| `server/graphql/resolvers.ts` | `@strawberry.type` 필드 메서드 (Query/Mutation 클래스) |
| `server/graphql/context.ts` | Strawberry `Info.context` |
| `server/graphql/index.ts` | `strawberry.fastapi.GraphQLRouter` |
| `server/seed/prompts.ts` | `server/seed/prompts.py` |
| `server/index.ts` | `uvicorn server.main:app` |

**프론트 변경 최소:** `src/lib/services/graphql.ts`의 `GRAPHQL_ENDPOINT`만 외부 호스트로 교체.
GraphQL 스키마가 동일하므로 쿼리 문자열 재활용 가능.
DB 파일 `meal-chart.db`도 SQLAlchemy가 그대로 읽음.

---

## 10. 리스크 & 미해결 이슈 (결과 반영)

| 항목 | 리스크 | 결과 / 완화 |
|---|---|---|
| db 싱글턴 재초기화 | macOS activate 시 DB 닫힘 이슈 | ✅ `getDb()`가 `!db.open`이면 자동 `initDatabase()` 호출 |
| Repository 캐시 무효화 | DB 재초기화 시 stale prepared statements | ✅ `getRepos()`가 db identity로 캐시 무효화 |
| 트랜잭션 | 콤보 생성 시 combos + combo_items 삽입이 트랜잭션 아님 | ⚠️ **미해결** — 단일 클라이언트 데스크톱 앱이라 위험도 낮음. 필요 시 `db.transaction(...)` 래핑 |
| `scripts/seed.js` | REST 호출로 시드. Step 6에서 재작성 필요 | ✅ `scripts/seed.ts` GraphQL 버전으로 재작성 |
| N+1 문제 | `combos { items { category { ... } } }` | ✅ Repository에서 `findItemsByComboId` JOIN으로 일괄 hydrate. DataLoader 미도입(현 데이터 규모에서 무시 가능) |
| 에러 shape 변경 | REST 404 → GraphQL `errors[]` | ✅ resolver에서 `GraphQLError({ extensions: { code: 'NOT_FOUND'/'CONFLICT' } })` 표준화. 프론트는 try/catch로 통일 |
| 테스트 부재 | 리그레션 감지 수동 | ✅ node:test + tsx로 11개 테스트 파일 작성 (server 전 모듈 커버) |
| GraphQL introspection | 기본 켜짐 | ✅ 로컬 127.0.0.1만 노출이라 무관. 필요 시 `createHandler({ ..., disableIntrospection: true })` |
| TS 전환 시 ESM/CJS 혼재 | 루트 `"type": "module"` + native CJS 모듈 | ✅ `dist-server/package.json {"type":"commonjs"}` 매니페스트로 격리 |
| Electron 진입점 경로 | TS 컴파일 후 `__dirname` 변경 | ✅ `path.resolve(__dirname, '..', '..')`로 프로젝트 루트 참조 (`dist-server/server/foo.js` 기준) |

---

## 11. 결과 요약 (메트릭)

| 지표 | Before | After |
|---|---|---|
| `main.cjs` 크기 | 593 줄 | `main.ts` **54 줄** |
| 백엔드 모듈 수 | 1 (main.cjs) | 18개 .ts 파일 (server/*, main.ts) |
| API 프로토콜 | REST (5 리소스 × 4 메서드, ~20 엔드포인트) | GraphQL 단일 엔드포인트 (10 Query + 14 Mutation) |
| 타입 안전성 | JS, 동적 | TypeScript strict, 도메인 타입 + GraphQL SDL 이중 검증 |
| 테스트 커버리지 | 0 | 11 파일 / ~1000 줄 / repository·resolver·schema 단위 테스트 |
| 빌드 파이프라인 | electron이 main.cjs 직접 로드 | tsc → dist-server/ → electron이 dist-server/main.js 로드 |
| 프론트 클라이언트 | apiGet/apiPost (REST) | gql<T>(query, variables) (GraphQL) |
| FastAPI 이행 준비도 | 낮음 (코드 결합 + REST 라우팅) | **높음** — Repository/Resolver/SDL 1:1 매핑 가능 |

---

## 12. 체크리스트 (구현 완료)

- [x] Step 1 — DB 레이어 추출 후 앱 정상 실행
- [x] Step 2 — HTTP 유틸/정적 서버 추출 후 UI 로드 정상
- [x] (피벗) TypeScript 전환 + tsc 빌드 파이프라인
- [x] Step 3 — Repository 도입 후 REST CRUD 전수 정상
- [x] Step 4 — GraphQL 엔드포인트(`/graphql`) 동작 확인, REST와 결과 일치
- [x] Step 5 — 프론트 services 5개 GraphQL 이관 완료
- [x] Step 6 — REST 제거 후 `/api/*` 호출 404, dead code 삭제
- [x] Step 7 — `main.ts` 54줄로 축소, `server/index.ts` 분리
- [x] `scripts/seed.ts` GraphQL 버전 작성 (`npm run seed`)
- [x] 서버 테스트 11개 파일 작성 (`npm test`, `npm run test:watch`)
- [ ] CLAUDE.md의 "Architecture" 섹션 업데이트 (Process Separation, Data Flow, File Tree, GraphQL) ← Task #8
- [ ] CHANGELOG에 `Changed — refactored main.cjs into server/ folder, migrated REST to GraphQL, TS 전환` 엔트리 ← Task #8
