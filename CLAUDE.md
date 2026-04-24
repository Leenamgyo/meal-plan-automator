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

# Build SvelteKit static output only (+ fixes asset paths for Electron)
npm run build

# Seed dummy data (requires app running on port 3737)
node scripts/seed.js

# Package as distributable
npm run dist

# Clear Electron localStorage (run while app is closed)
node clear-storage.js
```

There are no lint or test commands configured in this project.

## CLAUDE.md 업데이트 규칙

**모든 기능 구현 완료 후**, 아래 체크리스트를 확인하고 해당하는 항목이 있으면 **즉시 이 파일을 업데이트**한다:

- [ ] 디렉토리 구조 또는 파일 위치 변경 (이동, 신규, 삭제)
- [ ] 새 서비스 / 유틸 / 스토어 추가
- [ ] import 규칙 변경 (어떤 모듈에서 무엇을 가져와야 하는지)
- [ ] 아키텍처 레이어 책임 변경 (예: 도메인 로직이 다른 파일로 이동)
- [ ] 탭 컴포넌트 추가 / 제거
- [ ] 환경변수 또는 빌드 프로세스 변경
- [ ] `Frontend Source Structure` 섹션의 파일 목록이 실제와 일치하는지 확인
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
│   ├── combos.ts         # Combo CRUD (fetchCombos, createCombo, updateCombo, deleteCombo)
│   ├── gemini.ts         # 순수 Gemini API 클라이언트 (callGeminiText)
│   ├── mealService.ts    # 식단 도메인 AI 함수 (askGemini, recommendMenus, suggestCombos, suggestIngredients)
│   └── mealGeneration.ts # AI 추천 순수 함수 (점수 계산, 프롬프트 빌드)
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
- HTTP 인프라 → `$lib/services/db`
- 엔티티 CRUD → `$lib/services/{categories|menuItems|mealData|prompts|combos}`
- AI → `$lib/services/gemini` (순수 API) 또는 `$lib/services/mealService` (도메인)
- 상태 → `$lib/stores` (`geminiKey`, `toastMessage`, `confirmDialog` store + `showSuccess()`, `showConfirm()` helpers)
- **`PUBLIC_GEMINI_API_KEY` env var는 .env에 없으므로 `$env/static/public`에서 import 금지 — `$geminiKey` store만 사용**

### SQLite Schema (auto-created in `main.cjs`)

| Table | Key columns | Notes |
|---|---|---|
| `categories` | `id`, `name`, `color`, `sort_order` | Menu categories |
| `menu_items` | `id`, `name`, `category_id`, `ingredients` (JSON array) | FK → categories (SET NULL on delete) |
| `meal_data` | `date` (UNIQUE), `menus` (JSON array of MealEntry objects) | Upsert on conflict. MealEntry = `{ name, category_id, color }`. Old string[] data is normalized on fetch. |
| `prompts` | `id` (TEXT PK), `content`, `version`, `is_active` | AI 프롬프트 (코드에서 항상 갱신). IDs: `chat_base`, `ingredient_suggest`, `auto_gen`, `menu_recommend`, `combo_suggest` |
| `combos` | `id`, `name`, `description`, `is_active` | 콤보 메뉴 |
| `combo_items` | `combo_id`, `menu_item_id` (PK 복합) | 콤보↔단품 매핑, CASCADE DELETE |

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

3가지 AI 기능 + 보조 기능으로 구성:

| 기능 | 진입점 | 서비스 함수 | 프롬프트 ID |
|---|---|---|---|
| **AI 추천 콤보** (N가지 콤보 후보) | CalendarTab → AI 추천 버튼 | `askGemini()` | `auto_gen` |
| **메뉴 추천** (단품 추천) | MenuTab → AI 메뉴 추천 버튼 (예정) | `recommendMenus()` | `menu_recommend` |
| **콤보 추천** (콤보 구성) | MenuTab → AI 콤보 추천 버튼 (예정) | `suggestCombos()` | `combo_suggest` |
| 재료 자동 추천 (보조) | ModalMenuRegistry | `suggestIngredients()` | `ingredient_suggest` |

- `gemini.ts` — `callGeminiText(prompt, systemInstruction, apiKey)`: 순수 API 호출, 도메인 지식 없음
- `mealService.ts` — AI 기능별 서비스 함수 (위 표 참조)
- `mealGeneration.ts` — 날짜 창 계산, 점수 산출, 프롬프트 문자열 생성, 응답 파싱

**`auto_gen` 프롬프트 플레이스홀더:** `{count}` (설정값), `{availableMenusText}`, `{existingCombosText}`, `{recentMealsText}`. 출력 형식: `[콤보N]` 블록 (제목/설명/메뉴 라인). `aiRecommendCount` localStorage key (default 5, range 3–12).

**프롬프트 관리:** `main.cjs` 시드에서 코드로 직접 관리 (항상 최신 버전으로 갱신). 사용자 편집 UI 없음.

`geminiKey`는 localStorage에 저장되며 `$lib/stores`의 writable store로 관리. `.env`에 `PUBLIC_GEMINI_API_KEY`가 없으므로 런타임 키(`$geminiKey`)만 사용.

**Gemini model:** `gemini-2.5-flash-lite` (빠르고 가벼운 모델 사용)

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

The `npm run build` script patches `build/index.html` after the SvelteKit build to convert absolute `/_app` paths to relative `./_app` paths, which is required for Electron's file loading to work correctly.