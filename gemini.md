# Gemini API 연동 계획 및 프롬프트

이 문서는 Meal Chart (식단) 텍스트를 정형화된 JSON 데이터로 변환하기 위해 사용될 Gemini API 활용 방안과 시스템 프롬프트를 정의합니다.

## 프로젝트 구조

```
src/
├── routes/
│   ├── +page.svelte          # 메인 페이지 (탭 라우터)
│   └── +layout.ts            # SSR/prerender 설정
├── lib/
│   ├── gemini.ts             # Gemini API 서비스 (모델: gemini-2.5-flash-lite)
│   └── components/
│       ├── ChatTab.svelte    # AI 채팅 (식단 변환기) 탭
│       ├── MenuTab.svelte    # 메뉴 관리 탭 (태그 기반)
│       ├── CalendarTab.svelte # 달력 탭
│       ├── StatsTab.svelte   # 통계 탭
│       └── SettingsTab.svelte # 환경설정 탭
├── app.css                    # 전역 스타일
└── app.html                   # HTML 템플릿
main.cjs                       # Electron 메인 프로세스 (로컬 HTTP 서버 포함)
```

## 탭 구성
| 탭 | 컴포넌트 | 설명 |
|---|---|---|
| 식단 변환기 | `ChatTab.svelte` | Gemini API를 이용한 AI 채팅 |
| 메뉴 관리 | `MenuTab.svelte` | 태그 기반 메뉴 CRUD, 검색/필터 |
| 달력 | `CalendarTab.svelte` | 월별 달력 + 날짜별 식단 슬롯 |
| 통계 | `StatsTab.svelte` | 메뉴/태그 통계 대시보드 |
| 환경설정 | `SettingsTab.svelte` | API 키 관리 |

## 데이터 모델

### MenuItem (localStorage: `menuItems`)
```typescript
interface MenuItem {
  id: string;
  name: string;   // "오징어보쌈"
  tags: string[];  // ["오징어", "주메뉴"]
}
```

## 목표
사용자가 자유 형식으로 작성한 주간/일간 식단표 텍스트를 입력하면, Gemini API를 통해 날짜별, 식사 시간(조식/중식/석식)별 메뉴 배열로 분류된 형태의 JSON 데이터로 출력받는 것을 목표로 합니다.

## 필요 설정
환경설정 탭에서 사용자가 입력한 **Gemini API 키**를 `localStorage`에서 불러내어 `@google/generative-ai` SDK를 통해 호출합니다.

## 시스템 프롬프트 (System Instruction)
Gemini 모델에 주입할 기본 프롬프트는 다음과 같습니다.

```text
당신은 식단 분석 및 데이터 정형화 전문가입니다.
사용자가 제공하는 자유로운 텍스트 형식의 식단표를 분석하여 아래의 구조화된 JSON 데이터 포맷으로만 응답해야 합니다. 
다른 설명이나 마크다운 백틱(```json ... ```) 없이 순수 JSON 배열 객체만 반환하세요.

[JSON 출력 형식 예시]
[
  {
    "date": "2024-03-01",
    "day": "금요일",
    "meals": {
      "breakfast": ["현미밥", "미역국", "계란말이", "김치"],
      "lunch": ["잡곡밥", "제육볶음", "상추쌈", "된장찌개"],
      "dinner": ["닭가슴살 샐러드", "고구마 1개", "아몬드 브리즈"]
    }
  }
]

명시되지 않은 식사 시간(예: 아침이 없는 경우)에는 빈 배열 "[]"을 할당하세요.
```
