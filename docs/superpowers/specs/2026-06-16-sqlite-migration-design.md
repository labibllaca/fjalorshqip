# SQLite Migration + FTS + History + Favorites

## Ziel
Dictionary-Architektur von statischen JSON-Partitionen auf SQLite-basierten API-Server migrieren, mit neuen Features FTS, History, Favoriten.

## Architektur

```
Browser                     Docker (Node.js 22)
┌──────────┐   /api/*    ┌────────────────────┐
│ React SPA │ ────────→  │ Express Server     │
│ (dist/)   │ ←────────  │ + better-sqlite3   │
└──────────┘   JSON      └────────┬───────────┘
                                  │
                          ┌───────▼────────┐
                          │  fjalor.db     │
                          │  (SQLite, RO)  │
                          └────────────────┘
History + Favoriten: localStorage (client-seitig)
```

## SQLite Schema

```sql
CREATE TABLE entries (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  term  TEXT NOT NULL,
  slug  TEXT NOT NULL UNIQUE,
  attrs TEXT NOT NULL,   -- JSON-Array der Attribute
  defs  TEXT NOT NULL    -- JSON-Array der Definitionen
);
CREATE INDEX idx_slug ON entries(slug);

CREATE TABLE stems (
  entry_id INTEGER NOT NULL REFERENCES entries(id),
  stem     TEXT NOT NULL
);
CREATE INDEX idx_stem ON stems(stem);

CREATE VIRTUAL TABLE entries_fts USING fts5(
  term, defs, content='entries', content_rowid='id',
  tokenize='unicode61'
);
```

## Build Pipeline

```
data/dictionary.json (14 MB, 39K ScrapedEntry)
       │ src/scripts/build-db.ts
       ▼
src/data/gen/fjalor.db (~14 MB)
       │ copy-api.mjs (dev) / build.mjs (prod)
       ▼
public/api/fjalor.db / dist/api/fjalor.db
```

build-db.ts Optimierungen:
- Batch-INSERTs (1000er-Blöcke in Transaktion)
- FTS-Rebuild nach allen Inserts
- PRAGMA synchronous=OFF, journal_mode=MEMORY während Build
- VACUUM am Ende

Entfernt: dictionary-index.ts, search.ts (alt), dictionary.ts I/O-Funktionen, stem/slug Partitionen, slugDictionary.json

## API Server (server.mjs)

```js
GET  /api/word/:slug        → Entry | 404
GET  /api/search?q=string   → { prefix: Entry[], fulltext: Entry[] }
GET  /api/suggest?q=string  → string[] (Autocomplete-Vorschläge)
GET  *                      → dist/index.html (SPA Fallback)
```

Statische Files aus `dist/` via `express.static()`.

## Client-Änderungen

- **SearchBar.tsx**: fetch /api/search statt searchIndex.search()
- **WordPage.tsx**: fetch /api/word/:slug statt Slug-Prefix-JSON
- **src/lib/storage.ts**: History + Favorites via localStorage
  - addToHistory(slug, term), getHistory() (letzte 50, mit Timestamp)
  - toggleFavorite(slug), getFavorites(), isFavorite(slug)
- **Home.tsx**: "Letzte Wörter" + "Favoriten"-Sektion unter SearchBar
- **RightPanel.tsx**: Stern-Button zum Favorisieren
- **SSG (ssg.mjs)**: Liest aus fjalor.db statt slugDictionary.json

## Docker

```dockerfile
FROM node:22-alpine AS build
...
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache dumb-init
COPY --from=build /app/dist /app/dist
COPY server.mjs /app/
EXPOSE 3000
USER node
CMD ["dumb-init", "node", "/app/server.mjs"]
```

## Sicherheit
- DB wird build-time erzeugt, runtime read-only
- Parameterized queries (keine Injection)
- Keine User-Authentifizierung nötig (offenes Read-Only-API)
- CSP + rate-limiting optional (nicht Teil dieses Designs)

## Dateien zum Ändern/Erstellen

Neu:
- src/scripts/build-db.ts
- server.mjs (im Root)
- src/lib/storage.ts

Ändern:
- src/scripts/preprocess.ts → build-db.ts (umbenennen/ersetzen)
- src/scripts/build.mjs (vereinfachen, kopiert nur DB)
- src/scripts/ssg.mjs (liest SQLite statt JSON)
- src/scripts/copy-api.mjs (kopiert DB statt JSONs)
- src/components/SearchBar.tsx (API-Call statt searchIndex)
- src/pages/WordPage.tsx (API-Call statt Slug-Index)
- src/pages/Home.tsx (History + Favorites UI)
- src/components/RightPanel.tsx (Favorite-Button)
- src/components/MainLayout.tsx (ggf. Anpassungen)
- Dockerfile (Node.js server statt static-web-server)
- package.json (neue Deps: express, better-sqlite3)
- .gitignore (fjalor.db in gen/)

Löschen:
- src/lib/dictionary-index.ts
- src/lib/search.ts
- src/lib/dictionary.ts (I/O-Teil, Typen + scrapedEntryToEntry behalten)
- src/data/gen/ (altes JSON-Zeug)
