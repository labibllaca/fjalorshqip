# Fjalor Firefox Extension Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firefox Extension that looks up Albanian words via right-click context menu using the existing Fjalor API.

**Architecture:** Manifest V3, background service worker, content script injected into all pages, communication via `chrome.runtime.sendMessage()`. API calls to `https://fjalor.bashk.eu/api/` (HTTPS, no local server). Albanian suffix stripping in extension before search.

**Tech Stack:** Manifest V3, vanilla JS, no framework, no bundler (plain extension).

---

## Chunk 1: Server-side — extend `/api/search` with definitions

**Files:**
- Modify: `server.mjs:95-172`

- [ ] **Step 1: Add defs to search SELECT queries**

In `server.mjs`, the four search blocks (exact prefix, folded prefix, stem multi-word, FTS) all return `slug, term, attrs`. Add `defs` to each SELECT and parse it in the response mapping.

Change these lines:
- line 105: `SELECT slug, term, attrs FROM entries` → `SELECT slug, term, attrs, defs FROM entries`
- line 119: `SELECT slug, term, attrs` → `SELECT slug, term, attrs, defs`
- line 140: `SELECT e.slug, e.term, e.attrs` → `SELECT e.slug, e.term, e.attrs, e.defs`
- line 157: uses `stmts.ftsSearch` — modify the prepared statement at line 49: `SELECT e.slug, e.term, e.attrs` → `SELECT e.slug, e.term, e.attrs, e.defs`

Add definitions to each result object:
```js
definitions: JSON.parse(r.defs),
```

- [ ] **Step 2: Restart dev server and test**

```bash
npm run dev
```

Test: `curl 'http://localhost:5187/api/search?q=shtepi' | jq '. | length'`
Expected: results now include `definitions` array.

- [ ] **Step 3: Commit**

```bash
git add server.mjs
git commit -m "feat: include definitions in /api/search response"
```

---

## Chunk 2: Extension scaffold

**Files:**
- Create: `webextension/manifest.json`
- Create: `webextension/icons/icon-16.png`
- Create: `webextension/icons/icon-48.png`
- Create: `webextension/icons/icon-128.png`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p webextension/icons
```

- [ ] **Step 2: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Fjalor Shqip",
  "version": "1.0.0",
  "description": "Kërko fjalë në fjalorin shqip duke klikuar me të djathtën",
  "permissions": ["contextMenus", "activeTab"],
  "host_permissions": ["https://fjalor.bashk.eu/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

- [ ] **Step 3: Create placeholder icons**

Generate simple 16x16, 48x48, 128x128 PNG icons (e.g., a book "F" letter). Use any PNG or a simple script.

```bash
# If ImageMagick is available:
convert -size 128x128 xc:transparent -font Helvetica -pointsize 80 -fill "#2563eb" -gravity center -annotate 0 "F" icons/icon-128.png
convert -size 48x48 xc:transparent -font Helvetica -pointsize 30 -fill "#2563eb" -gravity center -annotate 0 "F" icons/icon-48.png
convert -size 16x16 xc:transparent -font Helvetica -pointsize 10 -fill "#2563eb" -gravity center -annotate 0 "F" icons/icon-16.png
```

Otherwise create minimal PNGs manually (or skip, the extension works without icons).

- [ ] **Step 4: Commit**

```bash
git add webextension/
git commit -m "feat: add Firefox extension scaffold"
```

---

## Chunk 3: Suffix stripping module

**Files:**
- Create: `webextension/suffixes.js`

- [ ] **Step 1: Write suffix logic**

```js
const SUFFIXES = [
  'shin', 'nit', 'nte', 'shte', 'nte',
  'së', 'të', 've', 'sh', 'n',
  'i', 'e', 'a', 'u', 't', 's', 'h'
];

function normalize(word) {
  return word.toLowerCase().replace(/ë/g, 'e').replace(/ç/g, 'c').replace(/[^a-z]/g, '');
}

function tryStrip(word) {
  const candidates = [word];
  for (const sfx of SUFFIXES) {
    if (word.length > sfx.length + 1 && word.endsWith(sfx)) {
      candidates.push(word.slice(0, -sfx.length));
    }
  }
  return [...new Set(candidates)];
}

export { normalize, tryStrip, SUFFIXES };
```

- [ ] **Step 2: Commit**

```bash
git add webextension/suffixes.js
git commit -m "feat: add Albanian suffix stripping module"
```

---

## Chunk 4: Background service worker

**Files:**
- Create: `webextension/background.js`

- [ ] **Step 1: Create background.js**

```js
import { normalize, tryStrip } from './suffixes.js';

const API_BASE = 'https://fjalor.bashk.eu/api';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'lookup-fjalor',
    title: 'Fjalor: "%s"',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'lookup-fjalor') return;
  const raw = info.selectionText.trim();
  if (!raw) return;

  const word = normalize(raw);
  searchWord(word, tab.id);
});

async function searchWord(word, tabId) {
  const candidates = tryStrip(word);
  for (const stem of candidates) {
    const results = await fetchSearch(stem);
    if (results && results.length > 0) {
      const defs = await fetchDefinitions(results);
      chrome.tabs.sendMessage(tabId, { type: 'result', word: word, results: defs });
      return;
    }
  }
  chrome.tabs.sendMessage(tabId, { type: 'result', word: word, results: [] });
}

async function fetchSearch(q) {
  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchDefinitions(results) {
  return await Promise.all(results.slice(0, 5).map(async (r) => {
    if (r.definitions && r.definitions.length > 0) {
      return { term: r.term, slug: r.slug, attributes: r.attributes, definitions: r.definitions };
    }
    try {
      const res = await fetch(`${API_BASE}/word/${r.slug}`);
      const data = await res.json();
      return data[0] || r;
    } catch {
      return r;
    }
  }));
}
```

**Note:** Manifest V3 service workers can't use `import` directly (no module support). Use `importScripts()` instead. Fix:

```js
// At top of background.js:
importScripts('./suffixes.js');
```

Remove the `export` keyword from `suffixes.js` and make them globals.

- [ ] **Step 2: Update suffixes.js for importScripts compatibility**

Remove `export` — make functions globals:
```js
// Remove: export { normalize, tryStrip, SUFFIXES };
// These are now globals for importScripts
```

- [ ] **Step 3: Commit**

```bash
git add webextension/background.js webextension/suffixes.js
git commit -m "feat: add background service worker with context menu and API calls"
```

---

## Chunk 5: Content script — popup overlay

**Files:**
- Create: `webextension/content.js`

- [ ] **Step 1: Write content script**

```js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'result') {
    showPopup(msg.word, msg.results);
  }
});

function showPopup(word, results) {
  removePopup();

  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const rect = sel.getRangeAt(0).getBoundingClientRect();

  const el = document.createElement('div');
  el.id = 'fjalor-popup';
  el.innerHTML = buildHTML(word, results);
  document.body.appendChild(el);

  positionPopup(el, rect);
  setupClose(el);
}

function buildHTML(word, results) {
  if (!results || results.length === 0) {
    return `<div class="fj-header">Fjalor: <strong>${esc(word)}</strong></div>
            <div class="fj-empty">Nuk u gjet</div>`;
  }
  let html = `<div class="fj-header">Fjalor: <strong>${esc(word)}</strong></div>`;
  for (const r of results) {
    const attrs = r.attributes && r.attributes.length ? r.attributes.join(', ') : '';
    const defs = r.definitions || [];
    html += `<div class="fj-entry">
      <div class="fj-term">${esc(r.term)} <span class="fj-attrs">${esc(attrs)}</span></div>
      <ul class="fj-defs">${defs.map(d => `<li>${esc(d)}</li>`).join('')}</ul>
    </div>`;
  }
  return html;
}

function positionPopup(el, rect) {
  const top = rect.bottom + window.scrollY + 4;
  let left = rect.left + window.scrollX;
  if (left + 420 > window.innerWidth + window.scrollX) {
    left = window.innerWidth + window.scrollX - 420;
  }
  el.style.top = top + 'px';
  el.style.left = Math.max(4, left) + 'px';
}

function setupClose(el) {
  const closer = () => { removePopup(); document.removeEventListener('click', closer); };
  document.addEventListener('click', closer);
  el.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { removePopup(); document.removeEventListener('keydown', handler); }
  });
}

function removePopup() {
  const old = document.getElementById('fjalor-popup');
  if (old) old.remove();
}

function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
```

- [ ] **Step 2: Add stylesheet injection**

Append a `<style>` block when popup is shown:

```js
function injectStyles() {
  if (document.getElementById('fjalor-styles')) return;
  const style = document.createElement('style');
  style.id = 'fjalor-styles';
  style.textContent = `
#fjalor-popup {
  position: absolute; z-index: 2147483647;
  background: #fff; color: #1a1a1a;
  border: 1px solid #d1d5db; border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 400px; max-height: 360px; overflow-y: auto;
  padding: 12px 16px;
}
#fjalor-popup .fj-header { font-size: 12px; color: #6b7280; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
#fjalor-popup .fj-entry { margin-bottom: 8px; }
#fjalor-popup .fj-term { font-weight: 600; font-size: 15px; }
#fjalor-popup .fj-attrs { font-weight: 400; color: #6b7280; font-size: 12px; margin-left: 4px; }
#fjalor-popup .fj-defs { margin: 4px 0 0; padding-left: 16px; }
#fjalor-popup .fj-defs li { margin-bottom: 2px; color: #374151; }
#fjalor-popup .fj-empty { color: #9ca3af; font-style: italic; }
@media (prefers-color-scheme: dark) {
  #fjalor-popup { background: #1f2937; color: #f3f4f6; border-color: #374151; }
  #fjalor-popup .fj-header { color: #9ca3af; border-bottom-color: #374151; }
  #fjalor-popup .fj-attrs { color: #9ca3af; }
  #fjalor-popup .fj-defs li { color: #d1d5db; }
  #fjalor-popup .fj-empty { color: #6b7280; }
}
  `;
  document.head.appendChild(style);
}
```

Call `injectStyles()` at top of `showPopup()`. Run `removePopup()` before inject.

- [ ] **Step 3: Commit**

```bash
git add webextension/content.js
git commit -m "feat: add content script with popup overlay"
```

---

## Chunk 6: Manual testing & packaging

- [ ] **Step 1: Load temporary extension in Firefox**

```bash
# In Firefox, go to about:debugging#/runtime/this-firefox
# Click "Load Temporary Add-on" → select webextension/manifest.json
```

- [ ] **Step 2: Test on any webpage**

Select an Albanian word → right-click → "Fjalor: [word]"
Expected: popup appears with definitions.

Test known words: `shtëpi`, `punoj`, `bukë`
Test inflected: `shtëpisë`, `punonte`, `bukën`

- [ ] **Step 3: Package for distribution**

```bash
cd webextension && zip -r ../fjalor-shqip.xpi . && cd ..
```

- [ ] **Step 4: Commit final**

```bash
git add webextension/
git commit -m "chore: finalize extension for testing"
```
