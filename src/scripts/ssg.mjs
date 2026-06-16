import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../data/gen/fjalor.db');
const DIST_HTML_PATH = path.resolve(__dirname, '../../dist/index.html');
const DIST_DIR = path.resolve(__dirname, '../../dist');

if (!fs.existsSync(DB_PATH)) {
  console.error('SQLite DB not found. Run prebuild first.');
  process.exit(1);
}

import Database from 'better-sqlite3';
const db = new Database(DB_PATH, { readonly: true });

const template = fs.readFileSync(DIST_HTML_PATH, 'utf-8');
const rows = db.prepare('SELECT slug, term, attrs, defs FROM entries ORDER BY slug').all();

// Group entries by slug
const grouped = new Map();
for (const r of rows) {
  if (!grouped.has(r.slug)) grouped.set(r.slug, []);
  grouped.get(r.slug).push({
    slug: r.slug,
    term: r.term,
    attributes: JSON.parse(r.attrs),
    definitions: JSON.parse(r.defs),
  });
}

const siteUrl = 'https://fjalorshqip.com';
let count = 0;
const slugs = [];

for (const [slug, entriesForSlug] of grouped) {
  const dir = path.join(DIST_DIR, 'f', slug);
  fs.mkdirSync(dir, { recursive: true });

  const first = entriesForSlug[0];
  const term = first.term;
  const description = `Kuptimi i fjalës ${term} në gjuhën shqipe.`;

  const html = template
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${term} | Kuptimi i fjalës | fjalorshqip.com</title>`
    )
    .replace(
      /<meta name="description"[^>]*\/?>/,
      `<meta name="description" content="${description}" />`
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root"></div>\n<script>window.__INITIAL_DATA__ = ${JSON.stringify(entriesForSlug)}</script>`
    );

  fs.writeFileSync(path.join(dir, 'index.html'), html);
  count++;
  slugs.push(slug);
}

console.log(`Generated ${count} static word pages (${rows.length} entries)`);

const urls = slugs.map(s => `  <url><loc>${siteUrl}/f/${s}</loc></url>`);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc></url>
  <url><loc>${siteUrl}/rreth</loc></url>
${urls.join('\n')}
</urlset>`;
fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
console.log(`Generated sitemap with ${urls.length + 2} URLs`);

db.close();
