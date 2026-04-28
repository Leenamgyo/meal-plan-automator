# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Frontend-only dev server (SvelteKit only; no Electron, no API)
npm run dev

# Development: build + run Electron app (full stack)
npm start

# Build SvelteKit static + TypeScript server (full pipeline)
npm run build

# Build only TypeScript server → dist-server/
npm run build:server

# Build only SvelteKit static output (+ fixes asset paths for Electron)
npm run build:client

# Seed dummy data via GraphQL (requires app running on port 3737)
npm run seed

# Run server unit tests (Node 22 test runner via tsx)
npm test
npm run test:watch

# Package as distributable
npm run dist

# Clear Electron localStorage (run while app is closed)
node clear-storage.js
```

`npm test`는 `server/**/*.test.ts`를 `node:test` + `tsx`로 실행한다. 별도 테스트 프레임워크는 사용하지 않는다.

## CLAUDE.md 업데이트 규칙

**모든 기능 구현 완료 후**, 아래 체크리스트를 확인하고 해당하는 항목이 있으면 **즉시 이 파일을 업데이트**한다:

- [ ] 디렉토리 구조 또는 파일 위치 변경 (이동, 신규, 삭제)
- [ ] 새 서비스 / 유틸 / 스토어 / Repository 추가
- [ ] import 규칙 변경 (어떤 모듈에서 무엇을 가져와야 하는지)
- [ ] 아키텍처 레이어 책임 변경 (예: 도메인 로직이 다른 파일로 이동)
- [ ] 탭 컴포넌트 추가 / 제거
- [ ] 환경변수 또는 빌드 프로세스 변경
- [ ] GraphQL 스키마 (Query/Mutation/Type) 추가/변경
- [ ] `Frontend Source Structure` / `Backend Source Structure` 섹션의 파일 목록이 실제와 일치하는지 확인
- [ ] `SQLite Schema` 섹션이 실제 테이블 구조와 일치하는지 확인

> **원칙:** 코드를 고쳤으면, CLAUDE.md도 같이 고친다. PR 반영 전 CLAUDE.md가 최신 상태인지 항상 검증한다.

---

## Versioning & Changelog

This project uses **Semantic Versioning** (`MAJOR.MINOR.PATCH`):
- `PATCH` — bug fixes, minor tweaks
- `MINOR` — new features, UI improvements, non-breaking changes
- `MAJOR` — breaking architecture changes

When committing a meaningful batch of changes:
1. Bump `version` in `package.json`
2. Add an entry to `CHANGELOG.md` under a new `## [x.y.z] - YYYY-MM-DD` heading
3. Commit with `git tag vX.Y.Z` after the commit

**CHANGELOG.md categories to use:**
- `Added` — new features
- `Changed` — changes to existing functionality
- `Fixed` — bug fixes
- `Removed` — removed features

---

## Slash Commands (Skills)

반복 워크플로우는 스킬로 등록되어 있다. 해당 상황이 되면 직접 실행하거나 사용자에게 제안한다.

| 커맨드 | 실행 시점 | 인자 |
|---|---|---|
| `/plan [기능 설명]` | 새 기능/탭/아키텍처 변경 **구현 전** | 기능 설명 (필수) |
| `/review` | 작업 완료 **직전** 최종 점검 | 없음 |
| `/debug [에러]` | 동일 오류 **2회 이상** 반복 시 | 에러 메시지 (필수) |
| `/release [patch\|minor\|major]` | 의미 있는 변경 묶음 **완료 후** | 타입 생략 시 자동 판단 |
| `/feat [기능명]` | 새 기능 작업 **시작 시** — 이슈 생성 + feature 브랜치 생성 + TODO.md 추가 | 기능명 (필수) |
| `/pr` | feature 브랜치 작업 **완료 후** — build → commit → push → PR 생성 (`Closes #N` 자동 포함) | PR 추가 설명 (선택) |
| `/done [이슈번호]` | PR 병합 후 — 이슈 닫기 + TODO.md 완료 처리 | 이슈 번호 (필수) |

스킬 파일 위치: `.claude/commands/`

## Architecture

This is an **Electron desktop app** wrapping a **SvelteKit static site**. 백엔드는 **TypeScript로 작성한 `server/` 레이어**가 담당하며, Electron main process에서 임베드 HTTP 서버 + GraphQL로 노출된다.

### Process Separation

- **`main.ts`** — Electron 라이프사이클 진입점 (54줄, TypeScript). 컴파일 후 `dist-server/main.js`로 산출. 시작 시:
  1. `initDatabase()` — better-sqlite3 커넥션 + 스키마 + 시드
  2. `startServer()` — `server/index.ts`의 부트스트랩 호출 (HTTP 서버 + `/graphql` 라우팅)
  3. `BrowserWindow`가 `http://127.0.0.1:3737/`을 로드
- **`server/`** — 백엔드 로직 (TypeScript, CJS 컴파일). 단일 백엔드 진입점은 `POST /graphql`. REST API는 v0.3.0에서 제거됨.
- **`preload.js`** — Minimal Electron preload script.
- **`src/`** — SvelteKit frontend compiled to static output via `adapter-static`. 백엔드와는 GraphQL(`/graphql`)로만 통신.

### Build Pipeline (TypeScript → CJS)

루트 `package.json`은 `"type": "module"` (SvelteKit), 그러나 `server/` + `main.ts`는 `tsc`로 CJS 산출:

```
main.ts                          → dist-server/main.js
server/**/*.ts                   → dist-server/server/**/*.js
+ dist-server/package.json {"type":"commonjs"}    # ESM 충돌 차단
```

- `tsconfig.server.json` — `module: CommonJS`, `target: ES2022`, strict, `outDir: ./dist-server`
- Electron `main` 진입점은 `dist-server/main.js`
- `__dirname`은 컴파일 후 `dist-server/server/`이므로 프로젝트 루트 참조 시 `path.resolve(__dirname, '..', '..')`
- 테스트 파일(`server/**/*.test.ts`, `server/__tests__/**`)은 빌드에서 제외

### Data Flow

```
SvelteKit UI (browser context)
  ↕ fetch() POST /graphql  → gql<T>(query, variables)
Embedded HTTP server (server/index.ts)
  ↕ graphql-http handler (server/graphql/index.ts)
GraphQL resolvers (server/graphql/resolvers.ts)
  ↕ context.repos
Repository layer (server/repositories/*)
  ↕ better-sqlite3 (synchronous, prepared statements)
meal-chart.db (SQLite, in project root)
```

### Backend Source Structure (`server/`)

```
server/
├── index.ts                         # startServer() — HTTP 부트스트랩 (/graphql + 정적 fallback)
├── config.ts                        # PORT(3737), DB_PATH, BUILD_DIR
├── types.ts                         # 도메인 타입 (Category, MenuItem, MealEntry, MealData, Prompt, Combo) + DTO
│
├── db/
│   ├── connection.ts                # initDatabase / getDb / isDbOpen / closeDatabase (싱글턴)
│   ├── schema.ts                    # SCHEMA_DDL (6 테이블 CREATE 문자열)
│   └── migrations.ts                # sort_order ALTER (idempotent)
│
├── seed/
│   └── prompts.ts                   # seedPrompts(6종) + upsertPrompts(db) — 항상 코드 최신본으로 갱신
│
├── http/
│   └── static.ts                    # serveStatic + getMimeType (build/ → SPA fallback to index.html)
│
├── graphql/
│   ├── schema.ts                    # SDL typeDefs (10 Query + 14 Mutation)
│   ├── resolvers.ts                 # Repository 위임 (단일 파일, ~185줄)
│   ├── context.ts                   # GraphQLContext { repos }
│   └── index.ts                     # makeExecutableSchema + graphql-http createHandler
│
├── repositories/
│   ├── index.ts                     # createRepositories + getRepos (db identity 기반 캐싱)
│   ├── categoryRepository.ts        # CRUD + sort_order 정렬
│   ├── menuItemRepository.ts        # ingredients JSON ↔ string[] hydrate
│   ├── mealDataRepository.ts        # date 기준 upsert
│   ├── promptRepository.ts          # existsById (POST 충돌 검사)
│   └── comboRepository.ts           # combos + combo_items 조인 hydrate
│
├── __tests__/
│   └── testDb.ts                    # 테스트용 in-memory DB 헬퍼
│
└── **/*.test.ts                     # node:test + tsx 단위 테스트 (11 파일)
```

**엄격한 단방향 의존:** `main.ts` → `server/index` → `graphql/*` → `repositories/*` → `db/*`
- resolvers가 db를 직접 import 금지
- repository가 GraphQL 타입을 import 금지
- repository는 HTTP/네트워크 지식 금지 (DB만 안다)

### Backend Import 규칙

- HTTP 부트스트랩 → `./server/index` (main.ts에서만 사용)
- 도메인 타입 → `server/types`
- DB 라이프사이클 → `server/db/connection` (`initDatabase`, `getDb`, `closeDatabase`)
- Repository 사용 → `server/repositories` (`getRepos()` — context 주입, 테스트는 `createRepositories(testDb)` 직접 호출)
- GraphQL 컨텍스트 타입 → `server/graphql/context`
- 신규 SQL은 반드시 Repository 안에 작성. resolver/main에서 `db.prepare()` 직접 호출 금지.

### Frontend Source Structure

```
src/lib/
├── types/
│   ├── index.ts          # 모든 타입 re-export 진입점
│   ├── models.ts         # DB 스키마 모델 (Category, MenuItem, MealRecord, MealEntry, Prompt, Combo)
│   └── ui.ts             # UI 전용 타입 (Message, CalendarDay)
├── services/
│   ├── graphql.ts        # 미니 GraphQL 클라이언트 (gql<T>(query, variables) — POST /graphql)
│   ├── categories.ts     # Category CRUD (GraphQL) + localStorage 폴백
│   ├── menuItems.ts      # MenuItem CRUD (GraphQL) + localStorage 폴백
│   ├── mealData.ts       # MealData CRUD (GraphQL upsert) + localStorage 폴백
│   ├── prompts.ts        # Prompt CRUD (GraphQL) + localStorage 폴백
│   ├── combos.ts         # Combo CRUD (GraphQL, items 중첩 query)
│   ├── gemini.ts         # 순수 Gemini API 클라이언트 (callGeminiText)
│   ├── mealService.ts    # 식단 도메인 AI 함수 (askGemini, recommendMenus, suggestCombos, suggestIngredients)
│   └── mealGeneration.ts # AI 추천 순수 함수 (점수 계산, 프롬프트 빌드)
├── features/             # Feature-based 진입점 (services/* re-export — Task #6 후 services/ 이동 예정)
│   ├── category/api.ts
│   ├── menu/api.ts
│   ├── meal/api.ts
│   ├── combo/api.ts
│   └── ai/prompts.ts
├── utils/
│   ├── hangul.ts         # 한글 초성 검색 (hangulIncludes)
│   ├── calendarUtils.ts  # 달력 날짜 계산 (buildCalendarDays, dateKey, isToday)
│   └── arrayUtils.ts     # 배열 순서 변경 (moveItemUp, moveItemDown, swapItems)
├── stores/
│   └── index.ts          # geminiKey, aiIngredientsEnabled, toastMessage, confirmDialog writable stores + showSuccess(), showConfirm() helpers
└── components/
    ├── CalendarTab.svelte     # Planner Module (PLN)
    ├── MenuTab.svelte         # Inventory Module (INV)
    ├── SettingsTab.svelte     # Settings Module (SET)
    ├── StatsTab.svelte        # (레거시 — +page.svelte에서 사용하지 않음, Analytics 참고용)
    ├── ChatTab.svelte         # (레거시 — +page.svelte에서 사용하지 않음, 채팅 참고용)
    ├── AlertSuccess.svelte    # COM-001: 우상단 toast 알림 (전역)
    ├── AlertConfirm.svelte    # COM-002: 삭제 확인 다이얼로그 (전역)
    ├── ModalNewEntrySelection.svelte  # INV-004: 단품/콤보 선택 모달
    ├── ModalMenuRegistry.svelte       # INV-002: 단품 메뉴 등록 모달
    └── ModalComboRegistry.svelte      # INV-003: 콤보 등록 모달
```

**Import 규칙:**
- 타입 → `$lib/types/models` 또는 `$lib/types/ui` (또는 배럴 `$lib/types`)
- GraphQL 인프라 → `$lib/services/graphql` (`gql<T>()`만 export. 도메인 지식 없음)
- 엔티티 CRUD → `$lib/services/{categories|menuItems|mealData|prompts|combos}` (GraphQL query/mutation 캡슐화)
- AI → `$lib/services/gemini` (순수 API) 또는 `$lib/services/mealService` (도메인)
- 상태 → `$lib/stores` (`geminiKey`, `toastMessage`, `confirmDialog` store + `showSuccess()`, `showConfirm()` helpers)
- **`PUBLIC_GEMINI_API_KEY` env var는 .env에 없으므로 `$env/static/public`에서 import 금지 — `$geminiKey` store만 사용**
- 신규 백엔드 호출은 반드시 services 함수에 추가. 컴포넌트에서 `gql()` 직접 호출 금지.

### SQLite Schema (defined in `server/db/schema.ts`)

| Table | Key columns | Notes |
|---|---|---|
| `categories` | `id`, `name`, `color`, `sort_order` | Menu categories |
| `menu_items` | `id`, `name`, `category_id`, `ingredients` (JSON array) | FK → categories (SET NULL on delete) |
| `meal_data` | `date` (UNIQUE), `menus` (JSON array of MealEntry objects) | Upsert on conflict. MealEntry = `{ name, category_id, color }`. Old string[] data is normalized on fetch. |
| `prompts` | `id` (TEXT PK), `content`, `version`, `is_active` | AI 프롬프트 (코드에서 항상 갱신). IDs: `chat_base`, `ingredient_suggest`, `auto_gen`, `day_plan_options`, `menu_recommend`, `combo_suggest` |
| `combos` | `id`, `name`, `description`, `is_active` | 콤보 메뉴 |
| `combo_items` | `combo_id`, `menu_item_id` (PK 복합) | 콤보↔단품 매핑, CASCADE DELETE |

스키마 변경 시 `server/db/schema.ts`의 `SCHEMA_DDL` 상수를 수정하고, 호환성이 필요하면 `server/db/migrations.ts`에 idempotent ALTER를 추가한다.

### Tab Components

Single-page app with tab-based navigation in `src/routes/+page.svelte`. The active tab is tracked with a local `activeTab` variable — no router.

| Tab id | Component | Purpose |
|---|---|---|
| `planner` | `CalendarTab.svelte` | Planner Module: 월간 캘린더 + 큐레이션 패널 (더블클릭 배정/삭제, AI 추천 콤보 모달) |
| `inventory` | `MenuTab.svelte` | Inventory Module: 단품+콤보 통합 관리, 3종 등록 모달 + 콤보 편집 모달, 사용/비사용 필터 |
| `settings` | `SettingsTab.svelte` | Settings Module: API 키, 카테고리 관리, AI 추천 콤보 수 설정 |

**Planner 인터랙션:**
- 날짜 단일클릭 → 선택 + 패널 열기
- 패널 메뉴 더블클릭 → 선택 날짜에 즉시 배정
- 캘린더 셀 메뉴 태그 더블클릭 → 즉시 삭제
- Panel 토글 버튼 or 우측 chevron → 패널 접기/펼치기
- 패널 하단 "AI 추천" 버튼 → AI 추천 콤보 모달 (날짜 선택 필수)

**AI 추천 콤보 모달 구조 (CalendarTab):**
- 헤더: "AI 추천 콤보" + 오늘 날짜 pill + 닫기
- 3주 이력 dot-grid: 7열 × 3행, 각 날짜에 카테고리 색상 dot 표시. 오늘 강조. hover tooltip으로 식단명 확인.
- 옵션 카드 2열 그리드: 제목·설명·메뉴 태그. 클릭으로 선택.
- 액션바: "날짜 배정" + "콤보 등록". 등록된 옵션은 "등록됨" 뱃지 + 버튼 비활성, 모달 유지.
- 동일 메뉴 구성 콤보 중복 등록 방지 (`hasDuplicateComposition()`)

**Inventory 주요 동작:**
- 메뉴 카드: 비활성 시 "비활성" 오버레이 표시 (이미지 영역)
- 콤보 카드: 비활성 아이템 포함 시 "비활성 포함" 빨간 뱃지 + opacity-60 + 해당 태그 line-through
- 콤보 카드: 구성 메뉴 전체 표시 (slice/+N 없음)
- edit·delete 버튼: 모든 카드 우측 상단에 그룹으로 hover 시 표시
- 사용/비사용 필터: `activeFilter` ("all"/"active"/"inactive") — select 드롭다운
- 기본 밀도: XS (density=1). SM(density=2)까지만. 더 큰 사이즈 제거.

> `PromptsTab.svelte` deleted (functionality merged into SettingsTab).

### Gemini AI Integration

현재 활성 AI 기능은 **재료 자동 추천(보조)** 1건. 다른 식단 추천 기능은 v0.4 작업으로 제거됨.

| 기능 | 진입점 | 서비스 함수 | 프롬프트 ID |
|---|---|---|---|
| 재료 자동 추천 | `ModalMenuRegistry.svelte` | `suggestIngredients()` | `ingredient_suggest` |

- `gemini.ts` — `callGeminiText(prompt, systemInstruction, apiKey)`: 순수 API 호출, 도메인 지식 없음
- `mealService.ts` — `suggestIngredients()`만 active. `askGemini`/`recommendMenus`/`suggestCombos`는 dead code (정리 대기)
- `mealGeneration.ts` — dead code (정리 대기)

**프롬프트 관리:** `server/seed/prompts.ts`에서 코드로 직접 관리. 앱 부팅 시 `upsertPrompts(db)`가 ON CONFLICT UPDATE로 갱신. 현재 활성 ID: `chat_base`, `ingredient_suggest`. 나머지 4개(`auto_gen`, `day_plan_options`, `menu_recommend`, `combo_suggest`)는 dead seed (정리 대기).

`geminiKey`는 localStorage에 저장되며 `$lib/stores`의 writable store로 관리. `.env`에 `PUBLIC_GEMINI_API_KEY`가 없으므로 런타임 키(`$geminiKey`)만 사용.

**Gemini model:** `gemini-2.5-flash-lite`

### Environment Variables

Create `.env` from `.env.example`:

```
PUBLIC_GEMINI_API_KEY=your_key_here
```

### Korean Text Search

`src/lib/utils/hangul.ts` provides Korean phoneme decomposition for fuzzy search within the menu selection panel.

### Design System

The `docs/` directory is the design source of truth: mockup screens (`docs/*/`), `docs/PRD.md`, and `docs/14_design_system/DESIGN.md`. Key rules:

- **No border lines** — use background color (tonal layering) for area separation, never `1px solid` borders
- **Organic shapes** — `rounded-xl` / `rounded-full`, generous padding; avoid sharp corners
- **Glassmorphism** — floating elements (modals, nav) use `backdrop-blur` + semi-transparency
- **Fonts** — headings: `Plus Jakarta Sans`; body/data: `Inter`
- **Color** — Primary: `#006e1c` (dark green), Primary Container: `#4caf50` (light green)

Before implementing any UI change, check the relevant screen mockup in `docs/`.

### Tailwind CSS Setup (v3)

Tailwind CSS v3 is installed as a PostCSS plugin. Config files:
- `tailwind.config.js` — color tokens, font families (`headline`/`body`/`label`), border-radius
- `postcss.config.js` — `tailwindcss` + `autoprefixer`
- `src/app.css` — `@tailwind base/components/utilities` directives + `.glass-panel`, `.signature-gradient` utilities
- `src/app.html` — Google Fonts (Plus Jakarta Sans, Inter) + Material Symbols Outlined icons

Custom color tokens mirror the design system exactly (e.g. `bg-surface`, `bg-surface-container-low`, `text-primary`, etc).

### Build Notes

`npm run build`는 두 단계로 동작:
1. **`build:client`** — `vite build` 후 `build/index.html`의 절대 경로(`/_app`)를 상대 경로(`./_app`)로 patch (Electron `file://` 로딩 호환).
2. **`build:server`** — `tsc -p tsconfig.server.json`으로 TS → CJS 컴파일 (산출물: `dist-server/`). 직후 `dist-server/package.json`을 `{"type":"commonjs"}`로 작성해 루트의 `"type":"module"`과 격리.

Electron `main` 진입점은 `dist-server/main.js`이므로 `npm start` 전 반드시 `build:server`가 완료되어야 한다.

테스트 실행: `npm test` — `node:test` 러너가 `tsx` import hook 기반으로 TS 테스트 직접 실행. 별도 빌드 불필요.