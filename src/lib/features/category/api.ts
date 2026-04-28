// Feature-based 구조 진입점 — 실제 구현은 services/categories.ts (GraphQL)
// Task #6 (import 경로 업데이트) 완료 후 services/를 features/로 이동 예정.
export {
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
} from "$lib/services/categories";
