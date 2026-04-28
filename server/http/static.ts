// 정적 파일 서빙 — SvelteKit static 빌드 출력(build/)을 루트로 서빙한다.
// 존재하지 않는 경로는 index.html로 fallback (SPA fallback)
import path from 'node:path';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export function serveStatic(req: IncomingMessage, res: ServerResponse, buildDir: string): void {
  const urlPath = (req.url ?? '/').split('?')[0];
  let filePath = path.join(buildDir, urlPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(buildDir, 'index.html');
  }

  const content = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
  res.end(content);
}

export { MIME_TYPES };
