import express from 'express';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '5187', 10);

const STOP_WORDS = new Set([
  'i', 'e', 'te', 'se', 'ne', 'me', 'nga', 'per', 'pa', 'mbi', 'nen',
  'a', 'dhe', 'ose', 'por', 'si', 'kur', 'ku', 'deri', 'tek',
  'prej', 'jashte', 'brenda', 'para', 'pas', 'gjate', 'sipas', 'ndaj',
  'kunder', 'permes', 'rreth', 'afer', 'larg', 'poshte', 'lart',
  'vetem', 'edhe', 'apo', 'ndonje', 'cdo', 'disa', 'gjithe', 'tere',
  'ate', 'kete', 'kjo', 'ai', 'ajo', 'ata', 'ato', 'une', 'ti',
  'nuk', 's', 'po', 'do', 'ka', 'kane', 'kam', 'ke', 'kemi', 'keni',
  'jam', 'je', 'eshte', 'jane', 'ishin', 'ishte', 'u', 't', 'qe',
]);

function findDb() {
  if (process.env.DB_PATH) return process.env.DB_PATH;
  const candidates = [
    path.join(__dirname, 'dist', 'api', 'fjalor.db'),
    path.join(__dirname, 'public', 'api', 'fjalor.db'),
  ];
  for (const fp of candidates) {
    try { if (fs.existsSync(fp)) return fp; } catch {}
  }
  return candidates[0];
}

const DB_PATH = findDb();
let db;
try {
  db = new Database(DB_PATH, { readonly: true });
  db.pragma('journal_mode = WAL');
} catch (err) {
  console.error(`Failed to open database at ${DB_PATH}:`, err.message);
  process.exit(1);
}

// Pre-compile statements with fixed SQL
const stmts = {
  wordBySlug: db.prepare(
    'SELECT slug, term, attrs, defs FROM entries WHERE slug = ?'
  ),
  ftsSearch: db.prepare(`
    SELECT e.slug, e.term, e.attrs, e.defs
    FROM entries_fts f
    JOIN entries e ON e.id = f.rowid
    WHERE entries_fts MATCH ?
    LIMIT ?
  `),
  suggest: db.prepare(`
    SELECT DISTINCT e.term, e.slug FROM entries e
    JOIN stems s ON s.entry_id = e.id
    WHERE s.stem LIKE ?
    ORDER BY e.term
    LIMIT 8
  `),
  allSlugs: db.prepare('SELECT DISTINCT slug FROM entries'),
};

const app = express();

function parseStems(q) {
  return q.toLowerCase()
    .replace(/ë/g, 'e').replace(/ç/g, 'c')
    .split(/\s+/)
    .filter(s => /^[a-z]+$/.test(s) && !STOP_WORDS.has(s));
}

// Limit the number of ? placeholders to prevent abuse
const MAX_STEMS = 10;

app.get('/api/word/:slug/related', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT DISTINCT e.slug, e.term, e.attrs
      FROM entries e
      JOIN stems s ON s.entry_id = e.id
      WHERE s.stem IN (
        SELECT DISTINCT s2.stem
        FROM stems s2
        JOIN entries e2 ON e2.id = s2.entry_id
        WHERE e2.slug = ?
      )
      AND e.slug != ?
      ORDER BY e.term
      LIMIT 20
    `).all(req.params.slug, req.params.slug);
    res.json(rows.map(r => ({
      slug: r.slug,
      term: r.term,
      attributes: JSON.parse(r.attrs),
    })));
  } catch (err) {
    console.error('Error in /api/word/:slug/related:', err.message);
    res.json([]);
  }
});

app.get('/api/word/:slug', (req, res) => {
  try {
    const rows = stmts.wordBySlug.all(req.params.slug);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not found' });
    }
    res.json(rows.map(r => ({
      slug: r.slug,
      term: r.term,
      attributes: JSON.parse(r.attrs),
      definitions: JSON.parse(r.defs),
    })));
  } catch (err) {
    console.error('Error in /api/word/:slug:', err.message);
    res.status(500).json({ error: 'internal error' });
  }
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json([]);

  try {
    const seen = new Set();
    const results = [];

    // 1. Prefix match on term (autocomplete, uses idx_term index)
    const exactRows = db.prepare(
      'SELECT slug, term, attrs, defs FROM entries WHERE term LIKE ? ORDER BY term LIMIT 10'
    ).all(q + '%');

    for (const r of exactRows) {
      seen.add(r.slug);
      results.push({ slug: r.slug, term: r.term, attributes: JSON.parse(r.attrs), definitions: JSON.parse(r.defs) });
    }

    // 2. Diacritic-insensitive prefix match (ë/e, ç/c, both cases)
    // Always runs so typing 'e' also finds 'ë' words and vice versa
    if (results.length < 10) {
      const folded = q.toLowerCase().replace(/ë/g, 'e').replace(/ç/g, 'c');
      const foldRows = db.prepare(`
        SELECT slug, term, attrs, defs FROM entries
        WHERE replace(replace(replace(replace(term, 'ë', 'e'), 'Ë', 'E'), 'ç', 'c'), 'Ç', 'C') LIKE ?
        ORDER BY term
        LIMIT ?
      `).all(folded + '%', 10 - results.length);

      for (const r of foldRows) {
        if (!seen.has(r.slug)) {
          seen.add(r.slug);
          results.push({ slug: r.slug, term: r.term, attributes: JSON.parse(r.attrs), definitions: JSON.parse(r.defs) });
        }
      }
    }

    // 3. Multi-word: supplement with stem + FTS
    if (results.length < 5 && q.includes(' ')) {
      const stems = parseStems(q);
      if (stems.length > 0 && stems.length <= MAX_STEMS) {
        const placeholders = stems.map(() => '?').join(', ');
        const stemRows = db.prepare(`
          SELECT e.slug, e.term, e.attrs, e.defs
          FROM entries e
          JOIN stems s ON s.entry_id = e.id
          WHERE s.stem IN (${placeholders})
          GROUP BY e.id
          HAVING COUNT(*) = ?
          LIMIT 10
        `).all(...stems, stems.length);

        for (const r of stemRows) {
          if (!seen.has(r.slug)) {
            seen.add(r.slug);
            results.push({ slug: r.slug, term: r.term, attributes: JSON.parse(r.attrs), definitions: JSON.parse(r.defs) });
          }
        }

        if (results.length < 5) {
          const ftsQuery = stems.map(s => `"${s}"`).join(' AND ');
          const ftsRows = stmts.ftsSearch.all(ftsQuery, 10);
          for (const r of ftsRows) {
            if (!seen.has(r.slug)) {
              seen.add(r.slug);
              results.push({ slug: r.slug, term: r.term, attributes: JSON.parse(r.attrs), definitions: JSON.parse(r.defs) });
            }
          }
        }
      }
    }

    res.json(results.slice(0, 10));
  } catch (err) {
    console.error('Error in /api/search:', err.message);
    res.json([]);
  }
});

app.get('/api/random', (req, res) => {
  const n = Math.min(parseInt(req.query.n) || 20, 50);
  try {
    const rows = db.prepare(
      'SELECT slug, term, attrs, defs FROM entries ORDER BY RANDOM() LIMIT ?'
    ).all(n);
    res.json(rows.map(r => ({
      slug: r.slug,
      term: r.term,
      attributes: JSON.parse(r.attrs),
      definitions: JSON.parse(r.defs),
    })));
  } catch (err) {
    console.error('Error in /api/random:', err.message);
    res.json([]);
  }
});

app.get('/api/slugs', (req, res) => {
  try {
    const rows = stmts.allSlugs.all();
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(rows.map(r => r.slug));
  } catch (err) {
    console.error('Error in /api/slugs:', err.message);
    res.json([]);
  }
});

app.get('/api/suggest', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q || q.length < 3) return res.json([]);

  const stem = q.toLowerCase().replace(/ë/g, 'e').replace(/ç/g, 'c');
  try {
    const rows = stmts.suggest.all(stem + '%');
    res.json(rows);
  } catch (err) {
    console.error('Error in /api/suggest:', err.message);
    res.json([]);
  }
});

app.use(express.static(path.join(__dirname, 'dist'), { redirect: false }));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
