# 🗺️ Screen Routing & UI Index

본 문서는 'Meal Chart' 프로젝트의 모든 화면(Screen) 자산을 구조화하고 연결하는 중앙 허브입니다. 모든 개발 구현(Implementation)은 본 라우팅 맵의 `feature.md` 설계를 최우선으로 따릅니다.

---

## 📅 Planner Module (일정 및 배정)
| Screen ID | Title | Spec | Prototype | Key Interaction |
| :--- | :--- | :--- | :--- | :--- |
| `PLN-001` | [Planner Main](./planner-main/) | [Spec](./planner-main/feature.md) | [UI](./planner-main/ui.html) | Double-click Assign |
| `PLN-002` | [AI Recommendation](./planner-ai-adjust/) | [Spec](./planner-ai-adjust/feature.md) | [UI](./planner-ai-adjust/ui.html) | Combo Generation |
| `PLN-003` | [Planner Expanded](./planner-collapsed/) | [Spec](./planner-collapsed/feature.md) | [UI](./planner-collapsed/ui.html) | Full-screen View |

## 🍱 Inventory Module (자산 관리)
| Screen ID | Title | Spec | Prototype | Key Interaction |
| :--- | :--- | :--- | :--- | :--- |
| `INV-001` | [Inventory Dashboard](./inventory-dashboard/) | [Spec](./inventory-dashboard/feature.md) | [UI](./inventory-dashboard/ui.html) | Asset Statistics |
| `INV-002` | [Single Menu Registry](./modal-menu-registry/) | [Spec](./modal-menu-registry/feature.md) | [UI](./modal-menu-registry/ui.html) | Duplicate Check |
| `INV-003` | [Combo Registry](./modal-combo-registry/) | [Spec](./modal-combo-registry/feature.md) | [UI](./modal-combo-registry/ui.html) | Multi-selection |
| `INV-004` | [Selection Branch](./modal-new-entry-selection/) | [Spec](./modal-new-entry-selection/feature.md) | [UI](./modal-new-entry-selection/ui.html) | Visual Selection |

## ⚙️ Settings Module (시스템 관리)
| Screen ID | Title | Spec | Prototype | Key Interaction |
| :--- | :--- | :--- | :--- | :--- |
| `SET-001` | [Restaurant Profile](./settings-profile/) | [Spec](./settings-profile/feature.md) | [UI](./settings-profile/ui.html) | Profile Save |
| `SET-002` | [Category Manager](./settings-categories/) | [Spec](./settings-categories/feature.md) | [UI](./settings-categories/ui.html) | Color Tokenizing |
| `SET-003` | [AI Prompt Editor](./settings-ai-prompts/) | [Spec](./settings-ai-prompts/feature.md) | [UI](./settings-ai-prompts/ui.html) | Version Restore |

## 🔔 Common Components (공통 요소)
| Screen ID | Title | Spec | Prototype | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `COM-001` | [Success Alert](./alert-success/) | [Spec](./alert-success/feature.md) | [UI](./alert-success/ui.html) | Feedback |
| `COM-002` | [Confirm Modal](./alert-confirm/) | [Spec](./alert-confirm/feature.md) | [UI](./alert-confirm/ui.html) | Destructive Action |
| `COM-003` | [Verdant Core Palette](./design-system-palette/) | [Spec](./design-system-palette/feature.md) | [UI](./design-system-palette/ui.html) | Brand Identity |

---
**Architect's Note:** 
모든 화면은 'Verdant Core' 디자인 시스템을 준수해야 하며, 개별 `feature.md`에 정의되지 않은 변칙적인 UI 패턴 사용을 금지합니다.
