import { read, write } from './storage';

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

export async function getWordOfTheDay(bypassCache = false): Promise<string> {
  const date = today();
  const cache = read<Record<string, string>>(CACHE_KEY, {});

  if (!bypassCache && cache[date]) return cache[date];

  const res = await fetch('/api/slugs');
  const allSlugs: string[] = await res.json();
  let seen = read<string[]>(SEEN_KEY, []);

  let available = allSlugs.filter(s => !seen.includes(s));
  if (available.length === 0) {
    seen = [];
    available = allSlugs;
  }

  const idx = hash(date) % available.length;
  const picked = available[idx];

  seen.push(picked);
  write(SEEN_KEY, seen);
  cache[date] = picked;
  write(CACHE_KEY, cache);

  return picked;
}
