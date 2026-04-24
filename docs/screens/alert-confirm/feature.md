# Delete Confirmation Modal (Warning)

## Overview
메뉴 삭제, 카테고리 날리기 등 되돌릴 수 없는 파괴적인(Destructive) 액션을 사용자가 시도했을 때, 실수를 방지하기 위해 의사를 최종 확인하는 치명적 팝업 창입니다.

## Core Features
- **경고(Warning) 시각화:** 주의를 요하는 오렌지 색상 아이콘(`warning`)과 크고 강렬한 헤드라인 타이포그래피.
- **명확한 파괴 액션 버튼 분리:** 취소(Cancel) 버튼은 시선을 덜 끄는 무채색/테두리 라인으로 처리하고, 최종 확인(Confirm) 버튼은 붉은색 계열(Danger)로 처리하여 조작 실수를 원천적으로 차단.

## User Interactions
- **Cancel 액션:** 모달을 즉시 닫고 안전하게 이전 상태를 유지.
- **Confirm 액션:** 서버(또는 로컬 DB)에 실제 삭제/변경 로직을 발동.
