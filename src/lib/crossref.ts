const CACHE_KEY = 'fj_slugs_cache';
const CACHE_TTL = 60 * 60 * 1000;

interface SlugCache {
  timestamp: number;
  slugs: string[];
}

let slugSet: Set<string> | null = null;
let loading: Promise<void> | null = null;

function readCache(): SlugCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(slugs: string[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), slugs }));
  } catch { /* localStorage full */ }
}

export function getSlugSet(): Promise<Set<string>> {
  if (slugSet) return Promise.resolve(slugSet);
  if (loading) return loading.then(() => slugSet!);

  const cached = readCache();
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    slugSet = new Set(cached.slugs);
    return Promise.resolve(slugSet);
  }

  loading = fetch('/api/slugs')
    .then(r => r.json())
    .then((slugs: string[]) => {
      slugSet = new Set(slugs);
      writeCache(slugs);
      loading = null;
    });
  return loading.then(() => slugSet!);
}

export function wordToSlug(word: string): string {
  return word
    .toLowerCase()
    .replace(/ë/g, 'ee')
    .replace(/ç/g, 'cc')
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '-');
}

/** Check if `slug` or a close variant matches a known slug. */
export function matchSlug(slug: string, slugs: Set<string>): string | undefined {
  if (slugs.has(slug)) return slug;
  if (slug.length < 6) return;

  // Single character deletions (handles suffixed/plural forms)
  for (let i = 0; i < slug.length; i++) {
    const v = slug.slice(0, i) + slug.slice(i + 1);
    if (slugs.has(v)) return v;
  }
}
