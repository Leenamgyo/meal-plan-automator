// GraphQL resolver — Repository로의 얇은 위임
// 정책(404, 409 등 HTTP 상태)은 GraphQL에 의미가 없으므로 Error로 표현한다.
import { GraphQLError } from 'graphql';
import type { GraphQLContext } from './context';
import type {
  CategoryCreate,
  CategoryPatch,
  MenuItemCreate,
  MenuItemPatch,
  MealEntry,
  PromptCreate,
  PromptPatch,
  ComboCreate,
  ComboPatch,
} from '../types';

const notFound = (entity: string, id: number | string): never => {
  throw new GraphQLError(`${entity} not found: ${id}`, {
    extensions: { code: 'NOT_FOUND' },
  });
};

const conflict = (entity: string, id: string): never => {
  throw new GraphQLError(`${entity} already exists: ${id}`, {
    extensions: { code: 'CONFLICT' },
  });
};

export const resolvers = {
  Query: {
    // ===== Categories =====
    categories: (_p: unknown, _a: unknown, { repos }: GraphQLContext) =>
      repos.categories.findAll(),
    category: (_p: unknown, { id }: { id: number }, { repos }: GraphQLContext) =>
      repos.categories.findById(id),

    // ===== Menu Items =====
    menuItems: (_p: unknown, _a: unknown, { repos }: GraphQLContext) =>
      repos.menuItems.findAll(),
    menuItem: (_p: unknown, { id }: { id: number }, { repos }: GraphQLContext) =>
      repos.menuItems.findById(id),

    // ===== Meal Data =====
    mealData: (_p: unknown, _a: unknown, { repos }: GraphQLContext) =>
      repos.mealData.findAll(),
    mealDataByDate: (
      _p: unknown,
      { date }: { date: string },
      { repos }: GraphQLContext,
    ) => repos.mealData.findByDate(date),

    // ===== Prompts =====
    prompts: (_p: unknown, _a: unknown, { repos }: GraphQLContext) =>
      repos.prompts.findAll(),
    prompt: (_p: unknown, { id }: { id: string }, { repos }: GraphQLContext) =>
      repos.prompts.findById(id),

    // ===== Combos =====
    combos: (_p: unknown, _a: unknown, { repos }: GraphQLContext) =>
      repos.combos.findAll(),
    combo: (_p: unknown, { id }: { id: number }, { repos }: GraphQLContext) =>
      repos.combos.findById(id),
  },

  Mutation: {
    // ===== Categories =====
    createCategory: (
      _p: unknown,
      { input }: { input: CategoryCreate },
      { repos }: GraphQLContext,
    ) => repos.categories.insert(input),

    updateCategory: (
      _p: unknown,
      { id, input }: { id: number; input: CategoryPatch },
      { repos }: GraphQLContext,
    ) => repos.categories.update(id, input),

    deleteCategory: (
      _p: unknown,
      { id }: { id: number },
      { repos }: GraphQLContext,
    ) => {
      repos.categories.remove(id);
      return true;
    },

    // ===== Menu Items =====
    createMenuItem: (
      _p: unknown,
      { input }: { input: MenuItemCreate },
      { repos }: GraphQLContext,
    ) => repos.menuItems.insert(input),

    updateMenuItem: (
      _p: unknown,
      { id, input }: { id: number; input: MenuItemPatch },
      { repos }: GraphQLContext,
    ) => {
      const updated = repos.menuItems.update(id, input);
      if (!updated) notFound('MenuItem', id);
      return updated;
    },

    deleteMenuItem: (
      _p: unknown,
      { id }: { id: number },
      { repos }: GraphQLContext,
    ) => {
      repos.menuItems.remove(id);
      return true;
    },

    // ===== Meal Data =====
    upsertMealData: (
      _p: unknown,
      { date, menus }: { date: string; menus: MealEntry[] },
      { repos }: GraphQLContext,
    ) => repos.mealData.upsert(date, menus),

    deleteMealDataByDate: (
      _p: unknown,
      { date }: { date: string },
      { repos }: GraphQLContext,
    ) => {
      repos.mealData.removeByDate(date);
      return true;
    },

    // ===== Prompts =====
    createPrompt: (
      _p: unknown,
      { input }: { input: PromptCreate },
      { repos }: GraphQLContext,
    ) => {
      if (repos.prompts.existsById(input.id)) conflict('Prompt', input.id);
      return repos.prompts.insert(input);
    },

    updatePrompt: (
      _p: unknown,
      { id, input }: { id: string; input: PromptPatch },
      { repos }: GraphQLContext,
    ) => {
      const updated = repos.prompts.update(id, input);
      if (!updated) notFound('Prompt', id);
      return updated;
    },

    deletePrompt: (
      _p: unknown,
      { id }: { id: string },
      { repos }: GraphQLContext,
    ) => {
      repos.prompts.remove(id);
      return true;
    },

    // ===== Combos =====
    createCombo: (
      _p: unknown,
      { input }: { input: ComboCreate },
      { repos }: GraphQLContext,
    ) => repos.combos.insert(input),

    updateCombo: (
      _p: unknown,
      { id, input }: { id: number; input: ComboPatch },
      { repos }: GraphQLContext,
    ) => {
      const updated = repos.combos.update(id, input);
      if (!updated) notFound('Combo', id);
      return updated;
    },

    deleteCombo: (
      _p: unknown,
      { id }: { id: number },
      { repos }: GraphQLContext,
    ) => {
      repos.combos.remove(id);
      return true;
    },
  },
};
