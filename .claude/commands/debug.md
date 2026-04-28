동일 오류가 2회 이상 반복될 때 디버깅 전략을 체계적으로 적용한다.

에러 내용: $ARGUMENTS

## 진행 순서

1. 에러와 관련된 파일을 파악한다 (스택 트레이스, 컴포넌트명, 서비스명 기준).

2. 다음 컨텍스트를 염두에 두고 분석한다:
   - Electron + SvelteKit (adapter-static) 환경
   - 백엔드: `server/` TypeScript 레이어 (CJS 컴파일 → `dist-server/`)
   - 프론트 → 백엔드: `POST /graphql` (`src/lib/services/graphql.ts`의 `gql<T>()`)
   - SQLite는 `server/db/connection.ts`의 better-sqlite3 (동기, prepared statements)
   - 컴포넌트는 localStorage 직접 접근 금지, `services/` 또는 `stores/` 경유
   - dev 모드 로그: `[GQL →]`, `[GQL ←]`, `[SQL]` (NODE_ENV=development)

3. 가설 → 검증 → 수정 사이클을 명시적으로 적은 뒤 사용자에게 제시한다.
   - 가설을 세웠으면 어떤 로그/명령으로 검증할지 명시
   - 추측만으로 코드를 고치지 않는다

4. 수정 후 재현 시나리오로 직접 검증하고 사용자에게 보고한다.

5. 빌드 검증: `npm run build:server` (백엔드) / `npx svelte-check` (프론트).
