import { describe, expect, it } from 'vitest';
import { getStems, getSlug } from '../process';

describe('getStems', () => {
  it('lowercases and normalizes ë to e, ç to c', () => {
    expect(getStems('Shqipëria')).toEqual(['shqiperia']);
  });

  it('splits on whitespace and returns multiple stems', () => {
    expect(getStems('Fjalor Shqip')).toEqual(['fjalor', 'shqip']);
  });

  it('strips non-alpha characters from each word', () => {
    expect(getStems('fjalë (kryq)')).toEqual(['fjale', 'kryq']);
  });

  it('filters out empty strings from multiple spaces', () => {
    expect(getStems('fjala   shqipe')).toEqual(['fjala', 'shqipe']);
  });

  it('handles empty string', () => {
    expect(getStems('')).toEqual([]);
  });
});

describe('getSlug', () => {
  it('lowercases and normalizes ë to ee, ç to cc', () => {
    expect(getSlug('Shqipëria')).toEqual('shqipeeria');
  });

  it('joins words with hyphens', () => {
    expect(getSlug('Fjalor Shqip')).toEqual('fjalor-shqip');
  });

  it('strips non-alpha characters from each word', () => {
    expect(getSlug('fjalë (kryq)')).toEqual('fjalee-kryq');
  });

  it('handles single word', () => {
    expect(getSlug('Fjalor')).toEqual('fjalor');
  });

  it('handles empty string', () => {
    expect(getSlug('')).toEqual('');
  });
});

