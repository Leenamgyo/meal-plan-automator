동일 오류가 2회 이상 반복될 때 Gemini에 디버깅을 위임한다.

에러 내용: $ARGUMENTS

1. 에러와 관련된 파일을 파악한다 (스택 트레이스, 컴포넌트명, 서비스명 기준).
2. Gemini에 관련 파일과 에러를 함께 넘긴다:

```
use gemini to debug this error in @[관련파일들]:

$ARGUMENTS

Context:
- Electron + SvelteKit (adapter-static) 환경
- 프론트엔드는 fetch()로 http://127.0.0.1:3737/api/* 호출
- SQLite는 main.cjs의 better-sqlite3로 동기 처리
- 컴포넌트는 직접 localStorage에 접근하지 않고 services/ 레이어 사용
```

3. Gemini의 분석 결과와 수정 방법을 사용자에게 보여준다.
4. 제안된 수정을 적용하고 `npm run build`로 검증한다.
5. 같은 오류가 또 발생하면 다시 이 스킬을 사용한다 — 추측으로 반복 시도하지 않는다.
