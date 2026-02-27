const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const http = require('http');
const fs = require('fs');
const Database = require('better-sqlite3');

// ========== 설정 ==========
const BUILD_DIR = path.join(__dirname, 'build');
const PORT = 3737;
const DB_PATH = path.join(app.getPath('userData'), 'meal-chart.db');

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
  `);

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
    const rows = db.prepare('SELECT * FROM categories ORDER BY created_at').all();
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
    db.prepare('UPDATE categories SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?')
      .run(body.name, body.color, id);
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
  const mainWindow = new BrowserWindow({
    width: 1536,
    height: 1032,
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
