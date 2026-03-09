# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Development: build + run Electron app
npm start

# Build SvelteKit static output only (+ fixes asset paths for Electron)
npm run build

# Seed dummy data (requires app running on port 3737)
node scripts/seed.js

# Package as distributable
npm run dist
```

There are no lint or test commands configured in this project.

## CLAUDE.md 업데이트 규칙

다음에 해당하는 변경이 생기면 **즉시 이 파일을 업데이트**한다:

- 디렉토리 구조 또는 파일 위치 변경 (이동, 신규, 삭제)
- 새 서비스 / 유틸 / 스토어 추가
- import 규칙 변경 (어떤 모듈에서 무엇을 가져와야 하는지)
- 아키텍처 레이어 책임 변경 (예: 도메인 로직이 다른 파일로 이동)
- 탭 컴포넌트 추가 / 제거
- 환경변수 또는 빌드 프로세스 변경

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

---

## AI Collaboration Workflow

이 프로젝트는 **Claude Code**와 **Gemini MCP**를 함께 사용한다.  
각자의 강점이 다르므로, 작업 성격에 따라 아래 기준으로 역할을 나눈다.

---

### 역할 분담 기준

| 작업 유형 | 담당 | 이유 |
|---|---|---|
| 코드 작성 / 수정 / 리팩토링 | **Claude Code** | 파일 편집, 실행, 검증까지 직접 처리 |
| 단계별 구현 계획 수립 | **Claude Code** | 작은 단위 기능은 직접 계획하고 실행 |
| 대규모 아키텍처 설계 | **Gemini** | 전체 구조를 넓은 컨텍스트로 한 번에 파악 |
| `main.cjs` 전체 분석 | **Gemini** | 단일 파일이지만 크기가 커서 전체 로딩 유리 |
| Electron IPC / 프로세스 간 버그 | **Gemini** | main ↔ renderer 흐름을 한번에 추적 |
| Svelte 컴포넌트 간 상태 버그 | **Gemini** | 여러 파일의 반응성 흐름을 동시에 분석 |
| SQLite 스키마 ↔ 클라이언트 불일치 | **Gemini** | `main.cjs` + `db.ts` 동시 비교 |
| 2회 이상 반복되는 디버깅 | **Gemini** | 동일 오류 반복 시 Claude가 아닌 Gemini에 위임 |
| 코드 리뷰 / 엣지케이스 점검 | **Gemini** | 변경 파일 전체를 한 번에 넘겨서 검토 |
| Gemini 프롬프트 튜닝 | **Gemini** | `prompts` 테이블 + `gemini.ts`를 같이 분석 |

---

### Claude Code가 직접 처리하는 것

- 파일 생성 / 수정 / 삭제
- npm 스크립트 실행 및 빌드 확인
- 명확한 요구사항의 기능 구현 (Svelte 컴포넌트, API 엔드포인트, DB 쿼리 등)
- 에러 로그 해석 및 1~2회 이내의 단순 디버깅
- CHANGELOG / package.json 버전 관리

---

### Gemini에 넘기는 시점과 방법

#### 📋 Plan First — 새 기능 구현 전

새 탭, 새 기능, 아키텍처 변경 전에 계획을 먼저 받는다.  
계획 확인 후 사용자 승인 받고 구현 시작.

```
use gemini to analyze @src/ @main.cjs and create an implementation plan for: [기능 설명]
```

#### 🐛 Debug — 동일 오류 2회 이상 반복 시

같은 에러가 두 번 이상 반복되면 즉시 Gemini에 위임. 추측으로 계속 시도하지 않는다.

```
use gemini to debug this error in @[관련파일]:
[에러메시지 전체]
```

#### 👀 Review — 작업 완료 전 최종 점검

태스크를 완료로 표시하기 전에 변경된 파일을 Gemini로 리뷰한다.

```
use gemini to review @[변경된파일들] — check for bugs, edge cases, and Electron/SvelteKit-specific issues
```

---

### Project-specific Gemini 프롬프트 패턴

```
# Electron IPC 이슈
use gemini to analyze @main.cjs — focus on IPC handlers and renderer communication

# Svelte 반응성 버그
use gemini to trace state flow in @src/routes/ @src/lib/ — find reactivity issues

# SQLite 스키마 불일치
use gemini to compare schema in @main.cjs with client usage in @src/lib/services/

# Gemini 프롬프트 개선
use gemini to suggest improvements for prompts in @src/lib/services/mealService.ts — reference prompts table structure
```

---

## Architecture

This is an **Electron desktop app** wrapping a **SvelteKit static site**, with all backend logic embedded in the Electron main process.

### Process Separation

- **`main.cjs`** — Electron main process (CommonJS). Runs two things at startup:
  1. An embedded HTTP server on `http://127.0.0.1:3737` that serves both the `/api/*` REST endpoints and the SvelteKit static build from `./build/`.
  2. A `BrowserWindow` that loads `http://127.0.0.1:3737/`.
- **`preload.js`** — Minimal Electron preload script.
- **`src/`** — SvelteKit frontend compiled to static output via `adapter-static`. Communicates with the backend only through HTTP calls to the local server.

### Data Flow

```
SvelteKit UI (browser context)
  ↕ fetch() to http://127.0.0.1:3737/api/*
Embedded HTTP server (main.cjs)
  ↕ better-sqlite3 (synchronous)
meal-chart.db (SQLite, in project root)
```

### Frontend Source Structure

```
src/lib/
├── types/
│   ├── index.ts          # 모든 타입 re-export 진입점
│   ├── models.ts         # DB 스키마 모델 (Category, MenuItem, MealRecord, MealEntry, Prompt)
│   └── ui.ts             # UI 전용 타입 (Message, CalendarDay)
├── services/
│   ├── db.ts             # 순수 HTTP 클라이언트 (apiGet, apiPost, apiPut, apiDelete)
│   ├── categories.ts     # Category CRUD + localStorage 폴백
│   ├── menuItems.ts      # MenuItem CRUD + localStorage 폴백
│   ├── mealData.ts       # MealData CRUD + localStorage 폴백
│   ├── prompts.ts        # Prompt CRUD + localStorage 폴백
│   ├── gemini.ts         # 순수 Gemini API 클라이언트 (callGeminiText)
│   ├── mealService.ts    # 식단 도메인 AI 함수 (askGemini, convertMealText)
│   └── mealGeneration.ts # AI 추천 순수 함수 (점수 계산, 프롬프트 빌드)
├── utils/
│   ├── hangul.ts         # 한글 초성 검색 (hangulIncludes)
│   ├── calendarUtils.ts  # 달력 날짜 계산 (buildCalendarDays, dateKey, isToday)
│   └── arrayUtils.ts     # 배열 순서 변경 (moveItemUp, moveItemDown, swapItems)
├── stores/
│   └── index.ts          # geminiKey writable store
└── components/
    ├── CalendarTab.svelte
    ├── MenuTab.svelte
    ├── StatsTab.svelte
    ├── SettingsTab.svelte
    └── PromptsTab.svelte
```

**Import 규칙:**
- 타입 → `$lib/types/models` 또는 `$lib/types/ui` (또는 배럴 `$lib/types`)
- HTTP 인프라 → `$lib/services/db`
- 엔티티 CRUD → `$lib/services/{categories|menuItems|mealData|prompts}`
- AI → `$lib/services/gemini` (순수 API) 또는 `$lib/services/mealService` (도메인)
- 상태 → `$lib/stores` (`geminiKey` store, prop drilling 없음)

### SQLite Schema (auto-created in `main.cjs`)

| Table | Key columns | Notes |
|---|---|---|
| `categories` | `id`, `name`, `color`, `sort_order` | Menu categories |
| `menu_items` | `id`, `name`, `category_id`, `ingredients` (JSON array) | FK → categories (SET NULL on delete) |
| `meal_data` | `date` (UNIQUE), `menus` (JSON array of MealEntry objects) | Upsert on conflict. MealEntry = `{ name, category_id, color }`. Old string[] data is normalized on fetch. |
| `prompts` | `id` (TEXT PK), `content`, `version`, `is_active` | Gemini prompt templates, seeded at startup |

### Tab Components

Single-page app with tab-based navigation in `src/routes/+page.svelte`. The active tab is tracked with a local `activeTab` variable — no router.

| Tab component | Purpose |
|---|---|
| `CalendarTab.svelte` | Monthly calendar view + right panel for daily meal selection + AI chat |
| `MenuTab.svelte` | Full CRUD for menu items (card grid) |
| `StatsTab.svelte` | Category/ingredient statistics dashboard |
| `SettingsTab.svelte` | API key, category management, general settings |
| `PromptsTab.svelte` | Prompt CRUD (system prompts: json_parser, chat_base, auto_gen) |

### Gemini AI Integration

- `gemini.ts` — `callGeminiText(prompt, systemInstruction, apiKey)`: 순수 API 호출, 도메인 지식 없음
- `mealService.ts` — `askGemini()`, `convertMealText()`: DB 프롬프트 조회 + 메뉴 제약 주입
- `mealGeneration.ts` — 날짜 창 계산, 점수 산출, 프롬프트 문자열 생성, 응답 파싱

`geminiKey`는 localStorage에 저장되며 `$lib/stores`의 writable store로 관리. 환경변수 `PUBLIC_GEMINI_API_KEY`보다 런타임 키가 우선.

### Environment Variables

Create `.env` from `.env.example`:

```
PUBLIC_GEMINI_API_KEY=your_key_here
```

### Korean Text Search

`src/lib/utils/hangul.ts` provides Korean phoneme decomposition for fuzzy search within the menu selection panel.

### Build Notes

The `npm run build` script patches `build/index.html` after the SvelteKit build to convert absolute `/_app` paths to relative `./_app` paths, which is required for Electron's file loading to work correctly.