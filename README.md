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

## 탭 구성

| 탭 | 설명 |
|---|---|
| 식단표 | 월별 식단 달력 (기본 화면) |
| 식단 변환기 | Gemini AI 채팅으로 식단 텍스트 → JSON 변환 |
| 메뉴 관리 | 태그 기반 메뉴 등록/검색/필터 |
| 통계 | 메뉴/태그 통계 대시보드 |
| 환경설정 | API 키, 삭제 확인 등 설정 |

## 프로젝트 구조

```
src/
├── routes/+page.svelte           # 메인 페이지 (탭 라우터)
├── lib/
│   ├── gemini.ts                 # Gemini API 서비스
│   ├── hangul.ts                 # 한글 자모 분해 검색
│   └── components/
│       ├── CalendarTab.svelte    # 식단표
│       ├── ChatTab.svelte        # AI 채팅
│       ├── MenuTab.svelte        # 메뉴 관리
│       ├── StatsTab.svelte       # 통계
│       └── SettingsTab.svelte    # 환경설정
├── app.css                        # 전역 스타일
└── app.html                       # HTML 템플릿
main.cjs                           # Electron 메인 프로세스
```

## 기술 스택

- **Electron** — 데스크탑 앱
- **SvelteKit** — UI 프레임워크 (`adapter-static`)
- **Gemini API** — AI 식단 변환 (`gemini-2.5-flash-lite`)
- **localStorage** — 로컬 데이터 저장
