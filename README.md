<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Gemini Wildcard Generator

Generate, refine, and manage AI prompt wildcards powered by the Gemini API. Wildcards are stored in a local SQLite database and can have gallery image previews attached to them.

**Prerequisites:** [Node.js](https://nodejs.org) (v20+)

---

## Just want to run it?

No development tools needed — build once, then start with a single command.

```bash
# 1. Install dependencies
npm install

# 2. Build the frontend (only needed once, and again after pulling updates)
npm run build

# 3. Start the app
npm start
```

Open **http://localhost:3001** in your browser.

On first launch, open **Settings** (top-right gear icon) to configure:
- **Gemini API Key** — get one at [aistudio.google.com](https://aistudio.google.com)
- **Gallery folder** — absolute path to a local folder of images to use as wildcard previews (optional)

Your wildcards and settings are saved in a `wildcards.db` file in the project folder.

> To use a different port: `PORT=8080 npm start`

---

## Developing

Two terminals are required — one for the Express API server and one for the Vite dev server with hot reload.

```bash
# Install dependencies
npm install

# Terminal 1 — API + database server (port 3001)
npm run server

# Terminal 2 — Vite frontend with HMR (port 3000)
npm run dev
```

Open **http://localhost:3000** in your browser. The Vite dev server proxies all `/api/*` and `/gallery-images/*` requests to the Express server on port 3001.

### Project structure

```
server.ts          # Express API — wildcards, gallery, costs, config (SQLite)
src/
  App.tsx          # Root component
  components/      # UI components (WildcardCard, WildcardList, modals, …)
  hooks/           # useWildcardList, useDebounce, useLocalStorage
  api/             # dbApi — typed wrappers around fetch calls to the server
  utils/           # cn helper
wildcards.db       # Auto-created SQLite database (gitignored)
```

### Useful scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR (port 3000) |
| `npm run server` | Express API server (port 3001) |
| `npm run build` | Build frontend to `dist/` |
| `npm start` | Production — serves frontend + API on port 3001 |
| `npm run lint` | TypeScript type-check |
| `npm run clean` | Delete `dist/` |

