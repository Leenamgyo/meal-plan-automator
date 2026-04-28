# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.3.0] - 2026-04-28

> **백엔드 전면 재구조화** — `main.cjs` 단일 파일을 `server/` 레이어 + GraphQL + TypeScript로 분해. UI/기능 표면은 변하지 않음. 자세한 배경은 [`docs/ARCHITECTURE/BACKEND_SEPARATION_PLAN.md`](./docs/ARCHITECTURE/BACKEND_SEPARATION_PLAN.md).

### Added
- **`server/` TypeScript 백엔드 레이어** — 분리된 책임:
  - `server/db/` — connection / schema (DDL 상수) / migrations
  - `server/seed/` — 6종 프롬프트 시드 + UPSERT
  - `server/repositories/` — 5개 Repository (Category/MenuItem/MealData/Prompt/Combo) + `getRepos()` 팩토리(db identity 캐싱)
  - `server/graphql/` — SDL 스키마 + 단일 resolvers + graphql-http 핸들러 + GraphQLContext
  - `server/http/static.ts` — SPA fallback 정적 파일 서버
  - `server/index.ts` — `startServer()` 부트스트랩
  - `server/types.ts` — 도메인 타입 + DTO
- **GraphQL 단일 엔드포인트** (`POST /graphql`) — 10 Query + 14 Mutation. REST `/api/*` 대체. `graphql` + `graphql-http` + `@graphql-tools/schema` 도입.
- **프론트 GraphQL 클라이언트** — `src/lib/services/graphql.ts` 자체 미니 클라이언트(~30줄). `gql<T>(query, variables)` API.
- **Repository 패턴** — prepared statement 생성자 캐싱, `Database.Database` 직접 주입(테스트용). resolver는 `repos.<entity>.<method>()`만 호출.
- **`scripts/seed.ts`** — GraphQL mutation 기반 시드 스크립트 (`npm run seed`). 기존 `scripts/seed.js` 대체.
- **서버 단위 테스트** — `node:test` + `tsx`로 11개 `*.test.ts` 파일 (~1000줄). repository / resolver / schema / 정적 서버 / migrations 커버. `npm test`, `npm run test:watch`.
- **`server/__tests__/testDb.ts`** — in-memory SQLite 헬퍼 (`createTestDb()`).
- **TypeScript 빌드 파이프라인** — `tsconfig.server.json` (CJS 출력), `dist-server/` 산출, `dist-server/package.json` 매니페스트로 ESM/CJS 격리. `@types/node`, `@types/better-sqlite3`, `tsx` devDep 추가.
- **NPM 스크립트**: `build:server`, `seed`, `test`, `test:watch`. `build`는 client + server 양쪽 빌드.

### Changed
- **Electron 진입점**: `main.cjs` → `dist-server/main.js` (TypeScript 컴파일 산출물).
- **`main.ts` 대폭 슬림화**: 593줄 → **54줄**. Electron 라이프사이클(DB init/close + startServer + BrowserWindow)만 담당. HTTP·DB·GraphQL 로직은 모두 `server/`로 이동.
- **프론트 services**: REST `apiGet/apiPost/apiPut/apiDelete` → GraphQL `gql<T>()`. 외부 시그니처(함수명/인자/반환 타입) 무변경 — 컴포넌트 호출부 수정 불필요.
- **`features/<x>/api.ts`** — `services/*` re-export로 단일 소스화 (Task #6 후 services/ → features/ 이동 예정).
- **에러 표현 표준화**: REST 404/409 → GraphQL `GraphQLError({ extensions: { code: 'NOT_FOUND'/'CONFLICT' } })`.
- **`getDb()` 자동 복구**: macOS activate 시 DB 닫혀있으면 `initDatabase()` 자동 호출 (Repository는 `getRepos()`로 새 인스턴스 받음).

### Removed
- **REST 엔드포인트** — `/api/categories`, `/api/menu-items`, `/api/meal-data`, `/api/prompts`, `/api/combos` 모두 제거 (CRUD 4메서드 × 5리소스).
- **dead code 파일** — `main.cjs`, `server/http/helpers.cjs`(REST 전용 parseBody/sendJSON/CORS), `src/lib/services/db.ts`, `src/lib/shared/api/client.ts` 삭제. 기존 `.cjs` 8개 모두 제거 (TS 전환).
- **`scripts/seed.js`** — `scripts/seed.ts`로 대체.

---

## [0.2.0] - 2026-03-01

### Added
- **프롬프트 탭**: 프롬프트 목록/생성/편집/삭제 기능 (시스템 프롬프트 보호)
- **통계 탭 전면 개편**: 6가지 통계 섹션 추가
  - 자주 먹은 메뉴 TOP 10 (식단 데이터 기반, 카테고리 색상 바 차트)
  - 카테고리별 식단 제공 횟수 (가로 바 차트)
  - 요일별 평균 식사 수 (세로 바 차트, 일/토 색상 구분)
  - 월별 식사 횟수 최근 6개월 (세로 바 차트)
  - 카테고리별 등록 메뉴 수 (가로 바 차트)
  - 재료 사용 빈도 TOP 10
- **달력 셀 메뉴 카운트 배지**: 식단이 등록된 날 셀에 건수 표시
- **AI 자동추천 개선**: ±30일 날짜 창 + 메뉴별 점수 가중치 시스템 (반복 억제)
- **AI 자동추천 점심 명시**: 프롬프트에 점심 식단 1개 생성 조건 추가

### Changed
- **환경설정 탭 리디자인**: 플랫 폼 → 좌측 사이드바 + 우측 콘텐츠 패널 구조
- **달력 우측 패널 정리**: inline style 제거, CSS 클래스 기반으로 전환
- **통계 탭 데이터 소스**: localStorage 직접 읽기 → `db.ts` API 호출로 전환
- **중복 타입 제거**: 각 컴포넌트 내 로컬 인터페이스 → `db.ts` export 타입 import

### Fixed
- **AI 추천 날짜 경쟁 조건**: 비동기 중 날짜 변경 시 엉뚱한 날짜에 저장되던 버그 수정
- **전체 삭제 버튼 미동작**: `on:click={fn}` 이벤트 객체 전달로 인한 버그 → `() => fn()` 래핑
- **전체 삭제 DB 저장 오류**: `selectedDate` 기준 저장 → `targetDate` 직접 전달로 정확한 날짜 저장
- **AI 프롬프트 누락**: `onMount`에서 `fetchPrompts()` 누락 → `Promise.all`에 추가
- **`{frequencyData}` 플레이스홀더 미치환 버그** 수정
- **채팅 DOM 직접 조작 제거**: `document.querySelector` → `bind:this` Svelte 방식 적용

---

## [0.1.0] - 2026-02-01

### Added
- **AI 식단 자동 생성**: Gemini API 연동, 최근 기록 기반 메뉴 추천
- **드래그 앤 드롭 재정렬**: 등록된 식단 순서 변경 가능
- **카테고리 관리 DB 전환**: localStorage → SQLite categories 테이블
- **단일 카테고리 필터**: 달력/패널 카테고리 필터를 단일 선택 방식으로 변경
- **DB 파일 위치 변경**: 프로젝트 루트 `meal-chart.db`로 통합

### Changed
- Gemini API 키 환경 변수화 (`.env` / localStorage 런타임 입력 병행)
- AI 채팅 패널을 달력 우측에 통합

---

## [0.0.1] - 2026-01-01

### Added
- SvelteKit + Electron 초기 설정
- SQLite (better-sqlite3) 데이터베이스 연동
- 식단표 달력 탭 (월별 달력, 식단 등록)
- 메뉴 관리 탭 (CRUD)
- 통계 탭 (기본)
- 환경설정 탭 (Gemini API 키, 카테고리 색상)
- Supabase 제거, 로컬 SQLite로 전환
