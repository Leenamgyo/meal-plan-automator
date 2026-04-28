작업 완료 전 변경된 파일을 최종 점검한다.

## 진행 순서

1. 변경된 파일 목록을 확인한다:

```bash
git diff --name-only HEAD
git status --short
```

2. 각 파일을 읽고 다음 항목을 점검한다:

### 공통
- 버그 / 엣지케이스 (null, 빈 배열, 비동기 race)
- 새로 추가된 파일이 `docs/conventions/` 규칙을 따르는지
- `error: any` 사용 여부
- `console.log` 잔존 (dev gate 없는 것)

### 프론트 (`src/`)
- import 규칙: 타입 → `$lib/types/`, CRUD → `$lib/services/{entity}`, 상태 → `$lib/stores`
- 컴포넌트에서 `gql()` / `localStorage.getItem` 직접 호출 금지
- Svelte 반응성 (`$:`, store 구독, `$state`)

### 백엔드 (`server/`)
- 단방향 의존: `main → server/index → graphql → repositories → db`
- resolver가 `db.prepare()` 직접 호출 금지
- repository가 GraphQL 타입 import 금지
- 신규 SQL은 Repository 안에 작성

3. 발견 사항을 사용자에게 보여주고, 수정 필요한 항목은 바로 처리한다.

4. 빌드 검증:
   - `npm run build:server` (TypeScript 컴파일)
   - `npm test` (서버 단위 테스트)
   - `npx svelte-check` (프론트 타입 체크)
