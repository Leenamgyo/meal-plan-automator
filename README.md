# Meal Chart

Electron + SvelteKit 기반 식단 관리 데스크톱 앱.

## 빠른 시작

```bash
# 의존성
npm install

# 풀스택 실행 (build + Electron)
npm start

# 프론트만 (Vite dev server, port 5173)
npm run dev

# 더미 데이터 시드 (앱 실행 중)
npm run seed

# 테스트
npm test

# 패키징
npm run dist
```

## 기술 스택

- **Electron 40** — 데스크톱 셸 + 임베드 HTTP 서버 (`127.0.0.1:3737`)
- **SvelteKit 2** + **adapter-static** — 프론트엔드, Svelte 5 runes
- **TypeScript** — 백엔드 + 프론트 모두 strict
- **better-sqlite3** — 동기 SQLite 드라이버 (네이티브 모듈)
- **GraphQL** — 백엔드 단일 엔드포인트 (`POST /graphql`), `graphql-http` + `@graphql-tools/schema`
- **Tailwind CSS v3** — 디자인 시스템 (Verdant Core, Plus Jakarta Sans + Inter)
- **Gemini API** (`gemini-2.5-flash-lite`) — 메뉴 등록 시 재료 자동 추천

## 아키텍처 한눈에

```
SvelteKit UI (renderer)
    ↕ POST /graphql
Electron main (dist-server/main.js)
    ↕ server/index.ts (HTTP 부트스트랩)
GraphQL handler  →  Repositories  →  better-sqlite3
                                          ↕
                                  meal-chart.db
```

상세: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## 환경변수

`.env.example` 복사 후 `.env`에 키 입력 (런타임에 UI에서도 입력 가능):

| 변수 | 설명 |
|---|---|
| `PUBLIC_GEMINI_API_KEY` | Gemini API 키 (옵션 — UI에서 직접 입력 시 불필요) |

## 프로젝트 구조

```
.
├── main.ts                       # Electron 라이프사이클 (54줄)
├── server/                       # 백엔드 (TypeScript → dist-server/)
│   ├── index.ts                  # HTTP 부트스트랩
│   ├── db/                       # SQLite connection / schema / migrations
│   ├── repositories/             # 5개 도메인 Repository
│   ├── graphql/                  # SDL + resolvers + handler
│   └── seed/                     # 프롬프트 시드
├── src/                          # SvelteKit 프론트
│   ├── routes/+page.svelte       # 메인 (탭 라우터 — Planner / Inventory / Settings)
│   └── lib/
│       ├── services/             # GraphQL 호출 (categories, menuItems, mealData, combos, prompts)
│       ├── components/           # 탭 컴포넌트
│       ├── features/             # Feature-based 진입점 (services/* re-export)
│       ├── stores/               # Svelte writable stores
│       └── utils/                # 한글 검색, 달력, 배열 유틸
├── scripts/seed.ts               # GraphQL 기반 시드 스크립트
├── docs/                         # 아키텍처 / 컨벤션 / ADR
└── CHANGELOG.md
```

## 빌드 파이프라인

`npm run build`는 두 단계:

1. **`build:client`** — `vite build` → `build/`. Electron `file://` 호환 위해 `/_app` → `./_app` 패치
2. **`build:server`** — `tsc -p tsconfig.server.json` → `dist-server/`. 루트 `"type": "module"`과 격리하기 위해 `dist-server/package.json`에 `{"type": "commonjs"}` 작성

Electron `main` 진입점은 `dist-server/main.js`.

## 더 보기

- [`CHANGELOG.md`](./CHANGELOG.md) — 버전별 변경
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — 백엔드/프론트 레이어, 의존 방향, 빌드
- [`docs/conventions/`](./docs/conventions/) — 도메인별 작업 규칙
- [`CLAUDE.md`](./CLAUDE.md) — AI 코딩 에이전트 진입점
