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

    CREATE TABLE IF NOT EXISTS combos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS combo_items (
      combo_id INTEGER NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      PRIMARY KEY (combo_id, menu_item_id)
    );
  `);

  // ── AI 기능별 프롬프트 시드 ──────────────────────────────
  // 3가지 AI 기능: PLAN NOW (auto_gen) / 메뉴 추천 (menu_recommend) / 콤보 추천 (combo_suggest)
  // + 재료 자동 추천 (ingredient_suggest) — 단품 등록 모달에서 사용
  // 프롬프트 관리 UI 제거로 모든 프롬프트는 코드에서 직접 관리 (항상 최신 버전으로 갱신)
  const seedPrompts = [
    {
      id: "chat_base",
      description: "AI 기능 공통 시스템 지시문",
      content: "당신은 구내식당 식단 전문가입니다. 주어진 규칙과 데이터를 정확히 따라 요청한 형식으로만 응답하세요."
    },
    {
      id: "ingredient_suggest",
      description: "단품 메뉴 등록 시 재료 자동 추천 (ModalMenuRegistry)",
      content: "당신은 요리 전문가입니다. 메뉴 이름을 받으면 해당 요리의 주요 재료를 한국어로 나열합니다. 재료 이름만 쉼표로 구분하여 한 줄로 응답하세요. 다른 설명은 하지 마세요."
    },
    {
      // ── Feature 1: PLAN NOW ──────────────────────────────
      // 달력에서 날짜 선택 후 "Plan Now" 버튼 클릭 → 하루 식단 전체 자동 구성
      // CalendarTab.svelte: autoGenerateMeal() → askGemini(promptContextStr, ...)
      // 플레이스홀더: {frequencyData}, {availableMenusText}, {recentMealsText}
      id: "auto_gen",
      description: "AI 콤보 추천 — {count}가지 다양한 콤보 후보 제안 (기존 콤보 중복 금지)",
      content: `당신은 구내식당 식단 기획자입니다. 아래 메뉴 목록에서 서로 다른 {count}가지 콤보 식단을 제안해주세요.

## 가용한 메뉴 목록 (카테고리별)
{availableMenusText}

## 기존 등록된 콤보 (이 조합과 중복되면 안 됩니다)
{existingCombosText}

## 직전 7일 식단 이력 (맥락 참고 — 자주 나온 메뉴는 피하세요)
{recentMealsText}

## 콤보 구성 규칙
- 각 콤보는 반드시 **9개** 메뉴로 구성하세요 (밥 1 + 국/찌개 1 + 주메뉴 1~2 + 부메뉴 2~3 + 밑반찬 1~2 + 김치 1)
- {count}가지 콤보가 서로 최대한 다르게 구성되어야 합니다
- 기존 등록된 콤보와 동일하거나 매우 유사한 조합은 사용하지 마세요
- 위 "가용한 메뉴 목록"에 **정확히 존재하는 이름**만 사용하세요. 한 글자라도 다르면 안 됩니다

## 출력 형식 (반드시 준수, 다른 설명 없이)
[콤보1]
제목: [특징을 담은 짧은 제목, 12자 이내]
설명: [콤보 설명 한 줄, 40자 이내]
메뉴: 메뉴1, 메뉴2, 메뉴3, 메뉴4

[콤보2]
제목: ...
설명: ...
메뉴: ...

## 출력 예시
[콤보1]
제목: 든든한 한식 정식
설명: 단백질과 채소가 균형 잡힌 든든한 점심입니다.
메뉴: 쌀밥, 된장찌개, 제육볶음, 콩나물무침, 시금치나물, 멸치볶음, 계란말이, 깍두기, 배추김치

[콤보2]
제목: 가벼운 채식 런치
설명: 신선한 채소와 두부로 구성된 건강한 점심입니다.
메뉴: 잡곡밥, 미소국, 두부조림, 호박볶음, 무생채, 콩자반, 계란후라이, 배추김치, 깍두기`
    },
    {
      // ── Feature 1-B: AI 추천 3가지 선택 ─────────────────
      // 캘린더 빈 날 "AI 추천" 클릭 → 3가지 완성 식단 옵션 제공 → 사용자가 선택
      // CalendarTab.svelte: autoGenerateMealOptions() → 플레이스홀더 동일
      id: "day_plan_options",
      description: "AI 추천 선택형 — 하루 식단 후보 3가지 제안, 사용자가 1가지 선택",
      content: `당신은 구내식당 영양사입니다. 오늘 점심 식단 후보 3가지를 제안해주세요.

## 카테고리별 구성 규칙 (각 옵션 동일 적용)
- 밥 카테고리: 1개
- 국/찌개 카테고리: 1개
- 주메뉴 카테고리: 1~2개
- 부메뉴 카테고리: 2~3개
- 밑반찬 카테고리: 2~3개
- 김치/기타 카테고리: 1개
※ 총합이 반드시 8개. 3가지 옵션이 서로 최대한 다르게 구성하세요.

## 메뉴 추천 점수
{frequencyData}

## 가용한 메뉴 목록 (카테고리별)
{availableMenusText}

## 직전 7일 식단 이력 (맥락 참고)
{recentMealsText}

## 절대 규칙
1. 위 "가용한 메뉴 목록"에 **정확히 존재하는 이름**만 사용하세요.
2. 각 옵션은 반드시 8개 메뉴로 구성하세요.
3. 0점 메뉴는 절대 선택하지 마세요.
4. 각 옵션에 특징을 담은 짧은 제목(8자 이내)을 괄호 안에 넣어 다음 형식으로만 출력하세요. 다른 설명 없이.

옵션A (깔끔한 한식): 메뉴1, 메뉴2, 메뉴3, 메뉴4, 메뉴5, 메뉴6, 메뉴7, 메뉴8
옵션B (든든한 단백질): 메뉴1, 메뉴2, 메뉴3, 메뉴4, 메뉴5, 메뉴6, 메뉴7, 메뉴8
옵션C (가볍고 건강하게): 메뉴1, 메뉴2, 메뉴3, 메뉴4, 메뉴5, 메뉴6, 메뉴7, 메뉴8`
    },
    {
      // ── Feature 2: 메뉴 추천 ────────────────────────────
      // Inventory(메뉴 리스트) 화면에서 "AI 메뉴 추천" 버튼 클릭
      // 최근 식단 이력을 기반으로 다음 식단에 넣을 단품 메뉴 추천
      // mealService.ts: recommendMenus() → 플레이스홀더: {availableMenusText}, {recentMealsText}
      id: "menu_recommend",
      description: "메뉴 추천 — 최근 이력 기반으로 다음 식단에 포함하면 좋을 단품 메뉴 5~8개 추천",
      content: `당신은 구내식당 식단 전문가입니다. 다음 메뉴 목록과 최근 식단 이력을 참고해서, 다음 식단에 포함하면 좋을 메뉴들을 추천해주세요.

## 가용한 메뉴 목록 (카테고리별)
{availableMenusText}

## 최근 식단 이력
{recentMealsText}

## 추천 규칙
1. 위 "가용한 메뉴 목록"에 **정확히 존재하는 이름**만 사용하세요.
2. 최근에 자주 등장한 메뉴는 피하고, 오랫동안 나오지 않은 메뉴를 우선 추천하세요.
3. 밥·국·주메뉴·반찬 등 카테고리 균형을 맞춰 추천하세요.
4. 총 5~8개의 메뉴를 추천하세요.
5. 메뉴 이름만 쉼표(,)로 구분하여 한 줄로 출력하세요. 설명 없이.

출력 예시: 잡곡밥, 된장찌개, 제육볶음, 시금치나물, 깍두기, 콩자반`
    },
    {
      // ── Feature 3: 콤보 추천 ────────────────────────────
      // Inventory(메뉴 리스트) 화면에서 "AI 콤보 추천" 버튼 클릭
      // 단품 메뉴 목록에서 함께 제공하면 좋을 조합을 콤보로 제안
      // mealService.ts: suggestCombos() → 플레이스홀더: {availableMenusText}
      id: "combo_suggest",
      description: "콤보 추천 — 단품 메뉴 목록에서 영양 균형 잡힌 콤보 세트 2~3가지 제안",
      content: `당신은 구내식당 식단 기획자입니다. 아래 단품 메뉴 목록에서 함께 제공하면 영양과 맛의 균형이 잡힌 콤보 세트를 제안해주세요.

## 가용한 단품 메뉴 목록 (카테고리별)
{availableMenusText}

## 콤보 구성 규칙
1. 위 목록에 **정확히 존재하는 이름**만 사용하세요.
2. 하나의 콤보는 밥 1 + 국/찌개 1 + 주메뉴 또는 부메뉴 1~2 + 반찬 1~2 구성으로, 3~5개 메뉴를 포함하세요.
3. 영양 균형(탄수화물·단백질·채소)과 맛의 조화를 고려하세요.
4. 총 2~3개의 콤보를 제안하세요.

## 출력 형식 (반드시 준수)
각 콤보를 다음 형식으로 출력하세요. 다른 설명은 하지 마세요.
[콤보명]: 메뉴A, 메뉴B, 메뉴C

출력 예시:
[든든한 한식 세트]: 쌀밥, 된장찌개, 제육볶음, 시금치나물, 배추김치
[가벼운 정식]: 잡곡밥, 맑은국, 두부조림, 콩나물무침, 깍두기`
    }
  ];

  // 모든 프롬프트를 항상 최신 코드 버전으로 갱신 (프롬프트 편집 UI 제거됨)
  const upsertPrompt = db.prepare(`
    INSERT INTO prompts (id, description, content)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET content = excluded.content, description = excluded.description
  `);
  for (const p of seedPrompts) {
    upsertPrompt.run(p.id, p.description, p.content);
  }

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
  // DB가 닫혀있으면 재초기화
  if (!db || !db.open) {
    try { initDatabase(); } catch (e) {
      return sendJSON(res, { error: 'Database initialization failed' }, 500);
    }
  }

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

  // ===== Combos =====
  if (url === '/api/combos' && method === 'GET') {
    const combos = db.prepare('SELECT * FROM combos ORDER BY created_at').all();
    const result = combos.map(combo => {
      const itemRows = db.prepare(`
        SELECT mi.* FROM menu_items mi
        JOIN combo_items ci ON ci.menu_item_id = mi.id
        WHERE ci.combo_id = ?
      `).all(combo.id);
      return {
        ...combo,
        items: itemRows.map(r => ({ ...r, ingredients: JSON.parse(r.ingredients || '[]') }))
      };
    });
    return sendJSON(res, result);
  }

  if (url === '/api/combos' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.name) return sendJSON(res, { error: 'name required' }, 400);
    const result = db.prepare('INSERT INTO combos (name, description) VALUES (?, ?)').run(
      body.name, body.description || ''
    );
    const comboId = result.lastInsertRowid;
    if (Array.isArray(body.item_ids)) {
      const insertItem = db.prepare('INSERT OR IGNORE INTO combo_items (combo_id, menu_item_id) VALUES (?, ?)');
      for (const itemId of body.item_ids) insertItem.run(comboId, itemId);
    }
    const combo = db.prepare('SELECT * FROM combos WHERE id = ?').get(comboId);
    const items = db.prepare(`
      SELECT mi.* FROM menu_items mi JOIN combo_items ci ON ci.menu_item_id = mi.id WHERE ci.combo_id = ?
    `).all(comboId);
    return sendJSON(res, { ...combo, items: items.map(r => ({ ...r, ingredients: JSON.parse(r.ingredients || '[]') })) }, 201);
  }

  const comboMatch = url.match(/^\/api\/combos\/(\d+)$/);
  if (comboMatch && method === 'PUT') {
    const id = parseInt(comboMatch[1]);
    const body = await parseBody(req);
    const existing = db.prepare('SELECT * FROM combos WHERE id = ?').get(id);
    if (!existing) return sendJSON(res, { error: 'not found' }, 404);
    db.prepare('UPDATE combos SET name = ?, description = ?, is_active = ? WHERE id = ?').run(
      body.name ?? existing.name,
      body.description ?? existing.description,
      body.is_active ?? existing.is_active,
      id
    );
    if (Array.isArray(body.item_ids)) {
      db.prepare('DELETE FROM combo_items WHERE combo_id = ?').run(id);
      const insertItem = db.prepare('INSERT OR IGNORE INTO combo_items (combo_id, menu_item_id) VALUES (?, ?)');
      for (const itemId of body.item_ids) insertItem.run(id, itemId);
    }
    const combo = db.prepare('SELECT * FROM combos WHERE id = ?').get(id);
    const items = db.prepare(`
      SELECT mi.* FROM menu_items mi JOIN combo_items ci ON ci.menu_item_id = mi.id WHERE ci.combo_id = ?
    `).all(id);
    return sendJSON(res, { ...combo, items: items.map(r => ({ ...r, ingredients: JSON.parse(r.ingredients || '[]') })) });
  }

  if (comboMatch && method === 'DELETE') {
    const id = parseInt(comboMatch[1]);
    db.prepare('DELETE FROM combos WHERE id = ?').run(id);
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
    // macOS: DB가 닫혀있으면 재초기화
    if (!db || !db.open) initDatabase();
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
  // macOS에서는 앱이 살아있으므로 DB를 닫지 않음
});
