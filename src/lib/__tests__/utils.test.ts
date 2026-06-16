import { describe, expect, it } from 'vitest';
import { groupBy, pushToListGroup } from '../utils';

describe('groupBy', () => {
  it('groups items by key getter', () => {
    const items = [
      { name: 'Alice', role: 'admin' },
      { name: 'Bob', role: 'user' },
      { name: 'Charlie', role: 'admin' },
    ];
    const result = groupBy(items, (item) => item.role);
    expect(result).toEqual({
      admin: [
        { name: 'Alice', role: 'admin' },
        { name: 'Charlie', role: 'admin' },
      ],
      user: [{ name: 'Bob', role: 'user' }],
    });
  });

  it('returns empty object for empty list', () => {
    expect(groupBy([], (item: any) => item)).toEqual({});
  });
});

describe('pushToListGroup', () => {
  it('adds item to existing group', () => {
    const acc = { fruits: ['apple'] };
    pushToListGroup(acc, 'fruits', 'banana');
    expect(acc.fruits).toEqual(['apple', 'banana']);
  });

  it('creates new group when key does not exist', () => {
    const acc: Record<string, string[]> = {};
    pushToListGroup(acc, 'fruits', 'apple');
    expect(acc.fruits).toEqual(['apple']);
  });
});
