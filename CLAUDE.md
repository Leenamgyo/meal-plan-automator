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
use gemini to compare schema in @main.cjs with client usage in @src/lib/db.ts

# Gemini 프롬프트 개선
use gemini to suggest improvements for prompts in @src/lib/gemini.ts — reference prompts table structure
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

The `src/lib/db.ts` module is the sole HTTP client layer—all CRUD operations go through it. On API failure, it falls back to `localStorage` as an offline cache.

### SQLite Schema (auto-created in `main.cjs`)

| Table | Key columns | Notes |
|---|---|---|
| `categories` | `id`, `name`, `color`, `sort_order` | Menu categories |
| `menu_items` | `id`, `name`, `category_id`, `ingredients` (JSON array) | FK → categories (SET NULL on delete) |
| `meal_data` | `date` (UNIQUE), `menus` (JSON array of menu names) | Upsert on conflict |
| `prompts` | `id` (TEXT PK), `content`, `version`, `is_active` | Gemini prompt templates, seeded at startup |

### Frontend Structure

Single-page app with tab-based navigation in `src/routes/+page.svelte`. The active tab is tracked with a local `activeTab` variable — no router.

| Tab component | Purpose |
|---|---|
| `CalendarTab.svelte` | Monthly calendar view + right panel for daily meal selection + AI chat |
| `MenuTab.svelte` | Full CRUD for menu items (card grid) |
| `StatsTab.svelte` | Category/ingredient statistics dashboard |
| `SettingsTab.svelte` | Gemini API key input, category color management, prompt editing |

The `geminiKey` is stored in `localStorage` and passed as a prop from `+page.svelte` to `CalendarTab` and `SettingsTab`.

### Gemini AI Integration

`src/lib/gemini.ts` exports two functions:
- `convertMealText()` — Parses free-form meal text into structured JSON using the `json_parser` prompt from DB.
- `askGemini()` — General chat using the `chat_base` prompt from DB.

The `auto_gen` prompt in the DB is used by `CalendarTab` for automatic meal generation with frequency-based deduplication. Prompts are editable via the Settings tab and stored in the `prompts` table. Model used: `gemini-2.5-flash-lite`.

### Environment Variables

Create `.env` from `.env.example`:

```
PUBLIC_GEMINI_API_KEY=your_key_here
```

The API key can also be set at runtime via the Settings tab and is persisted in `localStorage` as `geminiKey`. The runtime key takes precedence over the env variable.

### Korean Text Search

`src/lib/hangul.ts` provides Korean phoneme decomposition for fuzzy search within the menu selection panel.

### Build Notes

The `npm run build` script patches `build/index.html` after the SvelteKit build to convert absolute `/_app` paths to relative `./_app` paths, which is required for Electron's file loading to work correctly.