import { describe, expect, it } from 'vitest';
import { scrapedEntryToEntry } from '../dictionary';

describe('scrapedEntryToEntry', () => {
  it('extracts term and attributes from term string', () => {
    const result = scrapedEntryToEntry({
      term: 'fjalor m.',
      definition: ['Libër që përmban fjalët e një gjuhe.'],
    });
    expect(result.term).toBe('fjalor');
    expect(result.attributes).toEqual(['m.']);
  });

  it('trims definitions', () => {
    const result = scrapedEntryToEntry({
      term: 'shkollë',
      definition: ['  Vendi ku mësojnë nxënësit.  '],
    });
    expect(result.definitions).toEqual(['Vendi ku mësojnë nxënësit.']);
  });

  it('removes leading numbered indexes when multiple definitions', () => {
    const result = scrapedEntryToEntry({
      term: 'krye',
      definition: ['1. Pjesa më e lartë.', '2. Fillimi i diçkaje.'],
    });
    expect(result.definitions).toEqual([
      'Pjesa më e lartë.',
      'Fillimi i diçkaje.',
    ]);
  });

  it('does not strip numbers for single definition', () => {
    const result = scrapedEntryToEntry({
      term: 'test',
      definition: ['1. Një provë.'],
    });
    expect(result.definitions).toEqual(['1. Një provë.']);
  });

  it('computes stems and slug', () => {
    const result = scrapedEntryToEntry({
      term: 'Shqipëri',
      definition: ['Shtet në Ballkan.'],
    });
    expect(result.stems).toEqual(['shqiperi']);
    expect(result.slug).toBe('shqipeeri');
  });

  it('handles multiple term parts without attributes', () => {
    const result = scrapedEntryToEntry({
      term: 'ditë pune',
      definition: ['Dita e punës.'],
    });
    expect(result.term).toBe('ditë pune');
    expect(result.attributes).toEqual([]);
  });

  it('filters empty term parts', () => {
    const result = scrapedEntryToEntry({
      term: '  fjalë   e   urtë  ',
      definition: ['Një shprehje.'],
    });
    expect(result.term).toBe('fjalë e urtë');
  });
});
