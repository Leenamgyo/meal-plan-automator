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

## AI Collaboration Workflow

Gemini MCP is connected. Use it at the right moments — not for everything, but for the cases below.

### 📋 Plan First (before implementing)

When adding a new feature, new tab, or changing architecture, ask Gemini to plan before writing code:

```
use gemini to analyze @src/ @main.cjs and create an implementation plan for: [기능 설명]
```

Wait for the plan. Confirm with the user before proceeding.

### 🐛 Debug with Gemini (after 2+ failed attempts)

If the same error repeats more than twice, delegate to Gemini instead of guessing:

```
use gemini to debug this error in @[관련파일]:
[에러메시지 전체]
```

Apply Gemini's suggestion, then verify.

### 👀 Review before finishing

Before marking a task done, ask Gemini to review the changed files:

```
use gemini to review @[변경된파일들] — check for bugs, edge cases, and Electron/SvelteKit-specific issues
```

---

### Project-specific Gemini tips

- **Electron IPC / main process 이슈** → Gemini의 넓은 컨텍스트 윈도우로 `main.cjs` 전체를 한번에 분석 가능
- **Svelte 반응성 버그** → `@src/routes/ @src/lib/` 같이 넘기면 컴포넌트 간 상태 흐름 추적에 유리
- **SQLite 스키마 변경** → `main.cjs`의 스키마 정의와 `db.ts` 클라이언트를 같이 넘겨서 불일치 확인
- **Gemini 프롬프트 튜닝** → `prompts` 테이블 내용과 `gemini.ts`를 같이 넘기면 프롬프트 개선 제안 받을 수 있음

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