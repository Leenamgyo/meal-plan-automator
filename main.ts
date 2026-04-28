// Electron main process 엔트리포인트
// 컴파일 산출물: dist-server/main.js
// __dirname = <project>/dist-server/  → preload.js는 한 단계 상위에 있음
//
// 이 파일은 Electron 라이프사이클만 책임진다:
//   - DB 초기화 / 종료
//   - HTTP 서버 시작 (server/index.ts에 위임)
//   - BrowserWindow 생성 / activate / quit
import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';

import { PORT } from './server/config';
import { initDatabase, isDbOpen, closeDatabase } from './server/db/connection';
import { startServer } from './server';

const createWindow = (): void => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.8),
    webPreferences: {
      // 컴파일 후 __dirname = dist-server/, preload.js는 프로젝트 루트에 위치
      preload: path.join(__dirname, '..', 'preload.js'),
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}/`);

  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    console.log(`[Renderer]: ${message}`);
  });
};

app.whenReady().then(async () => {
  // dev/prod 환경 결정 — initDatabase() / startServer()가 NODE_ENV를 읽기 전에 세팅
  // packaged 배포본은 production, 그 외는 development. 외부에서 명시적으로 세팅했으면 그대로.
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
  }

  initDatabase();
  await startServer();
  createWindow();

  app.on('activate', () => {
    // macOS: DB가 닫혀있으면 재초기화
    if (!isDbOpen()) initDatabase();
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase();
    app.quit();
  }
  // macOS에서는 앱이 살아있으므로 DB를 닫지 않음
});
