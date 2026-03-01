버전 bump, CHANGELOG 작성, git 태그까지 릴리즈 워크플로우를 한 번에 처리한다.

릴리즈 타입 (없으면 판단): $ARGUMENTS

## 릴리즈 규칙

| 타입 | 언제 | 예시 |
|---|---|---|
| `patch` | 버그 수정, 소폭 수정 | 0.2.0 → 0.2.1 |
| `minor` | 새 기능, UI 개선, 비파괴 변경 | 0.2.1 → 0.3.0 |
| `major` | 아키텍처 파괴적 변경 | 0.3.0 → 1.0.0 |

## 진행 순서

1. `git log --oneline $(git describe --tags --abbrev=0)..HEAD` 로 마지막 태그 이후 커밋 내역을 확인한다.

2. `$ARGUMENTS`가 없으면 커밋 내역을 보고 적절한 타입(patch/minor/major)을 판단해서 사용자에게 확인한다.

3. `package.json`의 `version` 필드를 새 버전으로 bump한다.

4. `CHANGELOG.md` 맨 위에 새 항목을 추가한다:
   ```
   ## [x.y.z] - YYYY-MM-DD
   ### Added
   - ...
   ### Changed
   - ...
   ### Fixed
   - ...
   ```
   커밋 내역을 기반으로 Added/Changed/Fixed/Removed 중 해당 항목만 작성한다.

5. `npm run build`로 빌드가 통과하는지 확인한다.

6. 변경 파일을 커밋한다 (`package.json`, `CHANGELOG.md`).

7. `git tag vX.Y.Z`로 태그를 생성한다.

8. 사용자에게 태그명과 주요 변경사항을 요약해서 보여준다.
