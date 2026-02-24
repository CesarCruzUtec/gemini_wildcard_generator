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
 * Wildcards (SQLite, cursor-based pagination on rowid DESC — newest first):
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
const PORT = Number(process.env.PORT ?? 3001);
const isProd = process.env.NODE_ENV === 'production';
const DIST = path.join(process.cwd(), 'dist');
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
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_wildcards_list_text ON wildcards(list, text);
  CREATE TABLE IF NOT EXISTS wildcard_previews (
    id          TEXT PRIMARY KEY,
    wildcard_id TEXT NOT NULL REFERENCES wildcards(id),
    url         TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_wp_wildcard_id ON wildcard_previews(wildcard_id);
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

// Purge zero-cost sessions from previous page loads where nothing was generated.
// Safe to run unconditionally at startup: the current session is created later
// by the client, so every zero-amount session row here is genuinely stale.
db.prepare(`
  DELETE FROM costs
  WHERE type = 'session' AND (amount IS NULL OR amount = 0)
`).run();

// ── Config table ──────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
`);
db.prepare(`INSERT OR IGNORE INTO config (key, value) VALUES ('gallery_dir', '')`).run();
db.prepare(`INSERT OR IGNORE INTO config (key, value) VALUES ('api_key', '')`).run();

// ── Migrations ────────────────────────────────────────────────────────────────
// Drop the old position column and its index if they still exist from a prior schema.
try {
  db.exec('DROP INDEX IF EXISTS idx_wildcards_list_pos');
  db.exec('ALTER TABLE wildcards DROP COLUMN position');
} catch { /* already migrated or column never existed */ }

// Migrate existing preview_url values into the wildcard_previews table so that
// wildcards created before the multi-preview feature still show their thumbnail.
{
  const rows = db.prepare(
    "SELECT id, preview_url FROM wildcards WHERE preview_url IS NOT NULL AND preview_url != ''"
  ).all() as { id: string; preview_url: string }[];
  const insertPreview = db.prepare(
    'INSERT OR IGNORE INTO wildcard_previews (id, wildcard_id, url, created_at) VALUES (?, ?, ?, ?)'
  );
  db.transaction(() => {
    for (const w of rows) {
      const already = db.prepare('SELECT 1 FROM wildcard_previews WHERE wildcard_id = ? AND url = ?').get(w.id, w.preview_url);
      if (!already) insertPreview.run(crypto.randomUUID(), w.id, w.preview_url, Date.now());
    }
  })();
}

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
});

/** Fetch previewUrls for a list of wildcard IDs and return a lookup map. */
function fetchPreviewsMap(ids: string[]): Record<string, string[]> {
  if (ids.length === 0) return {};
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT wildcard_id, url FROM wildcard_previews WHERE wildcard_id IN (${placeholders}) ORDER BY created_at ASC`)
    .all(...ids) as { wildcard_id: string; url: string }[];
  const map: Record<string, string[]> = {};
  for (const r of rows) {
    if (!map[r.wildcard_id]) map[r.wildcard_id] = [];
    map[r.wildcard_id].push(r.url);
  }
  return map;
}

// ── GET /api/wildcards?list=&limit=&cursor=&q= ───────────────────────────────
// Cursor-based pagination on `rowid DESC` (newest inserted = first shown).
// `cursor` is the rowid of the last fetched row; next page uses `rowid < cursor`.
const MAX_LIMIT = 200;
app.get('/api/wildcards', (req, res) => {
  const list = req.query.list as string;
  if (!['generated', 'saved'].includes(list)) return res.status(400).json({ error: 'Invalid list' });

  const limit = Math.min(Number(req.query.limit) || 50, MAX_LIMIT);
  const cursor = req.query.cursor !== undefined && req.query.cursor !== '' ? Number(req.query.cursor) : null;
  const q = req.query.q ? `%${req.query.q}%` : '%';

  const rows = cursor !== null
    ? db.prepare('SELECT rowid, * FROM wildcards WHERE list = ? AND text LIKE ? AND rowid < ? ORDER BY rowid DESC LIMIT ?').all(list, q, cursor, limit)
    : db.prepare('SELECT rowid, * FROM wildcards WHERE list = ? AND text LIKE ? ORDER BY rowid DESC LIMIT ?').all(list, q, limit);

  const totalRow = db.prepare('SELECT COUNT(*) as total FROM wildcards WHERE list = ? AND text LIKE ?').get(list, q) as any;
  const total: number = totalRow?.total ?? 0;
  const ids = (rows as any[]).map((r) => r.id as string);
  const previewsMap = fetchPreviewsMap(ids);
  const items = (rows as any[]).map((r) => ({ ...rowToItem(r), previewUrls: previewsMap[r.id] ?? [] }));
  const nextCursor: number | null = rows.length > 0 ? (rows[rows.length - 1] as any).rowid : null;

  res.json({ items, total, nextCursor });
});

// ── POST /api/wildcards  (batch insert/upsert) ────────────────────────────────
app.post('/api/wildcards', (req, res) => {
  const { items } = req.body as { items: any[] };
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' });

  const stmtWildcard = db.prepare(
    'INSERT OR REPLACE INTO wildcards (id, text, list, preview_url, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const stmtPreview = db.prepare(
    'INSERT OR IGNORE INTO wildcard_previews (id, wildcard_id, url, created_at) VALUES (?, ?, ?, ?)'
  );
  db.transaction(() => {
    const now = Date.now();
    items.forEach((item) => {
      stmtWildcard.run(item.id, item.text, item.list, item.previewUrl ?? null, item.createdAt);
      // Also persist preview URLs so they survive a page reload.
      const previewUrls: string[] = Array.isArray(item.previewUrls) ? item.previewUrls : [];
      previewUrls.forEach((url: string) => {
        stmtPreview.run(crypto.randomUUID(), item.id, url, now);
      });
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

// ── POST /api/wildcards/:id/previews ─────────────────────────────────────────
app.post('/api/wildcards/:id/previews', (req, res) => {
  const { url } = req.body as { url: string };
  if (!url) return res.status(400).json({ error: 'Missing url' });
  const previewId = crypto.randomUUID();
  db.prepare('INSERT INTO wildcard_previews (id, wildcard_id, url, created_at) VALUES (?, ?, ?, ?)').run(previewId, req.params.id, url, Date.now());
  // Set preview_url on the wildcard only if it had none before
  db.prepare('UPDATE wildcards SET preview_url = COALESCE(preview_url, ?) WHERE id = ?').run(url, req.params.id);
  res.json({ ok: true });
});

// ── DELETE /api/wildcards/:id/previews ───────────────────────────────────────
app.delete('/api/wildcards/:id/previews', (req, res) => {
  const { url } = req.body as { url: string };
  if (!url) return res.status(400).json({ error: 'Missing url' });
  db.prepare('DELETE FROM wildcard_previews WHERE wildcard_id = ? AND url = ?').run(req.params.id, url);
  // Update preview_url to oldest remaining, or null if none left
  const next = db.prepare('SELECT url FROM wildcard_previews WHERE wildcard_id = ? ORDER BY created_at ASC LIMIT 1').get(req.params.id) as any;
  db.prepare('UPDATE wildcards SET preview_url = ? WHERE id = ?').run(next?.url ?? null, req.params.id);
  res.json({ ok: true });
});

// ── DELETE /api/wildcards/:id ─────────────────────────────────────────────────
app.delete('/api/wildcards/:id', (req, res) => {
  db.prepare('DELETE FROM wildcard_previews WHERE wildcard_id = ?').run(req.params.id);
  db.prepare('DELETE FROM wildcards WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── DELETE /api/wildcards?list= ───────────────────────────────────────────────
app.delete('/api/wildcards', (req, res) => {
  const list = req.query.list as string;
  if (!['generated', 'saved'].includes(list)) return res.status(400).json({ error: 'Invalid list' });
  // Remove previews for all wildcards in this list before deleting wildcards
  db.prepare(`
    DELETE FROM wildcard_previews WHERE wildcard_id IN (
      SELECT id FROM wildcards WHERE list = ?
    )
  `).run(list);
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
    db.prepare('DELETE FROM wildcard_previews').run();
    db.prepare('DELETE FROM wildcards').run();
    db.prepare('DELETE FROM costs').run();
    db.prepare(`INSERT INTO costs (id, type, label, amount, created_at) VALUES ('__total__', 'total', 'All-Time Total', 0, ?)`).run(Date.now());
    db.prepare(`UPDATE config SET value = '' WHERE key = 'api_key'`).run();
    db.prepare(`UPDATE config SET value = '' WHERE key = 'gallery_dir'`).run();
  })();
  res.json({ ok: true });
});

// ── Production: serve the Vite-built frontend ───────────────────────────────
if (isProd) {
  app.use(express.static(DIST));
  // SPA fallback — any route that isn't /api/* or /gallery-images/* returns index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  if (isProd) {
    console.log(`\n  App running → http://localhost:${PORT}`);
  } else {
    console.log(`Gallery + Wildcards server → http://localhost:${PORT}`);
  }
  console.log(`Gallery:  ${getGalleryDir() || '(not configured – set via Settings)'}`);
  console.log(`Database: ${DB_PATH}`);
});
