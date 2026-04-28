// 서버 부트스트랩 — HTTP 서버 + GraphQL/정적 라우팅 진입점
// main.ts(Electron)는 이 모듈의 startServer()만 호출한다.
//
// 아키텍처:
//   /graphql  → graphqlHandler (server/graphql)
//   나머지     → serveStatic (build/index.html SPA fallback)
import http, { type Server } from 'node:http';
import { PORT, BUILD_DIR, isDev } from './config';
import { serveStatic } from './http/static';
import { graphqlHandler } from './graphql';

export function startServer(): Promise<Server> {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const url = req.url ?? '';

      // GraphQL 엔드포인트 (단일 백엔드 진입점)
      if (url.startsWith('/graphql')) {
        if (isDev()) {
          const start = Date.now();
          await graphqlHandler(req, res);
          console.log(`[GQL ←] ${Date.now() - start}ms · status ${res.statusCode}`);
        } else {
          await graphqlHandler(req, res);
        }
        return;
      }

      // 정적 파일 서빙 (SPA fallback → build/index.html)
      return serveStatic(req, res, BUILD_DIR);
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(
        `로컬 서버 시작: http://127.0.0.1:${PORT}${isDev() ? ' (dev mode)' : ''}`,
      );
      resolve(server);
    });
  });
}

// DB 라이프사이클은 main.ts(Electron)에서 직접 관리한다.
// 서버 모듈은 stateless하게 유지.
export { PORT, BUILD_DIR } from './config';
