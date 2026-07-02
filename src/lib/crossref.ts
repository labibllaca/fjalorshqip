let slugSet: Set<string> | null = null;
let loading: Promise<void> | null = null;

export function getSlugSet(): Promise<Set<string>> {
  if (slugSet) return Promise.resolve(slugSet);
  if (loading) return loading.then(() => slugSet!);

  loading = fetch('/api/slugs')
    .then(r => r.json())
    .then((slugs: string[]) => {
      slugSet = new Set(slugs);
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

export function matchSlug(slug: string, slugs: Set<string>): string | undefined {
  if (slugs.has(slug)) return slug;
  if (slug.length < 6) return;

  for (let i = 0; i < slug.length; i++) {
    const v = slug.slice(0, i) + slug.slice(i + 1);
    if (slugs.has(v)) return v;
  }
}
