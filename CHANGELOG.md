# Changelog

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

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
