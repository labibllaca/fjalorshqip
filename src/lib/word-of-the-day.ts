const SEEN_KEY = 'wotd_seen';
const CACHE_KEY = 'wotd_cache';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveSeen(seen: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch {}
}

function loadCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCache(cache: Record<string, string>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

export async function getWordOfTheDay(): Promise<string> {
  const date = today();
  const cache = loadCache();

  if (cache[date]) return cache[date];

  const res = await fetch('/api/slugs');
  const allSlugs: string[] = await res.json();
  let seen = loadSeen();

  let available = allSlugs.filter(s => !seen.has(s));
  if (available.length === 0) {
    seen = new Set();
    available = allSlugs;
  }

  const idx = hash(date) % available.length;
  const picked = available[idx];

  seen.add(picked);
  saveSeen(seen);
  cache[date] = picked;
  saveCache(cache);

  return picked;
}
