Feature 브랜치를 생성하고 GitHub 이슈를 등록한 뒤 작업을 시작한다.

기능 설명: $ARGUMENTS

## 진행 순서

1. `git status`로 uncommitted 변경사항 확인.
   - 변경사항이 있으면 사용자에게 알리고, stash 또는 커밋 후 진행할지 확인한다.

2. `git checkout main && git pull origin main`으로 최신 main 기준으로 맞춘다.

3. `$ARGUMENTS`를 kebab-case 브랜치명으로 변환한다:
   - 한글이면 의미에 맞는 영어로 번역
   - 공백·특수문자 → 하이픈(-)
   - 소문자만 사용
   - 예: "달력 PNG 다운로드" → `calendar-png-download`
   - 예: "메뉴 AI 재료 추천" → `ai-ingredient-suggest`

4. GitHub 이슈를 생성한다:
   ```
   gh issue create --title "[기능명]" --body "## 작업 내용\n$ARGUMENTS\n\n## 체크리스트\n- [ ] 구현\n- [ ] 빌드 확인"
   ```
   - 생성된 이슈 번호를 기억해둔다 (이후 PR 연결에 사용).

5. `git checkout -b feat/[브랜치명]`으로 브랜치를 생성한다.

6. `TODO.md`의 `## 📋 예정` 섹션에 항목을 추가한다:
   ```
   - [ ] [기능명] (#이슈번호)
   ```

7. 결과를 사용자에게 보여준다:
   - 이슈 URL
   - 생성된 브랜치명
   - "작업 완료 후 `/pr`로 PR을 생성하세요" 안내
