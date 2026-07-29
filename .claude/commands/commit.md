현재 작업 트리의 변경사항을 분석해서 적절한 커밋 메시지로 커밋한다.
`/pr`과 달리 feature 브랜치나 이슈 번호를 요구하지 않고, 어떤 브랜치에서든 지금 상태를 그대로 커밋만 한다.

푸시 여부 (예: `push`, 없으면 커밋만): $ARGUMENTS

## 진행 순서

1. `git status`와 `git diff` (staged + unstaged 모두)로 변경사항을 파악한다.
   - 변경사항이 전혀 없으면 중단하고 사용자에게 알린다.

2. 변경 파일 목록에 `.env`, `*.key`, `credentials*` 등 민감 정보로 보이는 파일이 있는지 확인한다.
   - 있으면 스테이징하지 말고 사용자에게 경고한다.

3. `CLAUDE.md`의 "CLAUDE.md 업데이트 규칙" 체크리스트와 대조해서, 이번 변경이 디렉토리 구조/서비스 추가/GraphQL 스키마/탭 컴포넌트 등에 해당하는지 확인한다.
   - 해당하는데 `CLAUDE.md`가 아직 안 고쳐졌으면, 커밋 전에 먼저 `CLAUDE.md`를 갱신한다.

4. 변경사항을 분석해서 저장소 커밋 스타일(`git log --oneline -10`으로 확인)에 맞는 커밋 메시지를 작성한다:
   - `type: 한국어 요약` 형식 (`feat`/`fix`/`refactor`/`chore`/`docs`/`style` 등)
   - "무엇을" 보다 "왜"에 집중해서 1문장으로 간결하게

5. 관련 파일만 골라 스테이징한다 (`git add -A` 금지, 민감 파일 제외).

6. 커밋을 생성한다 (`Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` 포함, heredoc으로 메시지 전달).

7. `$ARGUMENTS`에 `push`가 포함된 경우에만 푸시한다:
   - 현재 브랜치에 upstream이 있으면 `git push`
   - 없으면 `git push -u origin [현재 브랜치명]`
   - 포함되지 않았으면 푸시하지 않고 커밋만으로 종료한다.

8. `git status`와 커밋 해시/메시지를 사용자에게 보여준다.
