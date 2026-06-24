# Related Words Sidebar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a sidebar with related words (synonyms/stem-mates) when viewing a word definition on `/f/:slug`.

**Architecture:** Add a stem-based related-words API endpoint that queries the existing `stems` table for words sharing at least one stem with the current entry. Create a fixed right sidebar component that fetches from this endpoint and displays related words as links. Wire it into MainLayout via pathname detection.

**Tech Stack:** Express 5 (server), React 18 + react-router-dom (client), SQLite (stems table already exists)

---

### File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server.mjs` | Modify: add lines after line 93 | New `GET /api/word/:slug/related` endpoint |
| `src/components/WordSidebar.tsx` | Create | Sidebar component fetching + displaying related words |
| `src/components/WordSidebar.scss` | Create | Sidebar styles (matching RightPanel patterns) |
| `src/components/MainLayout.tsx` | Modify | Render WordSidebar when pathname matches `/f/:slug` |
| `src/components/MainLayout.scss` | Add CSS | Word sidebar styles + responsive drawer behavior |
| `src/lib/entry-context.ts` | Modify | Add `slug` to context so WordSidebar can fetch |

---

## Chunk 1: API Endpoint + Server

### Task 1.1: Add `/api/word/:slug/related` endpoint

**Files:**
- Modify: `server.mjs` (after line 93, before the `/api/search` route)

- [ ] **Step 1: Add the endpoint**

After line 93 (the closing `});` of `/api/word/:slug`), add:

```js
app.get('/api/word/:slug/related', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT DISTINCT e.slug, e.term, e.attrs
      FROM entries e
      JOIN stems s ON s.entry_id = e.id
      WHERE s.stem IN (
        SELECT DISTINCT s2.stem
        FROM stems s2
        JOIN entries e2 ON e2.id = s2.entry_id
        WHERE e2.slug = ?
      )
      AND e.slug != ?
      ORDER BY e.term
      LIMIT 20
    `).all(req.params.slug, req.params.slug);

    res.json(rows.map(r => ({
      slug: r.slug,
      term: r.term,
      attributes: JSON.parse(r.attrs),
    })));
  } catch (err) {
    console.error('Error in /api/word/:slug/related:', err.message);
    res.json([]);
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add server.mjs
git commit -m "feat: add /api/word/:slug/related endpoint for stem-based related words"
```

---

## Chunk 2: WordSidebar Component

### Task 2.1: Create WordSidebar.tsx

**Files:**
- Create: `src/components/WordSidebar.tsx`
- Create: `src/components/WordSidebar.scss`

- [ ] **Step 1: Create WordSidebar.scss**

```scss
.word-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: var(--right-col, 300px);
  background: var(--panel);
  color: var(--panel-text);
  font-size: 14px;
  line-height: 1.5;
  z-index: 200;
  padding: 24px 20px 20px;
  overflow-y: auto;
  box-shadow: -8px 0 24px rgba(0,0,0,.15);
}

.word-sidebar-header {
  font-family: var(--type-serif, 'Playfair Display', Georgia, serif);
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: #fff;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,.1);
}

.word-sidebar-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.word-sidebar-link {
  display: block;
  padding: 8px 10px;
  font-size: 14px;
  color: var(--panel-text);
  text-decoration: none;
  border-radius: 4px;
  line-height: 1.4;
  opacity: .85;
  transition: opacity .15s, background .15s;
}
.word-sidebar-link:hover {
  opacity: 1;
  background: rgba(255,255,255,.08);
}

.word-sidebar-term {
  font-weight: 500;
}

.word-sidebar-attrs {
  font-size: 12px;
  opacity: .6;
  margin-left: 6px;
}

.word-sidebar-empty {
  color: var(--panel-text);
  opacity: .5;
  font-style: italic;
  font-size: 13px;
}

.word-sidebar-loading {
  color: var(--panel-text);
  opacity: .5;
  font-size: 13px;
}

/* Responsive: drawer on tablet/mobile */
@media (max-width: 1024px) {
  .word-sidebar {
    transform: translateX(100%);
    transition: transform .28s cubic-bezier(.4,0,.2,1);
    z-index: 50;
  }
  .word-sidebar.open {
    transform: translateX(0);
    z-index: 999;
  }
}
```

- [ ] **Step 2: Create WordSidebar.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEntry } from '../lib/entry-context';
import './WordSidebar.scss';

interface RelatedEntry {
  slug: string;
  term: string;
  attributes: string[];
}

const WordSidebar = () => {
  const { entry, slug, panelOpen, togglePanel } = useEntry();
  const [related, setRelated] = useState<RelatedEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug) { setRelated([]); return; }
    setLoading(true);
    fetch(`/api/word/${encodeURIComponent(slug)}/related`)
      .then(res => res.json())
      .then(data => { setRelated(data); setLoading(false); })
      .catch(() => { setRelated([]); setLoading(false); });
  }, [slug]);

  return (
    <aside
      className={`word-sidebar ${panelOpen ? 'open' : ''}`}
      aria-label="Fjalë të lidhura"
    >
      <button className="panel-close" onClick={() => togglePanel()} aria-label="Mbyll panelin">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <h2 className="word-sidebar-header">Fjalë të lidhura</h2>

      {loading ? (
        <div className="word-sidebar-loading">Duke u ngarkuar...</div>
      ) : related.length === 0 ? (
        <div className="word-sidebar-empty">Nuk u gjetën fjalë të lidhura</div>
      ) : (
        <nav className="word-sidebar-list">
          {related.map(r => (
            <Link
              key={r.slug}
              to={`/f/${r.slug}`}
              className="word-sidebar-link"
              viewTransition
              onClick={() => { if (window.innerWidth <= 1024) togglePanel(); }}
            >
              <span className="word-sidebar-term">{r.term}</span>
              {r.attributes.length > 0 && (
                <span className="word-sidebar-attrs">{r.attributes.join(', ')}</span>
              )}
            </Link>
          ))}
        </nav>
      )}
    </aside>
  );
};

export default WordSidebar;
```

- [ ] **Step 3: Commit**

```bash
git add src/components/WordSidebar.tsx src/components/WordSidebar.scss
git commit -m "feat: add WordSidebar component showing stem-related words"
```

---

## Chunk 3: Wire into Layout

### Task 3.1: Update EntryContext to expose slug

**Files:**
- Modify: `src/lib/entry-context.ts`

- [ ] **Step 1: Add slug to entry-context.ts**

Current interface:
```ts
interface EntryContextValue {
  entry: Entry | null;
  setEntry: (entry: Entry | null) => void;
  crossRef: boolean;
  setCrossRef: (v: boolean) => void;
  panelOpen: boolean;
  togglePanel: () => void;
}
```

Add `slug` field:
```ts
interface EntryContextValue {
  entry: Entry | null;
  setEntry: (entry: Entry | null) => void;
  crossRef: boolean;
  setCrossRef: (v: boolean) => void;
  panelOpen: boolean;
  togglePanel: () => void;
  slug: string | null;
  setSlug: (slug: string | null) => void;
}
```

Default value for `slug`: `null`
Default value for `setSlug`: `() => {}`

- [ ] **Step 2: Commit**

```bash
git add src/lib/entry-context.ts
git commit -m "refactor: add slug to EntryContext for WordSidebar"
```

### Task 3.2: Update MainLayout to provide slug and render WordSidebar

**Files:**
- Modify: `src/components/MainLayout.tsx`

- [ ] **Step 1: Add slug state and setSlug to EntryContext provider**

In MainLayout component:
```ts
const [slug, setSlug] = useState<string | null>(null);
```

Update EntryContext.Provider:
```tsx
<EntryContext.Provider value={{
  entry, setEntry, crossRef, setCrossRef: handleSetCrossRef,
  panelOpen: drawerOpen, togglePanel: toggleDrawer,
  slug, setSlug
}}>
```

- [ ] **Step 2: Import WordSidebar and render it on word pages**

```ts
import WordSidebar from './WordSidebar';
```

Replace the RightPanel section:
```tsx
{pathname === '/' && (
  <RightPanel isOpen={drawerOpen} onClose={closeDrawer} />
)}
{pathname.startsWith('/f/') && <WordSidebar />}
```

- [ ] **Step 3: Update WordPage to set slug in context**

In `WordPage.tsx`, add `setSlug` from context and call it when slug changes:
```ts
const { setEntry, setSlug } = useEntry();

useEffect(() => {
  if (slug) setSlug(slug);
  if (!slug) { setLoading(false); return; }
  // ... rest of fetch logic
}, [slug, setSlug]);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/MainLayout.tsx src/pages/WordPage.tsx
git commit -m "feat: wire WordSidebar into layout, show on word pages"
```

---

## Chunk 4: Verification

- [ ] **Step 1: Run tests**

```bash
npm test
```
Expected: all tests pass

- [ ] **Step 2: Build the app**

```bash
npm run build
```
Expected: builds successfully (should not break since db schema unchanged)

- [ ] **Step 3: Verify manually**
- Navigate to `/f/udh%C3%AB` → sidebar appears on the right showing related words like "udhëheq", "udhëtar", "udhëtim", etc.
- On mobile (<=1024px width) → sidebar is hidden, toggle button appears
- Click a related word → navigates to that word's page, sidebar updates with new related words
- If no related words → shows "Nuk u gjetën fjalë të lidhura"
- Home page still shows RightPanel, word page shows WordSidebar

- [ ] **Step 4: Final commit if anything was missed**

```bash
git add -A && git commit -m "chore: finalize related words sidebar"
```
