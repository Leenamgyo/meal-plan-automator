현재 feature 브랜치의 변경사항을 커밋하고 GitHub PR을 생성한다.
PR 생성 시 연결된 이슈 번호를 자동으로 찾아 `Closes #N`을 포함한다.

추가 PR 설명 (선택): $ARGUMENTS

## 진행 순서

1. 현재 브랜치를 확인한다.
   - `main` 브랜치면 중단하고 feature 브랜치로 이동하라고 안내한다.

2. 브랜치명에서 이슈 번호를 찾는다:
   - `gh issue list --state open --limit 20`으로 열린 이슈 조회
   - 브랜치명과 이슈 제목을 비교해서 가장 관련성 높은 이슈 번호를 선택
   - 찾지 못하면 이슈 번호 없이 진행 (사용자에게 알림)

3. `git status`와 `git diff`로 변경사항 전체를 파악한다.
   - 변경사항이 없으면 중단하고 사용자에게 알린다.

4. `npm run build`로 빌드가 통과하는지 확인한다.
   - 실패하면 즉시 중단하고 에러를 사용자에게 보여준다.

5. 변경된 파일들을 분석해서 커밋 메시지를 작성한다:
   - Conventional Commits 형식: `feat: [설명]` / `fix: [설명]` / `refactor: [설명]`
   - 변경 내용을 한국어로 간결하게 요약

6. 관련 파일을 스테이징하고 커밋한다 (Co-Authored-By 포함).

7. `git push -u origin [브랜치명]`으로 푸시한다.

8. `gh pr create`로 PR을 생성한다:
   - title: 커밋 메시지 기반, 70자 이내
   - base: `main`
   - body 형식:
     ```
     ## Summary
     - [변경사항 bullet]

     ## Test plan
     - [ ] 앱 빌드 통과 (`npm run build`)
     - [ ] [기능별 체크리스트]

     Closes #[이슈번호]

     🤖 Generated with [Claude Code](https://claude.ai/claude-code)
     ```
   - `$ARGUMENTS`가 있으면 Summary에 추가로 포함한다.
   - 이슈 번호를 찾지 못한 경우 `Closes #N` 줄은 생략한다.

9. PR URL을 사용자에게 보여준다.
