# SQLite Migration + FTS + History + Favorites — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static JSON partition architecture with SQLite-based API server; add full-text search, history, and favorites.

**Architecture:** Express server with better-sqlite3 replaces static-file-serving; history/favorites live in localStorage; build pipeline generates single `fjalor.db` instead of 65MB JSON partitions.

**Tech Stack:** Express, better-sqlite3, SQLite FTS5, React (client), Docker (Node.js 22)

---

## Chunk 1: Dependencies + Build DB

### Task 1: Add new dependencies

**Files:**
- Modify: `package.json`
- Run: `npm install`

- [ ] **Step 1: Install packages**

```bash
npm install express better-sqlite3
npm install -D @types/express @types/better-sqlite3
```

- [ ] **Step 2: Verify install**

```bash
node -e "require('express'); require('better-sqlite3'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add express + better-sqlite3 deps"
```

---

### Task 2: Create build-db.ts — replaces preprocess.ts

**Files:**
- Create: `src/scripts/build-db.ts`
- Delete: `src/scripts/preprocess.ts`

Build-db.ts reads `data/dictionary.json`, creates `src/data/gen/fjalor.db` with:
- `entries` table (id, term, slug, attrs JSON, defs JSON)
- `stems` table (entry_id, stem)
- `entries_fts` virtual table (FTS5 on term + defs)
- Batch inserts, FTS rebuild, VACUUM

- [ ] **Step 1: Write build-db.ts**

```typescript
import path from 'node:path';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';

interface ScrapedEntry {
  term: string;
  definition: string[];
  exact_term?: string;
  skip?: boolean;
}

interface Entry {
  term: string;
  attributes: string[];
  definitions: string[];
  stems: string[];
  slug: string;
}

const DATA_DIR = path.resolve(import.meta.dirname, '../../data');
const GEN_DIR = path.resolve(import.meta.dirname, '../../src/data/gen');
const DB_PATH = path.join(GEN_DIR, 'fjalor.db');

function getStems(word: string): string[] {
  const normalized = word
    .toLowerCase()
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c');
  return [...new Set(normalized.split(/\s+/).filter(s => /^[a-z]+$/.test(s)))];
}

function getSlug(word: string): string {
  return word
    .toLowerCase()
    .replace(/ë/g, 'ee')
    .replace(/ç/g, 'cc')
    .split(/\s+/)
    .filter(Boolean)
    .join('-');
}

function scrapedEntryToEntry(raw: ScrapedEntry): Entry {
  const parts = raw.term.split(/\s+/).filter(Boolean);
  const attrs: string[] = [];
  const rest: string[] = [];
  for (const p of parts) {
    if (p.endsWith('.')) attrs.push(p);
    else rest.push(p);
  }
  const term = rest.join(' ') || parts[0];
  let defs = raw.definition.map(d => d.trim());
  if (defs.length > 1) {
    defs = defs.map(d => d.replace(/^\d+\.\s*/, ''));
  }
  return {
    term,
    attributes: attrs,
    definitions: defs,
    stems: getStems(term),
    slug: getSlug(term),
  };
}

function readJSON<T>(fp: string): T {
  return JSON.parse(readFileSync(fp, 'utf-8'));
}

function build() {
  if (!existsSync(GEN_DIR)) mkdirSync(GEN_DIR, { recursive: true });

  const rawEntries: ScrapedEntry[] = readJSON(path.join(DATA_DIR, 'dictionary.json'));
  const db = new Database(DB_PATH);

  // Performance PRAGMAs for bulk insert
  db.pragma('synchronous = OFF');
  db.pragma('journal_mode = MEMORY');
  db.pragma('cache_size = -8000');
  db.pragma('temp_store = MEMORY');

  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      term  TEXT NOT NULL,
      slug  TEXT NOT NULL UNIQUE,
      attrs TEXT NOT NULL,
      defs  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_slug ON entries(slug);

    CREATE TABLE IF NOT EXISTS stems (
      entry_id INTEGER NOT NULL REFERENCES entries(id),
      stem     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stem ON stems(stem);

    CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
      term, defs, content='entries', content_rowid='id',
      tokenize='unicode61'
    );
  `);

  const insertEntry = db.prepare(
    'INSERT INTO entries (term, slug, attrs, defs) VALUES (?, ?, ?, ?)'
  );
  const insertStem = db.prepare(
    'INSERT INTO stems (entry_id, stem) VALUES (?, ?)'
  );

  const seen = new Set<string>();
  let deduped = 0;

  const insertBatch = db.transaction(() => {
    for (const raw of rawEntries) {
      if (raw.skip) continue;
      const entry = scrapedEntryToEntry(raw);
      const key = `${entry.term}|${entry.definitions.join('|')}`;
      if (seen.has(key)) { deduped++; continue; }
      seen.add(key);

      const info = insertEntry.run(
        entry.term,
        entry.slug,
        JSON.stringify(entry.attributes),
        JSON.stringify(entry.definitions)
      );
      const entryId = info.lastInsertRowid as number;
      for (const stem of entry.stems) {
        insertStem.run(entryId, stem);
      }
    }
  });

  insertBatch();
  console.log(`Entries: ${seen.size}, deduped: ${deduped}`);

  // Rebuild FTS index
  db.exec("INSERT INTO entries_fts(entries_fts) VALUES('rebuild')");

  // Optimize FTS index
  db.exec("INSERT INTO entries_fts(entries_fts) VALUES('optimize')");

  db.pragma('synchronous = FULL');
  db.pragma('journal_mode = WAL');
  db.exec('VACUUM');
  db.close();

  const stats = readFileSync(DB_PATH);
  console.log(`DB size: ${(stats.length / 1024 / 1024).toFixed(1)} MB`);
}

build();
```

- [ ] **Step 2: Remove old preprocess.ts**

```bash
rm src/scripts/preprocess.ts
```

- [ ] **Step 3: Run build-db.ts to verify**

```bash
npx tsx src/scripts/build-db.ts
```
Expected: `Entries: 37381, deduped: ...`
Expected: `DB size: ~14 MB`
Expected file: `src/data/gen/fjalor.db`

- [ ] **Step 4: Verify DB contents**

```bash
sqlite3 src/data/gen/fjalor.db "SELECT COUNT(*) FROM entries; SELECT COUNT(*) FROM stems;"
```
Expected: `37381` then `...` (stems count, typically 3-4x entries)

- [ ] **Step 5: Verify FTS5 works**

```bash
sqlite3 src/data/gen/fjalor.db "SELECT count(*) FROM entries_fts WHERE entries_fts MATCH 'fjalor';"
```
Expected: >0 results

- [ ] **Step 6: Commit**

```bash
git add src/scripts/build-db.ts package.json package-lock.json
git rm src/scripts/preprocess.ts
git commit -m "feat: replace preprocess.ts with build-db.ts (SQLite)"
```

---

### Task 3: Update package.json scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update prebuild script**

Change `"prebuild": "NODE_ENV=production npx tsx src/scripts/preprocess.ts"` to:
```
"prebuild": "NODE_ENV=production npx tsx src/scripts/build-db.ts"
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: update prebuild to run build-db.ts"
```

---

## Chunk 2: API Server + Build Pipeline

### Task 4: Create server.mjs

**Files:**
- Create: `server.mjs`

Server serves static files from `dist/` and provides API endpoints backed by SQLite.

- [ ] **Step 1: Write server.mjs**

```js
import express from 'express';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_PATH = path.join(__dirname, 'dist', 'api', 'fjalor.db');

const db = new Database(DB_PATH, { readonly: true });
db.pragma('journal_mode = WAL');

const app = express();

// API: Word by slug
app.get('/api/word/:slug', (req, res) => {
  const row = db.prepare('SELECT slug, term, attrs, defs FROM entries WHERE slug = ?').get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({
    slug: row.slug,
    term: row.term,
    attributes: JSON.parse(row.attrs),
    definitions: JSON.parse(row.defs),
  });
});

// API: Search (prefix + fulltext)
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json({ prefix: [], fulltext: [] });

  const stems = q.toLowerCase()
    .replace(/ë/g, 'e').replace(/ç/g, 'c')
    .split(/\s+/).filter(s => /^[a-z]+$/.test(s));

  // Prefix search via stems (current behavior: ALL stems must match)
  let prefixResult = [];
  if (stems.length > 0) {
    const placeholders = stems.map(() => '?').join(', ');
    const rows = db.prepare(`
      SELECT e.slug, e.term, e.attrs, e.defs, COUNT(*) as stem_matches
      FROM entries e
      JOIN stems s ON s.entry_id = e.id
      WHERE s.stem IN (${placeholders})
      GROUP BY e.id
      HAVING stem_matches = ?
      LIMIT 10
    `).all(...stems, stems.length);
    prefixResult = rows.map(r => ({
      slug: r.slug, term: r.term,
      attributes: JSON.parse(r.attrs),
      definitions: JSON.parse(r.defs),
    }));
  }

  // Full-text search via FTS5
  let ftsResult = [];
  try {
    const ftsQuery = stems.map(s => `"${s}"`).join(' AND ');
    const rows = db.prepare(`
      SELECT e.slug, e.term, e.attrs, e.defs
      FROM entries_fts f
      JOIN entries e ON e.id = f.rowid
      WHERE entries_fts MATCH ?
      LIMIT 10
    `).all(ftsQuery);
    ftsResult = rows.map(r => ({
      slug: r.slug, term: r.term,
      attributes: JSON.parse(r.attrs),
      definitions: JSON.parse(r.defs),
    }));
  } catch {
    // Invalid FTS query — return empty
  }

  res.json({ prefix: prefixResult, fulltext: ftsResult });
});

// API: Autocomplete suggestions
app.get('/api/suggest', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q || q.length < 2) return res.json([]);

  const stem = q.toLowerCase().replace(/ë/g, 'e').replace(/ç/g, 'c');
  const rows = db.prepare(`
    SELECT DISTINCT e.term, e.slug FROM entries e
    JOIN stems s ON s.entry_id = e.id
    WHERE s.stem LIKE ?
    ORDER BY e.term
    LIMIT 8
  `).all(stem + '%');
  res.json(rows);
});

// Static files
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

- [ ] **Step 2: Install express + better-sqlite3 (already done in Task 1)**

- [ ] **Step 3: Test server starts**

```bash
# Quick syntax check
node --check server.mjs
```
Expected: no output (no errors)

- [ ] **Step 4: Commit**

```bash
git add server.mjs
git commit -m "feat: add Express API server with SQLite"
```

---

### Task 5: Update build pipeline scripts

**Files:**
- Modify: `src/scripts/build.mjs`
- Modify: `src/scripts/copy-api.mjs`
- Modify: `src/scripts/ssg.mjs`

- [ ] **Step 1: Simplify copy-api.mjs**

```js
import fs from 'node:fs';
import path from 'node:path';

const GEN_DIR = path.resolve(import.meta.dirname, '../src/data/gen');
const PUBLIC_API = path.resolve(import.meta.dirname, '../public/api');

if (!fs.existsSync(PUBLIC_API)) fs.mkdirSync(PUBLIC_API, { recursive: true });

// Copy the SQLite DB
const src = path.join(GEN_DIR, 'fjalor.db');
const dest = path.join(PUBLIC_API, 'fjalor.db');
fs.cpSync(src, dest, { force: true });
console.log('Copied fjalor.db → public/api/');
```

- [ ] **Step 2: Simplify build.mjs**

```js
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Step 1: Vite build
execSync('npx vite build', { stdio: 'inherit' });

// Step 2: Copy DB
const GEN_DIR = path.resolve(import.meta.dirname, '../src/data/gen');
const DIST_API = path.resolve(import.meta.dirname, '../dist/api');
if (!fs.existsSync(DIST_API)) fs.mkdirSync(DIST_API, { recursive: true });
fs.cpSync(path.join(GEN_DIR, 'fjalor.db'), path.join(DIST_API, 'fjalor.db'), { force: true });

// Step 3: SSG
execSync('node src/scripts/ssg.mjs', { stdio: 'inherit' });
```

- [ ] **Step 3: Update ssg.mjs to read from SQLite instead of slugDictionary.json**

```js
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const GEN_DIR = path.resolve(import.meta.dirname, '../src/data/gen');
const DIST_DIR = path.resolve(import.meta.dirname, '../dist');
const DB_PATH = path.join(GEN_DIR, 'fjalor.db');

const db = new Database(DB_PATH, { readonly: true });

// Read all entries
const entries = db.prepare('SELECT slug, term, attrs, defs FROM entries ORDER BY slug').all();

// Read HTML template
const template = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');

const pages = [];
for (const entry of entries) {
  const term = entry.term;
  const defs = JSON.parse(entry.defs);
  const pageDir = path.join(DIST_DIR, 'f', entry.slug);
  fs.mkdirSync(pageDir, { recursive: true });

  const initialData = JSON.stringify([{
    term,
    attributes: JSON.parse(entry.attrs),
    definitions: defs,
    slug: entry.slug,
  }]);

  const title = `${term} — Fjalor Shqip`;
  const description = defs[0]?.slice(0, 160) || '';
  const html = template
    .replace('<title>Fjalor Shqip</title>', `<title>${title}</title>`)
    .replace('<meta name="description"', `<meta name="description" content="${description.replace(/"/g, '&quot;')}"`)
    .replace('</head>', `<script>window.__INITIAL_DATA__=${initialData}</script>\n</head>`);

  fs.writeFileSync(path.join(pageDir, 'index.html'), html);
  pages.push(entry.slug);
  if (pages.length % 5000 === 0) console.log(`Generated ${pages.length} pages`);
}

// Generate sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://fjalorshqip.com/</loc></url>
  <url><loc>https://fjalorshqip.com/rreth</loc></url>
${pages.map(slug => `  <url><loc>https://fjalorshqip.com/f/${slug}</loc></url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap);

console.log(`SSG complete: ${pages.length} pages + sitemap.xml`);
```

- [ ] **Step 4: Commit**

```bash
git add src/scripts/build.mjs src/scripts/copy-api.mjs src/scripts/ssg.mjs
git commit -m "feat: update build pipeline for SQLite"
```

---

## Chunk 3: Client Changes — Search + WordPage

### Task 6: Create storage.ts (localStorage History/Favorites)

**Files:**
- Create: `src/lib/storage.ts`

- [ ] **Step 1: Write storage.ts**

```typescript
const HISTORY_KEY = 'fj_history';
const FAVORITES_KEY = 'fj_favorites';
const MAX_HISTORY = 50;

export interface HistoryItem {
  slug: string;
  term: string;
  ts: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

export function addToHistory(slug: string, term: string) {
  const history = read<HistoryItem[]>(HISTORY_KEY, []);
  const filtered = history.filter(h => h.slug !== slug);
  filtered.unshift({ slug, term, ts: Date.now() });
  write(HISTORY_KEY, filtered.slice(0, MAX_HISTORY));
}

export function getHistory(): HistoryItem[] {
  return read<HistoryItem[]>(HISTORY_KEY, []);
}

export function toggleFavorite(slug: string): boolean {
  const favs = read<string[]>(FAVORITES_KEY, []);
  const idx = favs.indexOf(slug);
  if (idx >= 0) {
    favs.splice(idx, 1);
    write(FAVORITES_KEY, favs);
    return false;
  } else {
    favs.push(slug);
    write(FAVORITES_KEY, favs);
    return true;
  }
}

export function getFavorites(): string[] {
  return read<string[]>(FAVORITES_KEY, []);
}

export function isFavorite(slug: string): boolean {
  return getFavorites().includes(slug);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: localStorage history and favorites"
```

---

### Task 7: Update SearchBar.tsx — use API instead of searchIndex

**Files:**
- Modify: `src/components/SearchBar.tsx`

SearchBar currently calls `searchIndex.search(query)` which fetches stem prefix JSONs. Change to fetch `/api/search?q=...`.

- [ ] **Step 1: Read current SearchBar.tsx to understand structure**

```bash
cat src/components/searchbar/SearchBar.tsx
```

- [ ] **Step 2: Replace search logic**

Remove `searchIndex` import. Add fetch to `/api/search?q=...`.

The component wraps search results as links `<a href={/f/${entry.slug}}>`. Use the new search endpoint.

```typescript
// Remove:
import { searchIndex } from '../../lib/search';

// Add fetch:
const fetchResults = useCallback(async (query: string) => {
  if (!query || query.length < 2) { setResults([]); return; }
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  // Combine prefix + fulltext, dedupe by slug
  const seen = new Set<string>();
  const combined = [...data.prefix, ...data.fulltext].filter(e => {
    if (seen.has(e.slug)) return false;
    seen.add(e.slug);
    return true;
  });
  setResults(combined.slice(0, 10));
}, []);
```

Remove the old `debouncedSearch` / `searchIndex.search` pipeline, replace with this fetch.

Also need to update the suggestion rendering to use the new entry shape (from API response).

- [ ] **Step 3: Commit**

```bash
git add src/components/searchbar/SearchBar.tsx
git commit -m "feat: SearchBar uses /api/search endpoint"
```

---

### Task 8: Update WordPage.tsx — use API instead of slug-index

**Files:**
- Modify: `src/pages/WordPage.tsx`

WordPage currently checks `window.__INITIAL_DATA__` (SSG), otherwise fetches slug prefix JSON. Change the client-side fetch to `/api/word/:slug`.

- [ ] **Step 1: Read current WordPage.tsx**

- [ ] **Step 2: Update fetch logic**

```typescript
// Before (slug-index fetch):
const resp = await fetch(`/api/slug-index/${prefix}.json`);
const index: Record<string, Entry[]> = await resp.json();
const entries = index[slug];

// After (API):
const resp = await fetch(`/api/word/${slug}`);
if (!resp.ok) { setNotFound(true); return; }
const entry = await resp.json();
const entries = [entry]; // API returns single entry, but our UI expects Entry[]
```

Note: The API returns a single entry object (since slug is unique), but the existing WordPage renders `Entry[]`. Wrap in array.

Also, add `addToHistory` call when entry is found:
```typescript
import { addToHistory } from '../../lib/storage';

// After setting entries:
addToHistory(entry.slug, entry.term);
```

- [ ] **Step 3: Remove old imports** (dictionary-index, dictionary types, etc.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/WordPage.tsx
git commit -m "feat: WordPage uses /api/word/:slug endpoint"
```

---

### Task 9: Update env.ts / remove unused code

**Files:**
- Modify: `src/lib/env.ts` (if needed)
- Delete: `src/lib/dictionary-index.ts`
- Delete: `src/lib/search.ts`
- Modify: `src/lib/dictionary.ts` (keep only types + scrapedEntryToEntry)

- [ ] **Step 1: Prune dictionary.ts**

Remove I/O functions (`readDictionary`, `saveSlugDictionary`, etc.), stemIndex, slugSubIndex instances. Keep only:
- `Entry` interface
- `ScrapedEntry` interface
- `scrapedEntryToEntry()` function (used by build-db.ts)

- [ ] **Step 2: Delete dictionary-index.ts and search.ts**

```bash
rm src/lib/dictionary-index.ts src/lib/search.ts
```

- [ ] **Step 3: Check for remaining imports of deleted files**

```bash
rg "dictionary-index|search\.ts|from '../../lib/search'|from '../../lib/dictionary'" src/ --include "*.ts" --include "*.tsx"
```
Fix any remaining imports.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ && git rm src/lib/dictionary-index.ts src/lib/search.ts
git commit -m "refactor: remove JSON-index modules, clean up dictionary.ts"
```

---

## Chunk 4: UI Features — History + Favorites

### Task 10: Update Home.tsx with History + Favorites

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Read current Home.tsx**

Currently just renders `<SearchBar />`. Add sections below for history and favorites.

- [ ] **Step 2: Add history + favorites sections**

```typescript
import { getHistory, getFavorites } from '../../lib/storage';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Home() {
  const [history, setHistory] = useState(getHistory());
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setHistory(getHistory());
    setFavorites(getFavorites());
  }, []);

  return (
    <div>
      <SearchBar />
      {favorites.length > 0 && (
        <section>
          <h2>Favorites</h2>
          <ul>
            {favorites.map(slug => <li key={slug}><Link to={`/f/${slug}`}>{slug}</Link></li>)}
          </ul>
        </section>
      )}
      {history.length > 0 && (
        <section>
          <h2>History</h2>
          <ul>
            {history.slice(0, 10).map(h => <li key={h.slug}><Link to={`/f/${h.slug}`}>{h.term}</Link></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
```

Note: For favorites, we need to fetch the term. Since favorites stores only slugs, we might need to store `{slug, term}` pairs instead. Let's update storage.ts:

Actually, simplify: store `{slug: string, term: string}[]` for favorites too. Update `toggleFavorite` and `getFavorites`.

Actually, let me reconsider. The favorites only need the slug. We can show the slug (which is URL-friendly term). Let me keep it simple: favorites stores slugs, and we display the slug (format: "shqipeeri" → "shqipëri" would need reverse transform, but we can just show the slug as-is or do a simple replace).

Actually, for favorites we need the term for display. Let me store `{slug, term}[]`:

```typescript
export interface FavoriteItem {
  slug: string;
  term: string;
}

export function toggleFavorite(slug: string, term: string): boolean {
  const favs = read<FavoriteItem[]>(FAVORITES_KEY, []);
  const idx = favs.findIndex(f => f.slug === slug);
  if (idx >= 0) {
    favs.splice(idx, 1);
    write(FAVORITES_KEY, favs);
    return false;
  } else {
    favs.push({ slug, term });
    write(FAVORITES_KEY, favs);
    return true;
  }
}

export function getFavorites(): FavoriteItem[] {
  return read<FavoriteItem[]>(FAVORITES_KEY, []);
}

export function isFavorite(slug: string): boolean {
  return read<FavoriteItem[]>(FAVORITES_KEY, []).some(f => f.slug === slug);
}
```

This is cleaner.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Home.tsx src/lib/storage.ts
git commit -m "feat: add history and favorites sections to Home page"
```

---

### Task 11: Update RightPanel.tsx — add favorite button

**Files:**
- Modify: `src/components/RightPanel.tsx`

Add a star/favorite button that uses `toggleFavorite` from storage.

- [ ] **Step 1: Read current RightPanel.tsx**

- [ ] **Step 2: Add favorite toggle**

Add a button next to the entry title that toggles favorite status. Use `isFavorite` on mount and `toggleFavorite` on click.

```typescript
import { isFavorite, toggleFavorite } from '../../lib/storage';
import { useEntry } from '../../lib/entry-context';

// Inside component:
const entry = useEntry();
const [fav, setFav] = useState(() => entry ? isFavorite(entry.slug) : false);

const handleFav = () => {
  if (!entry) return;
  const now = toggleFavorite(entry.slug, entry.term);
  setFav(now);
};
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RightPanel.tsx
git commit -m "feat: add favorite button to RightPanel"
```

---

## Chunk 5: Infrastructure

### Task 12: Update Dockerfile

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Rewrite Dockerfile**

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY data data
COPY public public
COPY src src
COPY index.html index.html
COPY vite.config.ts vite.config.ts
COPY tsconfig.json tsconfig.json
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache dumb-init
WORKDIR /app
COPY --from=build /app/dist /app/dist
COPY server.mjs /app/
EXPOSE 3000
USER node
CMD ["dumb-init", "node", "/app/server.mjs"]
```

- [ ] **Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat: switch Docker to Node.js API server"
```

---

### Task 13: Update .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add fjalor.db**

```
src/data/gen/fjalor.db
public/api/fjalor.db
dist/api/fjalor.db
```

Also remove old gitignored patterns if they're no longer relevant (stem/, slug/ etc. are already gitignored under gen/ and api/).

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: update gitignore for SQLite DB"
```

---

### Task 14: Remove old generated files

- [ ] **Step 1: Clean up old gen/ contents**

```bash
rm -rf src/data/gen/stem src/data/gen/slug src/data/gen/slugDictionary.json
```

- [ ] **Step 2: Clean up old public/api/ contents**

```bash
rm -rf public/api/stem-index public/api/slug-index public/api/stem public/api/slug public/api/slugDictionary.json
```

- [ ] **Step 3: Commit**

```bash
git add -u && git commit -m "chore: remove old JSON partition files"
```

---

## Chunk 6: Testing

### Task 15: Fix existing tests

**Files:**
- Modify: `src/lib/__tests__/dictionary.test.ts`
- Modify: `src/lib/__tests__/process.test.ts`
- Modify: `src/lib/__tests__/utils.test.ts`

Tests reference `process.ts` and `dictionary.ts` (scrapedEntryToEntry). These still exist. Verify they all pass.

- [ ] **Step 1: Run existing tests**

```bash
npx vitest run
```

- [ ] **Step 2: Fix any broken imports**

If tests import from deleted modules (dictionary-index, search), remove those test files or update imports.

- [ ] **Step 3: Commit fixes**

---

### Task 16: Verify full build

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected:
- `prebuild` runs build-db.ts → creates fjalor.db
- vite build → creates dist/
- build.mjs → copies DB, runs SSG
- SSG generates 37K+ pages

- [ ] **Step 2: Verify dist structure**

```bash
ls -la dist/api/fjalor.db       # ~14 MB
ls dist/f/ | head -5            # word page directories
ls dist/sitemap.xml             # sitemap
```

- [ ] **Step 3: Start server and test**

```bash
node server.mjs &
curl -s http://localhost:3000/api/word/aba | head -c 200
curl -s "http://localhost:3000/api/search?q=fjalor" | head -c 200
curl -s "http://localhost:3000/api/suggest?q=fja" | head -c 200
curl -s http://localhost:3000/ | head -c 200   # should return HTML
kill %1
```

All endpoints should return valid JSON/HTML.

- [ ] **Step 4: Run tests again**

```bash
npx vitest run
```

Expected: all pass
