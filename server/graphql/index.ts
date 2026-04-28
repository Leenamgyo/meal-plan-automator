// GraphQL 핸들러 진입점
// http.createServer 콜백에서 /graphql 경로일 때 graphqlHandler(req, res)를 호출하면 된다.
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createHandler } from 'graphql-http/lib/use/node';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { getRepos } from '../repositories';
import { isDev } from '../config';
import type { GraphQLContext } from './context';

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// query 문자열에서 첫 줄 추출 (operationName이 없을 때 디버그 식별용)
function previewQuery(query: string | undefined): string {
  if (!query) return '';
  const firstLine = query.trim().split('\n')[0];
  return firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
}

// graphql-http는 (req, res) → Promise<void> 핸들러를 반환한다.
// context는 매 요청마다 평가되므로 항상 최신 db에 바인딩된 repos가 주입된다.
// dev 모드에서는 들어오는 operation을 stdout으로 출력.
export const graphqlHandler = createHandler<GraphQLContext>({
  schema,
  context: (_req, params): GraphQLContext => {
    if (isDev()) {
      const op = params.operationName ?? `(${previewQuery(params.query)})`;
      const vars =
        params.variables && Object.keys(params.variables).length > 0
          ? JSON.stringify(params.variables)
          : '';
      console.log(`[GQL →] ${op}${vars ? ` ${vars}` : ''}`);
    }
    return { repos: getRepos() };
  },
});

export { typeDefs, resolvers };
export type { GraphQLContext };
