작업 완료 전 변경된 파일을 Gemini로 최종 점검한다.

1. 변경된 파일 목록을 확인한다:

```bash
git diff --name-only HEAD
git status --short
```

2. 변경된 파일들을 Gemini에 넘겨 리뷰를 요청한다:

```
use gemini to review @[변경된 파일들] — check for:
- 버그 및 엣지케이스
- Svelte 반응성 문제 ($: reactive declarations, store 사용)
- Electron/SvelteKit 환경 특이사항
- import 규칙 위반 (타입은 $lib/types/, CRUD는 $lib/services/{entity}, AI는 $lib/services/mealService)
- localStorage를 컴포넌트에서 직접 읽는 안티패턴
- error: any 타입 사용
```

3. Gemini의 피드백을 사용자에게 보여주고, 수정이 필요한 항목은 바로 처리한다.
4. 수정 후 `npm run build`로 빌드를 확인한다.
