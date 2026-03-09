const { app, BrowserWindow, screen } = require('electron');
const path = require('node:path');
const http = require('http');
const fs = require('fs');
const Database = require('better-sqlite3');

// ========== 설정 ==========
const BUILD_DIR = path.join(__dirname, 'build');
const PORT = 3737;
// 사용자 요청으로 프로젝트 폴더 내부에 DB 저장
const DB_PATH = path.join(__dirname, 'meal-chart.db');

// ========== SQLite 초기화 ==========
let db;

function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#cccccc',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      ingredients TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS meal_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      menus TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      version TEXT DEFAULT 'v1',
      description TEXT,
      content TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );
  `);

  // 프롬프트 초기 시드 추가
  const seedPrompts = [
    {
      id: "json_parser",
      description: "기초 식단 분석용 JSON 프롬프트 (전체 문자열 분석)",
      content: `당신은 식단 분석 및 데이터 정형화 전문가입니다.
사용자가 제공하는 자유로운 텍스트 형식의 식단표를 분석하여 아래의 구조화된 JSON 데이터 포맷으로만 응답해야 합니다. 
다른 설명이나 마크다운 백틱(\`\`\`json ... \`\`\`) 없이 순수 JSON 배열 객체만 반환하세요.

[JSON 출력 형식 예시]
[
  {
    "date": "2024-03-01",
    "day": "금요일",
    "meals": {
      "breakfast": ["현미밥", "미역국", "계란말이", "김치"],
      "lunch": ["잡곡밥", "제육볶음", "상추쌈", "된장찌개"],
      "dinner": ["닭가슴살 샐러드", "고구마 1개", "아몬드 브리즈"]
    }
  }
]

명시되지 않은 식사 시간(예: 아침이 없는 경우)에는 빈 배열 "[]"을 할당하세요.`
    },
    {
      id: "chat_base",
      description: "일반 식단 채팅용 베이스 프롬프트",
      content: "당신은 사용자의 식단을 분석하고 추천해주는 다정한 AI 비서입니다."
    },
    {
      id: "ingredient_suggest",
      description: "메뉴 이름으로 재료 자동 추천 프롬프트",
      content: "당신은 요리 전문가입니다. 메뉴 이름을 받으면 해당 요리의 주요 재료를 한국어로 나열합니다. 재료 이름만 쉼표로 구분하여 한 줄로 응답하세요. 다른 설명은 하지 마세요."
    },
    {
      id: "auto_gen",
      description: "달력 단일 일자 식단 8메뉴 자동 구성 프롬프트 (점수표 기반 중복 회피)",
      content: `당신은 구내식당 영양사입니다. 아래 규칙을 **반드시** 지키면서 점심 식단(총 8가지)을 구성하세요.

## 카테고리별 구성 규칙
- 밥 카테고리: 1개
- 국/찌개 카테고리: 1개
- 주메뉴 카테고리: 1~2개
- 부메뉴 카테고리: 2~3개
- 밑반찬 카테고리: 2~3개
- 김치/기타 카테고리: 1개
※ 총합이 반드시 8개가 되어야 합니다. 주메뉴·부메뉴·밑반찬 개수로 조절하세요.

## 메뉴 추천 점수 활용 (매우 중요!)
아래 점수표는 이 날짜 기준 ±30일 내 데이터를 분석한 결과입니다 (0~100점).
- **점수가 높은 메뉴를 우선 선택**하세요.
- 점수가 낮을수록 인근 날짜에 자주 나온 메뉴이므로 피해주세요.
- 0점 메뉴는 절대 선택하지 마세요.
- 같은 점수라면 ±일수가 더 큰 (오래된) 메뉴를 고르세요.

{frequencyData}

## 가용한 메뉴 목록 (카테고리별)
{availableMenusText}

## 직전 7일 식단 이력 (맥락 참고)
{recentMealsText}

## 절대 규칙
1. 위 "가용한 메뉴 목록"에 **정확히 존재하는 이름**만 사용하세요. 한 글자라도 다르면 안 됩니다.
2. 반드시 8개의 메뉴를 출력해야 합니다. 어떤 상황에서도 빈 결과는 허용되지 않습니다.
3. 다른 설명이나 번호 매기기 없이, 쉼표(,)로 구분한 메뉴 이름 8개만 한 줄로 답하세요.

출력 예시: 쌀밥, 배추김치, 멸치볶음, 콩자반, 시금치나물, 계란말이, 야채튀김, 된장찌개`
    }
  ];

  // json_parser, chat_base는 사용자 편집 보존 (DO NOTHING)
  const insertPrompt = db.prepare(`
    INSERT INTO prompts (id, description, content)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);
  for (const p of seedPrompts.filter(p => p.id !== 'auto_gen')) {
    insertPrompt.run(p.id, p.description, p.content);
  }

  // auto_gen은 코드와 강하게 결합되어 있으므로 항상 최신 버전으로 갱신
  const autoGen = seedPrompts.find(p => p.id === 'auto_gen');
  db.prepare(`
    INSERT INTO prompts (id, description, content)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET content = excluded.content, description = excluded.description
  `).run(autoGen.id, autoGen.description, autoGen.content);

  try {
    // 마이그레이션: 기존 DB에 sort_order 컬럼이 없으면 추가
    db.exec(`ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0`);
  } catch (err) {
    // 이미 존재하는 경우 무시
  }

  console.log(`SQLite DB 경로: ${DB_PATH}`);
}

// ========== REST API 핸들러 ==========

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

async function handleAPI(req, res) {
  const url = req.url.split('?')[0];
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // ===== Categories =====
  if (url === '/api/categories' && method === 'GET') {
    const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC').all();
    return sendJSON(res, rows);
  }

  if (url === '/api/categories' && method === 'POST') {
    const body = await parseBody(req);
    const stmt = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
    const result = stmt.run(body.name || '새 카테고리', body.color || '#cccccc');
    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
    return sendJSON(res, row, 201);
  }

  const catMatch = url.match(/^\/api\/categories\/(\d+)$/);
  if (catMatch && method === 'PUT') {
    const id = parseInt(catMatch[1]);
    const body = await parseBody(req);
    const setParts = [];
    const values = [];

    if (body.name !== undefined) { setParts.push('name = ?'); values.push(body.name); }
    if (body.color !== undefined) { setParts.push('color = ?'); values.push(body.color); }
    if (body.sort_order !== undefined) { setParts.push('sort_order = ?'); values.push(body.sort_order); }

    if (setParts.length > 0) {
      values.push(id);
      db.prepare(`UPDATE categories SET ${setParts.join(', ')} WHERE id = ?`).run(...values);
    }

    const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return sendJSON(res, row);
  }

  if (catMatch && method === 'DELETE') {
    const id = parseInt(catMatch[1]);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return sendJSON(res, { success: true });
  }

  // ===== Menu Items =====
  if (url === '/api/menu-items' && method === 'GET') {
    const rows = db.prepare('SELECT * FROM menu_items ORDER BY created_at').all();
    return sendJSON(res, rows.map(r => ({
      ...r,
      ingredients: JSON.parse(r.ingredients || '[]'),
    })));
  }

  if (url === '/api/menu-items' && method === 'POST') {
    const body = await parseBody(req);
    const stmt = db.prepare('INSERT INTO menu_items (name, category_id, ingredients) VALUES (?, ?, ?)');
    const result = stmt.run(
      body.name || '',
      body.category_id || null,
      JSON.stringify(body.ingredients || [])
    );
    const row = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);
    return sendJSON(res, { ...row, ingredients: JSON.parse(row.ingredients || '[]') }, 201);
  }

  const menuMatch = url.match(/^\/api\/menu-items\/(\d+)$/);
  if (menuMatch && method === 'PUT') {
    const id = parseInt(menuMatch[1]);
    const body = await parseBody(req);
    const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    if (!existing) return sendJSON(res, { error: 'not found' }, 404);
    db.prepare('UPDATE menu_items SET name = ?, category_id = ?, ingredients = ? WHERE id = ?')
      .run(
        body.name ?? existing.name,
        body.category_id ?? existing.category_id,
        body.ingredients ? JSON.stringify(body.ingredients) : existing.ingredients,
        id
      );
    const row = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
    return sendJSON(res, { ...row, ingredients: JSON.parse(row.ingredients || '[]') });
  }

  if (menuMatch && method === 'DELETE') {
    const id = parseInt(menuMatch[1]);
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
    return sendJSON(res, { success: true });
  }

  // ===== Meal Data =====
  if (url === '/api/meal-data' && method === 'GET') {
    const rows = db.prepare('SELECT * FROM meal_data ORDER BY date').all();
    return sendJSON(res, rows.map(r => ({
      ...r,
      menus: JSON.parse(r.menus || '[]'),
    })));
  }

  if (url === '/api/meal-data' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.date) return sendJSON(res, { error: 'date required' }, 400);
    const menus = JSON.stringify(body.menus || []);
    // upsert
    db.prepare(`
      INSERT INTO meal_data (date, menus) VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET menus = excluded.menus
    `).run(body.date, menus);
    return sendJSON(res, { success: true, date: body.date });
  }

  const mealMatch = url.match(/^\/api\/meal-data\/(.+)$/);
  if (mealMatch && method === 'DELETE') {
    const date = decodeURIComponent(mealMatch[1]);
    db.prepare('DELETE FROM meal_data WHERE date = ?').run(date);
    return sendJSON(res, { success: true });
  }

  // ===== Prompts =====
  if (url === '/api/prompts' && method === 'GET') {
    const rows = db.prepare('SELECT * FROM prompts ORDER BY id ASC').all();
    return sendJSON(res, rows);
  }

  if (url === '/api/prompts' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.id || !body.content) return sendJSON(res, { error: 'id and content required' }, 400);
    const existing = db.prepare('SELECT id FROM prompts WHERE id = ?').get(body.id);
    if (existing) return sendJSON(res, { error: 'id already exists' }, 409);
    db.prepare('INSERT INTO prompts (id, description, content, version, is_active) VALUES (?, ?, ?, ?, ?)')
      .run(body.id, body.description || '', body.content, body.version || '1.0', body.is_active ?? 1);
    const row = db.prepare('SELECT * FROM prompts WHERE id = ?').get(body.id);
    return sendJSON(res, row);
  }

  const promptMatch = url.match(/^\/api\/prompts\/(.+)$/);
  if (promptMatch && method === 'PUT') {
    const id = decodeURIComponent(promptMatch[1]);
    const body = await parseBody(req);
    const existing = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
    if (!existing) return sendJSON(res, { error: 'not found' }, 404);

    db.prepare('UPDATE prompts SET content = ?, version = ?, is_active = ? WHERE id = ?')
      .run(
        body.content ?? existing.content,
        body.version ?? existing.version,
        body.is_active ?? existing.is_active,
        id
      );

    const row = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
    return sendJSON(res, row);
  }

  if (promptMatch && method === 'DELETE') {
    const id = decodeURIComponent(promptMatch[1]);
    db.prepare('DELETE FROM prompts WHERE id = ?').run(id);
    return sendJSON(res, { success: true });
  }

  // API 404
  return sendJSON(res, { error: 'not found' }, 404);
}

// ========== Static File Server ==========

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
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
  return types[ext] || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      // API 라우팅
      if (req.url.startsWith('/api/')) {
        return handleAPI(req, res);
      }

      // 정적 파일 서빙
      let urlPath = req.url.split('?')[0];
      let filePath = path.join(BUILD_DIR, urlPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        filePath = path.join(BUILD_DIR, 'index.html');
      }

      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
      res.end(content);
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`로컬 서버 시작: http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

// ========== Electron ==========

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.8),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}/`);

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer]: ${message}`);
  });
};

app.whenReady().then(async () => {
  initDatabase();
  await startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
  if (db) db.close();
});
