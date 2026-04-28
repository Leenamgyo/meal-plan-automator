새 기능/탭/아키텍처 변경 구현 전에 단계별 계획을 수립한다.

기능 설명: $ARGUMENTS

## 진행 순서

1. `git status`로 현재 작업 상태를 확인한다.

2. 관련 코드를 파악한다:
   - 도메인 진입점: `src/lib/components/`, `server/repositories/`, `server/graphql/`
   - 의존 규칙: `docs/conventions/frontend.md`, `docs/conventions/backend.md`
   - 현재 아키텍처: `docs/ARCHITECTURE.md`

3. 다음 항목을 명시적으로 결정해서 사용자에게 제시한다:
   - 어떤 파일이 신규/수정/삭제되는지
   - 프론트는 `src/lib/{types,services,utils,stores,components}/` 중 어디에 들어가는지
   - 백엔드는 `server/{db,seed,repositories,graphql,http}/` 중 어디에 들어가는지
   - GraphQL 스키마 변경(Query/Mutation/Type) 여부
   - SQLite 스키마 변경(`server/db/schema.ts` SCHEMA_DDL) 여부
   - import 규칙 영향
   - 엣지케이스 / Electron-SvelteKit 특이사항

4. 사용자 승인을 받은 후에만 구현을 시작한다.
