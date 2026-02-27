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

## PocketBase 연동

### 1. PocketBase 설치 및 실행

```bash
# macOS
brew install pocketbase

# 실행
pocketbase serve
# → http://127.0.0.1:8090
```

### 2. 컬렉션 생성

PocketBase Admin UI(`http://127.0.0.1:8090/_/`)에서 아래 컬렉션을 생성하세요:

| 컬렉션 | 필드 | 타입 | 비고 |
|---|---|---|---|
| `categories` | `name` | text | 카테고리명 |
| | `color` | text | HEX 색상 (`#ff6b6b`) |
| `menu_items` | `name` | text | 메뉴명 |
| | `category` | text | 카테고리 ID (PB auto ID) |
| | `ingredients` | json | 재료 배열 (`["돼지고기", "양배추"]`) |
| `meal_data` | `date` | text | 날짜 (`YYYY-MM-DD`, unique) |
| | `menus` | json | 메뉴명 배열 (`["된장찌개", "쌀밥"]`) |

### 3. 더미 데이터 시드

```bash
# 기존 데이터 삭제 후 200개 메뉴 + 6개 카테고리 생성
node scripts/seed-pocketbase.js

# 다른 URL 사용 시
node scripts/seed-pocketbase.js http://your-server:8090
```

### 4. 앱에서 연결

환경설정 탭 → **PocketBase URL** 입력 → 저장

> PocketBase 서버가 꺼져 있으면 자동으로 localStorage fallback 사용

## 데이터 구조

- **categories, menu_items**: PocketBase auto ID로 관리 (CRUD)
- **meal_data**: 날짜별 메뉴명(값) 배열로 저장

## 탭 구성

| 탭 | 설명 |
|---|---|
| 식단표 | 월별 식단 달력 + 우측 식단 선택 / AI 채팅 |
| 메뉴 관리 | 카테고리/재료 기반 메뉴 CRUD (그리드 카드) |
| 통계 | 카테고리/재료별 통계 대시보드 |
| 환경설정 | API 키, PocketBase URL, 카테고리 색상 관리 |

## 프로젝트 구조

```
src/
├── routes/+page.svelte           # 메인 페이지 (탭 라우터)
├── lib/
│   ├── gemini.ts                 # Gemini API 서비스
│   ├── pocketbase.ts             # PocketBase CRUD 서비스
│   ├── hangul.ts                 # 한글 자모 분해 검색
│   ├── dummyData.ts              # 더미 데이터 생성
│   └── components/
│       ├── CalendarTab.svelte    # 식단표 + AI 채팅
│       ├── MenuTab.svelte        # 메뉴 관리
│       ├── StatsTab.svelte       # 통계
│       └── SettingsTab.svelte    # 환경설정
├── app.css                        # 전역 스타일
└── app.html                       # HTML 템플릿
scripts/
└── seed-pocketbase.js             # PB 더미 데이터 시드
main.cjs                           # Electron 메인 프로세스
```

## 기술 스택

- **Electron** — 데스크탑 앱
- **SvelteKit** — UI 프레임워크 (`adapter-static`)
- **PocketBase** — 데이터 저장 (SQLite 기반, auto ID)
- **Gemini API** — AI 식단 변환 (`gemini-2.5-flash-lite`)
- **localStorage** — PocketBase fallback 캐시
