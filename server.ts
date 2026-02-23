/**
 * Gallery + Wildcards Server
 *
 * Gallery:
 *   GET  /api/gallery              → JSON list of image filenames, newest first
 *   GET  /gallery-images/:f        → serves the image file
 *
 * Wildcards (SQLite):
 *   GET    /api/wildcards?list=generated|saved   → ordered list
 *   POST   /api/wildcards                        → batch create { items[] }
 *   PATCH  /api/wildcards/:id                    → update { list?, previewUrl? }
 *   DELETE /api/wildcards/:id                    → delete one
 *   DELETE /api/wildcards?list=generated|saved   → clear a list
 *   POST   /api/wildcards/reorder                → { list, ids[] } sets positions
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const app = express();
const PORT = 3001;
const GALLERY_DIR = '/mnt/data/ComfyUI/output';
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
`);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));
app.use(express.json());

// ── Gallery ───────────────────────────────────────────────────────────────────
app.get('/api/gallery', (_req, res) => {
  try {
    const files = fs.readdirSync(GALLERY_DIR)
      .filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(GALLERY_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .map(f => f.name);
    res.json({ files });
  } catch (err) {
    console.error('Gallery read error:', err);
    res.json({ files: [] });
  }
});

app.use('/gallery-images', express.static(GALLERY_DIR, { maxAge: 0 }));

// ── Wildcards helpers ─────────────────────────────────────────────────────────
const rowToItem = (r: any) => ({
  id: r.id,
  text: r.text,
  list: r.list as 'generated' | 'saved',
  previewUrl: r.preview_url ?? undefined,
  createdAt: r.created_at as number,
  position: r.position as number,
});

// ── GET /api/wildcards?list= ──────────────────────────────────────────────────
app.get('/api/wildcards', (req, res) => {
  const list = req.query.list as string;
  if (!['generated', 'saved'].includes(list)) return res.status(400).json({ error: 'Invalid list' });
  const rows = db.prepare('SELECT * FROM wildcards WHERE list = ? ORDER BY position ASC, created_at DESC').all(list);
  res.json((rows as any[]).map(rowToItem));
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

// ── POST /api/wildcards/reorder ───────────────────────────────────────────────
app.post('/api/wildcards/reorder', (req, res) => {
  const { list, ids } = req.body as { list: string; ids: string[] };
  const stmt = db.prepare('UPDATE wildcards SET position = ? WHERE id = ? AND list = ?');
  db.transaction(() => { ids.forEach((id, i) => stmt.run(i, id, list)); })();
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Gallery + Wildcards server → http://localhost:${PORT}`);
  console.log(`Images:   ${GALLERY_DIR}`);
  console.log(`Database: ${DB_PATH}`);
});
