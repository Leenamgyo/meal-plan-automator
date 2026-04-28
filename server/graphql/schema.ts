// GraphQL SDL 정의
// REST API 표면을 그대로 GraphQL로 매핑한다.
// 향후 FastAPI + Strawberry로 이전할 때 동일한 스키마를 사용한다.

export const typeDefs = /* GraphQL */ `
  # ===== 도메인 타입 =====

  type Category {
    id: Int!
    name: String!
    color: String!
    sort_order: Int!
    created_at: String!
  }

  type MenuItem {
    id: Int!
    name: String!
    category_id: Int
    ingredients: [String!]!
    created_at: String!
  }

  type MealEntry {
    name: String!
    category_id: Int
    color: String
  }

  type MealData {
    id: Int!
    date: String!
    menus: [MealEntry!]!
    created_at: String!
  }

  type Prompt {
    id: ID!
    version: String!
    description: String
    content: String!
    is_active: Int!
  }

  type Combo {
    id: Int!
    name: String!
    description: String!
    is_active: Int!
    created_at: String!
    items: [MenuItem!]!
  }

  # ===== 입력 타입 =====

  input CategoryCreateInput {
    name: String
    color: String
  }

  input CategoryPatchInput {
    name: String
    color: String
    sort_order: Int
  }

  input MenuItemCreateInput {
    name: String
    category_id: Int
    ingredients: [String!]
  }

  input MenuItemPatchInput {
    name: String
    category_id: Int
    ingredients: [String!]
  }

  input MealEntryInput {
    name: String!
    category_id: Int
    color: String
  }

  input PromptCreateInput {
    id: ID!
    content: String!
    description: String
    version: String
    is_active: Int
  }

  input PromptPatchInput {
    content: String
    version: String
    is_active: Int
  }

  input ComboCreateInput {
    name: String!
    description: String
    item_ids: [Int!]
  }

  input ComboPatchInput {
    name: String
    description: String
    is_active: Int
    item_ids: [Int!]
  }

  # ===== Query / Mutation =====

  type Query {
    categories: [Category!]!
    category(id: Int!): Category

    menuItems: [MenuItem!]!
    menuItem(id: Int!): MenuItem

    mealData: [MealData!]!
    mealDataByDate(date: String!): MealData

    prompts: [Prompt!]!
    prompt(id: ID!): Prompt

    combos: [Combo!]!
    combo(id: Int!): Combo
  }

  type Mutation {
    createCategory(input: CategoryCreateInput!): Category!
    updateCategory(id: Int!, input: CategoryPatchInput!): Category
    deleteCategory(id: Int!): Boolean!

    createMenuItem(input: MenuItemCreateInput!): MenuItem!
    updateMenuItem(id: Int!, input: MenuItemPatchInput!): MenuItem
    deleteMenuItem(id: Int!): Boolean!

    upsertMealData(date: String!, menus: [MealEntryInput!]!): MealData!
    deleteMealDataByDate(date: String!): Boolean!

    createPrompt(input: PromptCreateInput!): Prompt!
    updatePrompt(id: ID!, input: PromptPatchInput!): Prompt
    deletePrompt(id: ID!): Boolean!

    createCombo(input: ComboCreateInput!): Combo!
    updateCombo(id: Int!, input: ComboPatchInput!): Combo
    deleteCombo(id: Int!): Boolean!
  }
`;
