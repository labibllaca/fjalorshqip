import { getStems, getSlug } from './process';

export interface ScrapedEntry {
  term: string;
  definition: string[];
  exact_term?: string;
  skip?: boolean;
}

export interface Entry {
  term: string;
  attributes: string[];
  definitions: string[];
  stems: string[];
  slug: string;
}

export type Index = {
  [key: string]: Entry[];
};

export function scrapedEntryToEntry(scrapedEntry: ScrapedEntry): Entry {
  const parts = scrapedEntry.term.split(/\s+/).filter(Boolean);
  const attrs: string[] = [];
  const rest: string[] = [];
  for (const p of parts) {
    if (p.endsWith('.')) attrs.push(p);
    else rest.push(p);
  }
  const term = rest.join(' ') || parts[0];
  let defs = scrapedEntry.definition.map(d => d.trim());
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
