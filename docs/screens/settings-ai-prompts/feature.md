# AI Prompt Editor Settings

## Overview
'Meal Chart' 서비스의 핵심 기능인 Gemini AI 기반 운영 매니저의 비즈니스 판단 로직(Prompt)을 사용자가 직접 세밀하게 튜닝할 수 있는 고급 에디터 화면입니다.

## Core Features
- **용도별 프롬프트 탭:** 메뉴 생성용, 스마트 배정용, 재고 분석용 등 각 AI 호출의 컨텍스트를 분리하여 관리.
- **마크다운(Markdown) 코드 에디터:** 실제 프롬프트 문구를 수정할 수 있는 Line-number 지원 텍스트 에디터 제공.
- **버전 히스토리 (Version History):** 과거에 저장했던 우수 프롬프트 내용으로 언제든 롤백(Restore)할 수 있는 버전 관리 패널 지원.

## User Interactions
- **RESTORE 클릭:** 우측의 버전 히스토리 패널에서 과거 내역을 찾아 클릭하면 즉시 에디터에 해당 내용이 복원됨.
- **Save Changes:** 에디터에서 수정된 AI 프롬프트 지시어를 로컬 스토리지에 즉시 반영.
