// Electron main process + server 공용 설정 상수
// 경로는 프로젝트 루트 기준
//
// 두 가지 실행 컨텍스트를 모두 지원:
//   1. tsc 컴파일 산출물 (CJS, dist-server/server/config.js):
//      __dirname = dist-server/server/, 루트는 두 단계 위
//   2. tsx 직접 실행 (ESM 컨텍스트, npm test):
//      __dirname 정의 안 됨 → process.cwd() (npm은 package.json 디렉토리에서 실행)
import path from 'node:path';

declare const __dirname: string | undefined;

const baseDir =
  typeof __dirname !== 'undefined'
    ? path.resolve(__dirname, '..', '..')
    : process.cwd();

export const ROOT_DIR = baseDir;
export const PORT = 3737;
export const DB_PATH = path.join(ROOT_DIR, 'meal-chart.db');
export const BUILD_DIR = path.join(ROOT_DIR, 'build');

// 개발 모드 판정 (lazy — NODE_ENV가 main.ts에서 늦게 세팅되므로 함수로 평가)
//   - npm start (Electron, app.isPackaged === false)  → main.ts가 'development'로 세팅
//   - packaged 배포본                                  → main.ts가 'production'으로 세팅
//   - npm test (NODE_ENV 미세팅)                        → false (테스트 로그 노이즈 방지)
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}
