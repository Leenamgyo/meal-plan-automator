# Meal Chart (식단표 자동화)

Electron + SvelteKit 기반 식단 관리 앱

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 실행 (빌드 + Electron 실행)
npm start

# 빌드만
npm run build
```

## 환경 변수

`.env.example`을 참고하여 `.env` 파일을 생성하세요:

```bash
cp .env.example .env
```

| 변수 | 설명 |
|---|---|
| `PUBLIC_GEMINI_API_KEY` | Gemini API 키 (AI 채팅) |

## SQLite 연동 배포 구조

이 앱은 Electron의 Main 프로세스를 HTTP 서버로 동작하게 하여, 백엔드 의존성을 없애고 순수 SvelteKit + 로컬 완전 자립 구조를 가집니다. 앱 실행 시 프로그램과 동일한 위치(프로젝트 폴더 내)에 SQLite 파일(`meal-chart.db`)을 만들고 자체 제공하는 `/api/*` 로 통신합니다.

### 1. 컬렉션 (자동 생성)

앱을 실행하면 자동으로 아래의 테이블이 생성됩니다.

| 컬렉션 | 필드 | 비고 |
|---|---|---|
| `categories` | `name`, `color` | 카테고리 정보 |
| `menu_items` | `name`, `category_id`, `ingredients` | 식재료 및 카테고리 관계 |
| `meal_data` | `date`, `menus` | 식단표 날짜 (unique) |

### 2. 더미 데이터 시드

```bash
# 기존 데이터 삭제 후 200개 메뉴 + 6개 카테고리 생성 (로컬 API 통신)
node scripts/seed.js

# 다른 URL 사용 시 (기본값: http://127.0.0.1:3737/api)
node scripts/seed.js http://your-server:3737/api
```

## 데이터 구조

- **categories, menu_items**: SQLite Auto Increment ID로 관리 (CRUD)
- **meal_data**: 날짜별 메뉴명(값) 배열로 저장

## 탭 구성

| 탭 | 설명 |
|---|---|
| 식단표 | 월별 식단 달력 + 우측 식단 선택 / AI 채팅 |
| 메뉴 관리 | 카테고리/재료 기반 메뉴 CRUD (그리드 카드) |
| 통계 | 카테고리/재료별 통계 대시보드 |
| 환경설정 | API 키, 카테고리 색상 관리 |

## 프로젝트 구조

```
src/
├── routes/+page.svelte           # 메인 페이지 (탭 라우터)
├── lib/
│   ├── gemini.ts                 # Gemini API 서비스
│   ├── db.ts                     # 로컬 DB (SQLite REST API) CRUD 서비스
│   ├── hangul.ts                 # 한글 자모 분해 검색
│   └── components/
│       ├── CalendarTab.svelte    # 식단표 + AI 채팅
│       ├── MenuTab.svelte        # 메뉴 관리
│       ├── StatsTab.svelte       # 통계
│       └── SettingsTab.svelte    # 환경설정
├── app.css                        # 전역 스타일
└── app.html                       # HTML 템플릿
scripts/
└── seed.js                        # 로컬 서버 더미 데이터 시드
main.cjs                           # Electron 메인 프로세스 (로컬 Express-style 서버 포함)
```

## 기술 스택

- **Electron** — 데스크탑 앱 (+ built-in HTTP server)
- **better-sqlite3** — 순수 로컬 데이터 저장용 SQLite 드라이버
- **SvelteKit** — UI 프레임워크 (`adapter-static`)
- **Gemini API** — AI 식단 변환 (`gemini-2.5-flash-lite`)
- **localStorage** — 오프라인 환경 fallback 캐시
