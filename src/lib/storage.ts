const HISTORY_KEY = 'fj_history';
const FAVORITES_KEY = 'fj_favorites';
const MAX_HISTORY = 50;

export interface HistoryItem {
  slug: string;
  term: string;
  ts: number;
}

export interface FavoriteItem {
  slug: string;
  term: string;
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
    /* localStorage full or unavailable */
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

export function toggleFavorite(slug: string, term: string): boolean {
  const favs = read<FavoriteItem[]>(FAVORITES_KEY, []);
  const idx = favs.findIndex(f => f.slug === slug);
  if (idx >= 0) {
    favs.splice(idx, 1);
    write(FAVORITES_KEY, favs);
    return false;
  }
  favs.push({ slug, term });
  write(FAVORITES_KEY, favs);
  return true;
}

export function getFavorites(): FavoriteItem[] {
  return read<FavoriteItem[]>(FAVORITES_KEY, []);
}

export function isFavorite(slug: string): boolean {
  return read<FavoriteItem[]>(FAVORITES_KEY, []).some(f => f.slug === slug);
}

const CROSSREF_KEY = 'fj_crossref';

export function getCrossRefPref(): boolean {
  return read<boolean>(CROSSREF_KEY, false);
}

export function setCrossRefPref(v: boolean): void {
  write(CROSSREF_KEY, v);
}
