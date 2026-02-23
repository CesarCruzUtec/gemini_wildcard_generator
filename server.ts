/**
 * Gallery Server
 * Exposes images from the ComfyUI output directory over HTTP so the browser can read them.
 *
 * GET /api/gallery         → JSON list of image filenames, newest first
 * GET /gallery-images/:f   → serves the actual image file
 */

import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;
const GALLERY_DIR = '/mnt/data/ComfyUI/output';
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif']);

// Allow browser fetches from the Vite dev server origin
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/api/gallery', (_req, res) => {
  try {
    const files = fs.readdirSync(GALLERY_DIR)
      .filter(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .map(f => ({
        name: f,
        mtime: fs.statSync(path.join(GALLERY_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .map(f => f.name);

    res.json({ files });
  } catch (err) {
    console.error('Gallery read error:', err);
    res.json({ files: [] });
  }
});

app.use('/gallery-images', express.static(GALLERY_DIR, { maxAge: 0 }));

app.listen(PORT, () => {
  console.log(`Gallery server → http://localhost:${PORT}`);
  console.log(`Serving images from: ${GALLERY_DIR}`);
});
