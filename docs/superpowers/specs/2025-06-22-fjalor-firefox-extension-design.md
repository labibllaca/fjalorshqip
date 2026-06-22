# Fjalor Firefox Extension Design

> **Goal:** Firefox Extension that looks up Albanian words from any webpage in the Fjalor Shqip dictionary via right-click context menu.

**Architecture:** Manifest V3 extension with background service worker, content script, and popup overlay. Communicates with existing `https://fjalor.bashk.eu/api/` over HTTPS (Caddy). No local server, no WASM SQLite, no on-device DB.

---

## Data Flow

```
User selects word → Right-click → "Fjalor: [word]"
  → Background worker: normalize + strip common Albanian suffixes
  → GET /api/search?q=<stem>
  → Results sent to content script
  → Content script renders popup overlay near selected text
```

## Components

### 1. Background Service Worker (`background.js`)
- Register context menu item on install
- On click: get selected text from `info.selectionText`
- Normalize: lowercase, `ë→e`, `ç→c`
- Try exact search first
- If no results: strip suffixes iteratively (longest first), retry
- `fetch()` to `https://fjalor.bashk.eu/api/search?q=<term>`
- Send results to content script via `chrome.tabs.sendMessage()`

### 2. Content Script (`content.js`)
- Listens for messages from background worker
- Renders popup overlay `<div>` positioned near the selected text
- Styling: clean minimal, dark/light aware (prefers-color-scheme)
- Show: term, attributes (f./m./etc.), definitions as bullet list
- Close on click outside or Escape key
- "Open in Fjalor" link → `https://fjalor.bashk.eu/f/<slug>`

### 3. Suffix Stripping (`suffixes.js`)
Common Albanian suffixes (2–5 chars) sorted longest-first:
```
'-shin', '-nit', '-nte', '-së', '-të', '-ve', '-sh', '-n',
'-i', '-e', '-a', '-u', '-t', '-s', '-h'
```
Strategy:
1. Remove longest matching suffix from end of normalized word
2. Search API with stem
3. If no results, try shorter suffix
4. Show original word + found matches (so user sees which root it matched)

### 4. Popup UI (injected by content script)
- Absolute positioned near selection
- Max-width: 400px, max-height: 300px
- Scrollable if many definitions
- Close button + click-outside

## API Surface (existing)

| Endpoint | Params | Returns |
|---|---|---|
| `GET /api/search?q=<term>` | `q`: search term | `[{slug, term, attributes}]` |
| `GET /api/word/<slug>` | slug | `[{slug, term, attributes, definitions}]` |

Currently `/api/search` returns attributes but not definitions. The extension needs definitions. Options:
- Modify server to include definitions in search results
- OR make a second call to `/api/word/:slug` for each hit (max 10)

**Recommendation:** Modify server to include `defs` in search response. One round-trip.

**Server change needed:** In `server.mjs`, the `/api/search` endpoint's `exactRows` and `foldRows` queries select `slug, term, attrs` — add `defs` column.

## Manifest V3 Permissions

```json
{
  "manifest_version": 3,
  "permissions": ["contextMenus", "activeTab"],
  "host_permissions": ["https://fjalor.bashk.eu/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

## Files

```
webextension/
├── manifest.json
├── background.js      ← service worker, context menu, API calls, suffix logic
├── content.js         ← injected overlay rendering
├── suffixes.js        ← suffix list + strip function
├── popup.html         ← (maybe not needed if content script renders overlay)
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Server Changes (server.mjs)

In `/api/search`: change SELECT to include `defs`, return definitions array.

```js
// Before:
SELECT slug, term, attrs FROM entries ...
// After:
SELECT slug, term, attrs, defs FROM entries ...

// Response adds:
definitions: JSON.parse(r.defs)
```
