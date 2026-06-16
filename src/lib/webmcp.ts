import { toggleFavorite, getFavorites } from './storage';

export function registerWebMcpTools() {
  const modelContext = (document as any).modelContext || (navigator as any).modelContext;
  if (!modelContext || typeof modelContext.registerTool !== 'function') {
    return;
  }

  // 1. Search dictionary tool
  modelContext.registerTool({
    name: 'search_dictionary',
    description: 'Searches the Albanian dictionary for entries matching a query prefix or diacritic-insensitive term.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query term (e.g. "shkollë", "mace", etc.)'
        }
      },
      required: ['query']
    },
    async execute(input: { query: string }) {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(input.query)}`);
        return await res.json();
      } catch (err: any) {
        return { error: err.message };
      }
    },
    annotations: { readOnlyHint: true }
  });

  // 2. Get word definition tool
  modelContext.registerTool({
    name: 'get_word_definition',
    description: 'Retrieves the definitions, attributes, and details of a specific Albanian word using its slug.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the word (e.g. "shkollë", "kod").'
        }
      },
      required: ['slug']
    },
    async execute(input: { slug: string }) {
      try {
        const res = await fetch(`/api/word/${encodeURIComponent(input.slug)}`);
        if (!res.ok) {
          return { error: `Word with slug "${input.slug}" not found` };
        }
        return await res.json();
      } catch (err: any) {
        return { error: err.message };
      }
    },
    annotations: { readOnlyHint: true }
  });

  // 3. Get favorites tool
  modelContext.registerTool({
    name: 'get_favorites',
    description: 'Retrieves the list of user\'s favorite dictionary words.',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    execute() {
      return getFavorites();
    },
    annotations: { readOnlyHint: true }
  });

  // 4. Toggle favorite tool
  modelContext.registerTool({
    name: 'toggle_favorite',
    description: 'Toggles a word\'s favorite status in the user\'s local list.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the word.'
        },
        term: {
          type: 'string',
          description: 'The display term of the word.'
        }
      },
      required: ['slug', 'term']
    },
    execute(input: { slug: string; term: string }) {
      const isFav = toggleFavorite(input.slug, input.term);
      return { slug: input.slug, term: input.term, isFavorite: isFav };
    }
  });
}
