// SDL 파싱 + 모든 Query/Mutation에 resolver가 매핑되어 있는지 검증
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

const schema = makeExecutableSchema({ typeDefs, resolvers });

describe('GraphQL schema', () => {
  it('typeDefs는 SDL 문자열', () => {
    assert.equal(typeof typeDefs, 'string');
    assert.ok(typeDefs.includes('type Query'));
    assert.ok(typeDefs.includes('type Mutation'));
  });

  it('주요 도메인 타입이 모두 정의되어 있다', () => {
    const types = schema.getTypeMap();
    for (const t of ['Category', 'MenuItem', 'MealData', 'MealEntry', 'Prompt', 'Combo']) {
      assert.ok(types[t], `${t} 타입 누락`);
    }
  });

  it('주요 입력 타입이 모두 정의되어 있다', () => {
    const types = schema.getTypeMap();
    for (const t of [
      'CategoryCreateInput',
      'CategoryPatchInput',
      'MenuItemCreateInput',
      'MenuItemPatchInput',
      'MealEntryInput',
      'PromptCreateInput',
      'PromptPatchInput',
      'ComboCreateInput',
      'ComboPatchInput',
    ]) {
      assert.ok(types[t], `${t} 입력 타입 누락`);
    }
  });

  it('모든 Query 필드에 resolver가 매핑된다', () => {
    const queryFields = Object.keys(schema.getQueryType()!.getFields());
    for (const field of queryFields) {
      assert.ok(
        field in resolvers.Query,
        `Query.${field} resolver 누락`,
      );
    }
  });

  it('모든 Mutation 필드에 resolver가 매핑된다', () => {
    const mutationFields = Object.keys(schema.getMutationType()!.getFields());
    for (const field of mutationFields) {
      assert.ok(
        field in resolvers.Mutation,
        `Mutation.${field} resolver 누락`,
      );
    }
  });

  it('Query는 10개 필드', () => {
    assert.equal(Object.keys(schema.getQueryType()!.getFields()).length, 10);
  });

  it('Mutation은 14개 필드', () => {
    assert.equal(Object.keys(schema.getMutationType()!.getFields()).length, 14);
  });
});
