import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { ServerResponse } from 'node:http';
import { getMimeType, serveStatic } from './static';

describe('getMimeType', () => {
  it('알려진 확장자', () => {
    assert.equal(getMimeType('foo.html'), 'text/html; charset=utf-8');
    assert.equal(getMimeType('foo.js'), 'application/javascript');
    assert.equal(getMimeType('foo.css'), 'text/css');
    assert.equal(getMimeType('foo.svg'), 'image/svg+xml');
    assert.equal(getMimeType('foo.png'), 'image/png');
    assert.equal(getMimeType('foo.woff2'), 'font/woff2');
  });

  it('대소문자 무관', () => {
    assert.equal(getMimeType('FOO.HTML'), 'text/html; charset=utf-8');
  });

  it('알 수 없는 확장자는 octet-stream', () => {
    assert.equal(getMimeType('foo.xyz'), 'application/octet-stream');
    assert.equal(getMimeType('noext'), 'application/octet-stream');
  });
});

// ServerResponse 모킹 — writeHead/end 호출만 캡처
function createMockResponse() {
  const calls = {
    writeHead: [] as Array<{ status: number; headers: Record<string, string> }>,
    end: [] as Array<Buffer | string>,
  };
  const res = {
    writeHead(status: number, headers: Record<string, string>) {
      calls.writeHead.push({ status, headers });
    },
    end(content: Buffer | string) {
      calls.end.push(content);
    },
  } as unknown as ServerResponse;
  return { res, calls };
}

describe('serveStatic', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meal-chart-test-'));
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html>root</html>');
    fs.writeFileSync(path.join(tmpDir, 'app.js'), 'console.log("hi")');
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'sub', 'index.html'), '<html>sub</html>');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('정확한 파일 경로를 서빙', () => {
    const { res, calls } = createMockResponse();
    serveStatic({ url: '/app.js' } as never, res, tmpDir);

    assert.equal(calls.writeHead[0].status, 200);
    assert.equal(calls.writeHead[0].headers['Content-Type'], 'application/javascript');
    assert.equal(calls.end[0].toString(), 'console.log("hi")');
  });

  it('디렉토리 경로는 index.html로 fallback', () => {
    const { res, calls } = createMockResponse();
    serveStatic({ url: '/sub' } as never, res, tmpDir);
    assert.equal(calls.end[0].toString(), '<html>sub</html>');
  });

  it('존재하지 않는 경로는 루트 index.html (SPA fallback)', () => {
    const { res, calls } = createMockResponse();
    serveStatic({ url: '/some/spa/route' } as never, res, tmpDir);
    assert.equal(calls.end[0].toString(), '<html>root</html>');
  });

  it('querystring은 무시하고 path만 사용', () => {
    const { res, calls } = createMockResponse();
    serveStatic({ url: '/app.js?v=1' } as never, res, tmpDir);
    assert.equal(calls.end[0].toString(), 'console.log("hi")');
  });
});
