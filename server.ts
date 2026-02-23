/**
 * Gallery + Wildcards + Costs + Config Server
 *
 * Config (SQLite):
 *   GET   /api/config               → { galleryDir, apiKey }
 *   PATCH /api/config               → { galleryDir?, apiKey? }
 *
 * Gallery:
 *   GET  /api/gallery              → JSON list of image filenames, newest first
 *   GET  /gallery-images/:f        → serves the image file
 *
 * Wildcards (SQLite, cursor-based pagination):
 *   GET    /api/wildcards?list=&limit=50&cursor=&q=  → { items[], total, nextCursor }
 *   POST   /api/wildcards                            → batch create { items[] }
 *   PATCH  /api/wildcards/:id                        → update { list?, previewUrl? }
 *   DELETE /api/wildcards/:id                        → delete one
 *   DELETE /api/wildcards?list=generated|saved       → clear a list
 *
 * Costs (SQLite):
 *   GET   /api/costs                → { total: number, sessions: Session[] }
 *   POST  /api/costs/session        → create session row → { id }
 *   PATCH /api/costs/session/:id    → { amount } update running session total
 *   PATCH /api/costs/total          → { delta } add to all-time total
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const app = express();
const PORT = 3001;
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);
const DB_PATH = path.join(process.cwd(), 'wildcards.db');

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS wildcards (
    id          TEXT PRIMARY KEY,
    text        TEXT NOT NULL,
    list        TEXT NOT NULL CHECK(list IN ('generated', 'saved')),
    preview_url TEXT,
    position    REAL NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_wildcards_list_pos  ON wildcards(list, position ASC);
  CREATE INDEX IF NOT EXISTS idx_wildcards_list_text ON wildcards(list, text);
  CREATE TABLE IF NOT EXISTS costs (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL CHECK(type IN ('session', 'total')),
    label      TEXT,
    amount     REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

// Ensure the persistent all-time total row exists
db.prepare(`
  INSERT OR IGNORE INTO costs (id, type, label, amount, created_at)
  VALUES ('__total__', 'total', 'All-Time Total', 0, ?)
`).run(Date.now());

// ── Config table ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
`);
db.prepare(`INSERT OR IGNORE INTO config (key, value) VALUES ('gallery_dir', '')`).run();
db.prepare(`INSERT OR IGNORE INTO config (key, value) VALUES ('api_key', '')`).run();

function getConfigValue(key: string): string {
  const row = db.prepare(`SELECT value FROM config WHERE key = ?`).get(key) as any;
  return (row?.value as string) ?? '';
}
const getGalleryDir = () => getConfigValue('gallery_dir');
const getApiKey = () => getConfigValue('api_key');

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));
app.use(express.json());

// ── GET /api/config ──────────────────────────────────────────────────────────
app.get('/api/config', (_req, res) => {
  res.json({ galleryDir: getGalleryDir(), apiKey: getApiKey() });
});

// ── PATCH /api/config ─────────────────────────────────────────────────────────
app.patch('/api/config', (req, res) => {
  const { galleryDir, apiKey } = req.body as { galleryDir?: string; apiKey?: string };
  if (galleryDir !== undefined) {
    db.prepare(`INSERT OR REPLACE INTO config (key, value) VALUES ('gallery_dir', ?)`).run(galleryDir);
  }
  if (apiKey !== undefined) {
    db.prepare(`INSERT OR REPLACE INTO config (key, value) VALUES ('api_key', ?)`).run(apiKey);
  }
  res.json({ ok: true });
});

// ── GET /api/gallery ──────────────────────────────────────────────────────────
// Files modified within this window may still be partially written by the generator
const WRITE_SETTLE_MS = 2500;

app.get('/api/gallery', (_req, res) => {
  const dir = getGalleryDir();
  if (!dir) return res.json({ files: [] });
  try {
    const now = Date.now();
    const files = fs.readdirSync(dir)
      .filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .map(f => { const stat = fs.statSync(path.join(dir, f)); return { name: f, mtime: stat.mtimeMs, size: stat.size }; })
      .filter(f => now - f.mtime > WRITE_SETTLE_MS) // skip files still being written
      .sort((a, b) => b.mtime - a.mtime)
      .map(f => f.name);
    res.json({ files });
  } catch (err) {
    console.error('Gallery read error:', err);
    res.json({ files: [] });
  }
});

// ── GET /gallery-images/:filename ─────────────────────────────────────────────
app.get('/gallery-images/:filename', (req, res) => {
  const dir = getGalleryDir();
  if (!dir) return res.status(404).json({ error: 'Gallery not configured' });
  const filePath = path.resolve(dir, req.params.filename);
  if (!filePath.startsWith(path.resolve(dir))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Prevent browser from caching partially-written images
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(filePath);
});

// ── Wildcards helpers ─────────────────────────────────────────────────────────
const rowToItem = (r: any) => ({
  id: r.id,
  text: r.text,
  list: r.list as 'generated' | 'saved',
  previewUrl: r.preview_url ?? undefined,
  createdAt: r.created_at as number,
  position: r.position as number,
});

// ── GET /api/wildcards?list=&limit=&cursor=&q= ───────────────────────────────
// Cursor-based pagination on `position`. New items are prepended at positions
// below the cursor, so `position > cursor` never includes them on the next page.
const MAX_LIMIT = 200;
app.get('/api/wildcards', (req, res) => {
  const list = req.query.list as string;
  if (!['generated', 'saved'].includes(list)) return res.status(400).json({ error: 'Invalid list' });

  const limit = Math.min(Number(req.query.limit) || 50, MAX_LIMIT);
  const cursor = req.query.cursor !== undefined && req.query.cursor !== '' ? Number(req.query.cursor) : null;
  const q = req.query.q ? `%${req.query.q}%` : '%';

  const rows = cursor !== null
    ? db.prepare('SELECT * FROM wildcards WHERE list = ? AND text LIKE ? AND position > ? ORDER BY position ASC LIMIT ?').all(list, q, cursor, limit)
    : db.prepare('SELECT * FROM wildcards WHERE list = ? AND text LIKE ? ORDER BY position ASC LIMIT ?').all(list, q, limit);

  const totalRow = db.prepare('SELECT COUNT(*) as total FROM wildcards WHERE list = ? AND text LIKE ?').get(list, q) as any;
  const total: number = totalRow?.total ?? 0;
  const items = (rows as any[]).map(rowToItem);
  const nextCursor: number | null = items.length > 0 ? items[items.length - 1].position : null;

  res.json({ items, total, nextCursor });
});

// ── POST /api/wildcards  (batch insert/upsert) ────────────────────────────────
app.post('/api/wildcards', (req, res) => {
  const { items } = req.body as { items: any[] };
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' });

  const list = items[0].list as string;
  const minRow = db.prepare('SELECT MIN(position) as min FROM wildcards WHERE list = ?').get(list) as any;
  const minPos: number = minRow?.min ?? 0;
  const startPos = minPos - items.length;

  const stmt = db.prepare(
    'INSERT OR REPLACE INTO wildcards (id, text, list, preview_url, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  db.transaction(() => {
    items.forEach((item, i) => {
      stmt.run(item.id, item.text, item.list, item.previewUrl ?? null, startPos + i, item.createdAt);
    });
  })();
  res.json({ ok: true });
});

// ── PATCH /api/wildcards/:id ──────────────────────────────────────────────────
app.patch('/api/wildcards/:id', (req, res) => {
  const { id } = req.params;
  const { list, previewUrl } = req.body;
  if (list !== undefined) db.prepare('UPDATE wildcards SET list = ? WHERE id = ?').run(list, id);
  if ('previewUrl' in req.body) db.prepare('UPDATE wildcards SET preview_url = ? WHERE id = ?').run(previewUrl ?? null, id);
  res.json({ ok: true });
});

// ── DELETE /api/wildcards/:id ─────────────────────────────────────────────────
app.delete('/api/wildcards/:id', (req, res) => {
  db.prepare('DELETE FROM wildcards WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── DELETE /api/wildcards?list= ───────────────────────────────────────────────
app.delete('/api/wildcards', (req, res) => {
  const list = req.query.list as string;
  if (!['generated', 'saved'].includes(list)) return res.status(400).json({ error: 'Invalid list' });
  db.prepare('DELETE FROM wildcards WHERE list = ?').run(list);
  res.json({ ok: true });
});


// ── GET /api/costs ────────────────────────────────────────────────────────────
app.get('/api/costs', (_req, res) => {
  const total = (db.prepare(`SELECT amount FROM costs WHERE id = '__total__'`).get() as any)?.amount ?? 0;
  const sessions = db.prepare(`SELECT * FROM costs WHERE type = 'session' ORDER BY created_at DESC LIMIT 50`).all();
  res.json({ total, sessions });
});

// ── POST /api/costs/session ───────────────────────────────────────────────────
app.post('/api/costs/session', (req, res) => {
  const { label } = req.body as { label: string };
  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare(`INSERT INTO costs (id, type, label, amount, created_at) VALUES (?, 'session', ?, 0, ?)`)
    .run(id, label, now);
  res.json({ id });
});

// ── PATCH /api/costs/session/:id ─────────────────────────────────────────────
app.patch('/api/costs/session/:id', (req, res) => {
  const { amount } = req.body as { amount: number };
  db.prepare(`UPDATE costs SET amount = ? WHERE id = ? AND type = 'session'`).run(amount, req.params.id);
  res.json({ ok: true });
});

// ── PATCH /api/costs/total ────────────────────────────────────────────────────
app.patch('/api/costs/total', (req, res) => {
  const { delta } = req.body as { delta: number };
  db.prepare(`UPDATE costs SET amount = amount + ? WHERE id = '__total__'`).run(delta);
  res.json({ ok: true });
});

// ── POST /api/db/reset ────────────────────────────────────────────────────────
app.post('/api/db/reset', (_req, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM wildcards').run();
    db.prepare('DELETE FROM costs').run();
    db.prepare(`INSERT INTO costs (id, type, label, amount, created_at) VALUES ('__total__', 'total', 'All-Time Total', 0, ?)`).run(Date.now());
    db.prepare(`UPDATE config SET value = '' WHERE key = 'api_key'`).run();
    db.prepare(`UPDATE config SET value = '' WHERE key = 'gallery_dir'`).run();
  })();
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Gallery + Wildcards server → http://localhost:${PORT}`);
  console.log(`Gallery:  ${getGalleryDir() || '(not configured – set via Settings)'}`);
  console.log(`Database: ${DB_PATH}`);
});
