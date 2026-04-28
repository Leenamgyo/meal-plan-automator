// 실제 Repository(in-memory DB)를 주입한 graphql() 실행 통합 테스트
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { graphql, type ExecutionResult } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { createTestDb } from '../__tests__/testDb';
import { createRepositories } from '../repositories';

const schema = makeExecutableSchema({ typeDefs, resolvers });

function makeContext() {
  const db = createTestDb();
  const repos = createRepositories(db);
  return { db, repos };
}

async function exec<T>(
  source: string,
  variables?: Record<string, unknown>,
  contextValue: { repos: ReturnType<typeof createRepositories> } = makeContext(),
): Promise<ExecutionResult<T>> {
  return (await graphql({ schema, source, variableValues: variables, contextValue })) as ExecutionResult<T>;
}

describe('GraphQL Query', () => {
  it('빈 DB의 categories는 빈 배열', async () => {
    const r = await exec<{ categories: unknown[] }>(`{ categories { id } }`);
    assert.equal(r.errors, undefined);
    assert.deepEqual(r.data?.categories, []);
  });

  it('category(id) 미존재시 null', async () => {
    const r = await exec<{ category: null }>(`{ category(id: 999) { id } }`);
    assert.equal(r.errors, undefined);
    assert.equal(r.data?.category, null);
  });

  it('mealDataByDate 미존재시 null', async () => {
    const r = await exec<{ mealDataByDate: null }>(
      `query($d: String!) { mealDataByDate(date: $d) { id } }`,
      { d: '2099-01-01' },
    );
    assert.equal(r.data?.mealDataByDate, null);
  });
});

describe('GraphQL Mutation — Category', () => {
  it('createCategory → categories에서 보임', async () => {
    const ctx = makeContext();
    const create = await exec<{ createCategory: { id: number; name: string } }>(
      `mutation { createCategory(input: { name: "밥", color: "#fff" }) { id name } }`,
      undefined,
      ctx,
    );
    assert.equal(create.errors, undefined);
    assert.equal(create.data?.createCategory.name, '밥');

    const list = await exec<{ categories: Array<{ name: string }> }>(
      `{ categories { name } }`,
      undefined,
      ctx,
    );
    assert.deepEqual(
      list.data?.categories.map((c) => c.name),
      ['밥'],
    );
  });

  it('updateCategory + deleteCategory', async () => {
    const ctx = makeContext();
    const create = await exec<{ createCategory: { id: number } }>(
      `mutation { createCategory(input: { name: "X", color: "#000" }) { id } }`,
      undefined,
      ctx,
    );
    const id = create.data!.createCategory.id;

    const upd = await exec<{ updateCategory: { color: string } }>(
      `mutation($id: Int!) { updateCategory(id: $id, input: { color: "#fff" }) { color } }`,
      { id },
      ctx,
    );
    assert.equal(upd.data?.updateCategory.color, '#fff');

    const del = await exec<{ deleteCategory: boolean }>(
      `mutation($id: Int!) { deleteCategory(id: $id) }`,
      { id },
      ctx,
    );
    assert.equal(del.data?.deleteCategory, true);
  });
});

describe('GraphQL Mutation — MenuItem', () => {
  it('createMenuItem + ingredients hydrate', async () => {
    const ctx = makeContext();
    const r = await exec<{ createMenuItem: { id: number; ingredients: string[] } }>(
      `mutation {
        createMenuItem(input: {
          name: "제육볶음",
          category_id: null,
          ingredients: ["돼지고기", "고추장"]
        }) { id ingredients }
      }`,
      undefined,
      ctx,
    );
    assert.deepEqual(r.data?.createMenuItem.ingredients, ['돼지고기', '고추장']);
  });

  it('updateMenuItem 미존재 → NOT_FOUND 에러', async () => {
    const r = await exec<{ updateMenuItem: null }>(
      `mutation { updateMenuItem(id: 999, input: { name: "x" }) { id } }`,
    );
    assert.equal(r.errors?.[0].extensions?.code, 'NOT_FOUND');
  });
});

describe('GraphQL Mutation — Prompt (conflict 처리)', () => {
  it('createPrompt 중복 ID → CONFLICT 에러', async () => {
    const ctx = makeContext();
    await exec(
      `mutation { createPrompt(input: { id: "dup", content: "x" }) { id } }`,
      undefined,
      ctx,
    );
    const second = await exec<{ createPrompt: null }>(
      `mutation { createPrompt(input: { id: "dup", content: "y" }) { id } }`,
      undefined,
      ctx,
    );
    assert.equal(second.errors?.[0].extensions?.code, 'CONFLICT');
  });

  it('updatePrompt 미존재 → NOT_FOUND', async () => {
    const r = await exec(
      `mutation { updatePrompt(id: "nope", input: { content: "x" }) { id } }`,
    );
    assert.equal(r.errors?.[0].extensions?.code, 'NOT_FOUND');
  });
});

describe('GraphQL Mutation — MealData (upsert)', () => {
  it('upsertMealData 후 mealDataByDate로 조회', async () => {
    const ctx = makeContext();
    const upsert = await exec<{ upsertMealData: { date: string } }>(
      `mutation($d: String!, $menus: [MealEntryInput!]!) {
        upsertMealData(date: $d, menus: $menus) { date }
      }`,
      {
        d: '2024-05-01',
        menus: [{ name: '쌀밥', category_id: null, color: '#fff' }],
      },
      ctx,
    );
    assert.equal(upsert.data?.upsertMealData.date, '2024-05-01');

    const fetch = await exec<{ mealDataByDate: { menus: Array<{ name: string }> } }>(
      `query { mealDataByDate(date: "2024-05-01") { menus { name } } }`,
      undefined,
      ctx,
    );
    assert.equal(fetch.data?.mealDataByDate.menus[0].name, '쌀밥');
  });
});

describe('GraphQL Mutation — Combo', () => {
  it('createCombo는 items도 함께 hydrate', async () => {
    const ctx = makeContext();
    // 메뉴 2개 미리 생성
    const m1 = await exec<{ createMenuItem: { id: number } }>(
      `mutation { createMenuItem(input: { name: "쌀밥", category_id: null }) { id } }`,
      undefined,
      ctx,
    );
    const m2 = await exec<{ createMenuItem: { id: number } }>(
      `mutation { createMenuItem(input: { name: "김치", category_id: null }) { id } }`,
      undefined,
      ctx,
    );

    const combo = await exec<{
      createCombo: { id: number; items: Array<{ name: string }> };
    }>(
      `mutation($ids: [Int!]!) {
        createCombo(input: { name: "한식", item_ids: $ids }) {
          id items { name }
        }
      }`,
      { ids: [m1.data!.createMenuItem.id, m2.data!.createMenuItem.id] },
      ctx,
    );

    const names = combo.data?.createCombo.items.map((i) => i.name).sort();
    assert.deepEqual(names, ['김치', '쌀밥']);
  });
});
