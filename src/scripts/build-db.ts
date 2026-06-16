import path from 'node:path';
import { readFileSync, existsSync, mkdirSync, statSync, rmSync } from 'node:fs';
import Database from 'better-sqlite3';
import type { ScrapedEntry, Entry } from '../lib/dictionary';
import { scrapedEntryToEntry } from '../lib/dictionary';

const DATA_DIR = path.resolve(import.meta.dirname, '../../data');
const GEN_DIR = path.resolve(import.meta.dirname, '../../src/data/gen');
const DB_PATH = path.join(GEN_DIR, 'fjalor.db');

function build() {
  if (!existsSync(GEN_DIR)) mkdirSync(GEN_DIR, { recursive: true });

  // Delete old DB before recreating
  if (existsSync(DB_PATH)) rmSync(DB_PATH);
  for (const ext of ['-wal', '-shm']) {
    const aux = DB_PATH + ext;
    if (existsSync(aux)) rmSync(aux);
  }

  const rawEntries: ScrapedEntry[] = JSON.parse(
    readFileSync(path.join(DATA_DIR, 'dictionary.json'), 'utf-8')
  );

  console.log(`Read ${rawEntries.length} raw entries`);

  const db = new Database(DB_PATH);

  db.pragma('synchronous = OFF');
  db.pragma('journal_mode = MEMORY');
  db.pragma('cache_size = -8000');
  db.pragma('temp_store = MEMORY');

  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      term  TEXT NOT NULL,
      slug  TEXT NOT NULL,
      attrs TEXT NOT NULL,
      defs  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_slug ON entries(slug);
    CREATE INDEX IF NOT EXISTS idx_term ON entries(term);

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
  let skipped = 0;

  const insertBatch = db.transaction(() => {
    for (const raw of rawEntries) {
      if (raw.skip) { skipped++; continue; }
      const entry = scrapedEntryToEntry(raw);
      const key = `${entry.term}|${entry.definitions.join('|')}`;
      if (seen.has(key)) { skipped++; continue; }
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
  console.log(`Entries: ${seen.size}, skipped: ${skipped}`);

  db.exec("INSERT INTO entries_fts(entries_fts) VALUES('rebuild')");
  db.exec("INSERT INTO entries_fts(entries_fts) VALUES('optimize')");

  db.pragma('synchronous = FULL');
  db.pragma('journal_mode = WAL');
  db.exec('VACUUM');
  db.close();

  const stats = statSync(DB_PATH);
  console.log(`DB size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

build();
