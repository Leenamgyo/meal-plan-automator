// GraphQL 실행 컨텍스트
// 모든 resolver는 (parent, args, context) → 여기서 repos를 꺼내쓴다.
import type { Repositories } from '../repositories';

// graphql-http의 OperationContext (Record<PropertyKey, unknown>) 제약을 만족시키기 위해
// 인덱스 시그니처를 포함한다. 실제로 사용하는 키는 repos뿐.
export interface GraphQLContext {
  repos: Repositories;
  [key: PropertyKey]: unknown;
}
