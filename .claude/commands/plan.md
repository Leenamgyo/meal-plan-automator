새 기능 구현 전 Gemini로 아키텍처 계획을 수립한다.

기능 설명: $ARGUMENTS

다음 순서로 진행한다:

1. `git status`로 현재 작업 상태를 먼저 확인한다.
2. Gemini에 전체 소스와 기능 설명을 넘겨 구현 계획을 요청한다:

```
use gemini to analyze @src/ @main.cjs and create a step-by-step implementation plan for: $ARGUMENTS

Focus on:
- Which files need to be created or modified
- Where in the src/lib/ layer structure (types/models, types/ui, services/, utils/, stores/, components/) each piece belongs
- Import rules to follow ($lib/types, $lib/services, $lib/stores)
- Any SQLite schema changes needed in main.cjs
- Potential edge cases or Electron/SvelteKit-specific concerns
```

3. Gemini의 계획을 사용자에게 명확하게 정리해서 보여준다.
4. 사용자 승인을 받은 후에만 구현을 시작한다.
