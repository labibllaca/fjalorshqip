# PWA + Firefox Extension Install Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app installable as a PWA and add a Firefox extension download link in the footer.

**Architecture:** Minimal PWA — hand-written `manifest.json` + no-op service worker, no `vite-plugin-pwa`. The extension already exists as `webextension/` and `fjalor-shqip.xpi`; we add `browser_specific_settings` for Firefox and a build step to regenerate the `.xpi`. Footer gets an extension install icon.

**Tech Stack:** Vite (static assets through `public/`), WebExtensions manifest, vanilla service worker.

---

### Task 1: PWA manifest, service worker, icons, HTML links

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Create: `public/icon.svg`
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Modify: `index.html` (add `<link rel="manifest">`, `<meta name="theme-color">`, `<meta name="apple-mobile-web-app-capable">`, `<link rel="apple-touch-icon">`)

- [ ] **Step 1: Create `public/manifest.json`**

```json
{
  "name": "Fjalor Shqip",
  "short_name": "Fjalor",
  "description": "Fjalor i gjuhës shqipe",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f5f5f5",
  "theme_color": "#d53",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Create `public/sw.js`** (no-op service worker — fulfills the install requirement without caching logic)

```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', () => {});
```

- [ ] **Step 3: Create `public/icon.svg`** — a simple "F" letter mark used as fallback:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#d53"/>
  <text x="256" y="340" font-family="Georgia, serif" font-size="320" font-weight="700" fill="white" text-anchor="middle">F</text>
</svg>
```

- [ ] **Step 4: Generate PNG icons from the SVG**

Use a one-shot script with the canvas API via Node or just create them with ImageMagick if available. Simple fallback: copy the SVG and reference it in manifest too (modern browsers accept SVG). But for full compat, generate PNGs:

```bash
# If ImageMagick is available:
convert -background none -size 192x192 public/icon.svg public/icon-192.png
convert -background none -size 512x512 public/icon.svg public/icon-512.png

# Fallback: just use the SVG itself (browsers that support PWA all support SVG icons now)
```

If ImageMagick isn't available, skip PNG generation and reference the SVG directly:

```json
"icons": [
  { "src": "/icon.svg", "sizes": "512x512", "type": "image/svg+xml" }
]
```

- [ ] **Step 5: Update `index.html` `<head>`** — add PWA link and meta tags after the existing `<title>` line:

```html
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#d53" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
```

- [ ] **Step 6: Verify build and tests**

Run: `npm run build`
Expected: `public/manifest.json`, `public/sw.js`, and icons are copied into `dist/` by Vite.

Then verify `dist/manifest.json` and `dist/sw.js` exist.

- [ ] **Step 7: Commit**

```bash
git add public/manifest.json public/sw.js public/icon.svg public/icon-192.png public/icon-512.png index.html
git commit -m "feat: add PWA support (manifest, service worker, icons)"
```

---

### Task 2: Firefox extension metadata and build step

**Files:**
- Modify: `webextension/manifest.json` (add `browser_specific_settings` for Firefox)
- Modify: `package.json` (add `build:ext` script)
- Create: `scripts/build-ext.mjs`

The existing `fjalor-shqip.xpi` at the project root may be stale. We add a reproducible build script.

- [ ] **Step 1: Add `browser_specific_settings` to `webextension/manifest.json`**

Add after `"manifest_version": 3,`:

```json
  "browser_specific_settings": {
    "gecko": {
      "id": "fjalor@shqip.dev",
      "strict_min_version": "115.0"
    }
  },
```

- [ ] **Step 2: Create `scripts/build-ext.mjs`** — packages the extension into `.xpi` (which is just a zip)

```js
import { execSync } from 'child_process';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EXT_DIR = resolve(ROOT, 'webextension');
const OUT_DIR = resolve(ROOT, 'dist');
const XPI = resolve(ROOT, 'fjalor-shqip.xpi');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// Clean old
if (existsSync(XPI)) rmSync(XPI);

// .xpi is a ZIP file
execSync(`cd "${EXT_DIR}" && zip -r "${XPI}" . -x "*.DS_Store"`, { stdio: 'inherit' });
console.log(`Extension packaged → fjalor-shqip.xpi`);
```

- [ ] **Step 3: Add npm script to `package.json`**

Add to `"scripts"` block:

```json
    "build:ext": "node scripts/build-ext.mjs",
```

- [ ] **Step 4: Run the build script to verify**

Run: `npm run build:ext`
Expected: `fjalor-shqip.xpi` is created/recreated at project root.

Test: `unzip -l fjalor-shqip.xpi` should list `manifest.json`, `background.js`, `content.js`, etc.

- [ ] **Step 5: Commit**

```bash
git add webextension/manifest.json scripts/build-ext.mjs package.json
git commit -m "feat: add Firefox extension build step and gecko ID"
```

---

### Task 3: Footer extension install link

**Files:**
- Modify: `src/components/MainLayout.tsx` (add extension icon + link after GitHub link)

The link points to `/fjalor-shqip.xpi` (served from the project root by the Express static server). Brief inline SVG for the Firefox icon.

- [ ] **Step 1: Add Firefox extension link to `MainLayout.tsx` footer**

Add after the GitHub `<a>` tag (after line 69):

```tsx
          <a href="/fjalor-shqip.xpi" className="footer-icon" aria-label="Instalo shtesën për Firefox" download>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          </a>
```

The SVG is a generic puzzle-piece/download icon. The `download` attribute hints the browser to download rather than navigate. The link is relative so it works in dev and production.

- [ ] **Step 2: Verify the extension file is served**

In development (`npm run dev`), the `public/` directory is served by Vite, but `fjalor-shqip.xpi` is at the project root, not in `public/`. The Express server (`server.mjs`) serves `dist/` in production.

Fix: copy `fjalor-shqip.xpi` into `public/` during dev and into `dist/` during build.

Add to `scripts/build-ext.mjs` — after zipping, also copy to `public/`:

```js
// Also copy to public/ for dev serving
cpSync(XPI, resolve(ROOT, 'public/fjalor-shqip.xpi'));
```

And update the build script to copy to dist:

```js
cpSync(XPI, resolve(OUT_DIR, 'fjalor-shqip.xpi'));
```

The footer link should point to `/fjalor-shqip.xpi` (Vite serves `public/` at root in dev, and `dist/` is served in production by Express).

- [ ] **Step 3: Verify build and appearance**

Run: `npm run build:ext && npm run build`
Expected: `dist/fjalor-shqip.xpi` exists. `public/fjalor-shqip.xpi` exists.

Verify no test breakage:
Run: `npx vitest run`
Expected: 17/17 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/MainLayout.tsx scripts/build-ext.mjs public/fjalor-shqip.xpi
git commit -m "feat: add Firefox extension install link in footer"
```

---

### Verification

- [ ] Run full test suite: `npx vitest run` → 17/17 pass
- [ ] Run full build: `npm run build:ext && npm run build` → exits 0
- [ ] Confirm `dist/manifest.json` exists with correct content
- [ ] Confirm `dist/sw.js` exists
- [ ] Confirm `dist/fjalor-shqip.xpi` exists
- [ ] Confirm `dist/icon-192.png` and `dist/icon-512.png` exist (or `dist/icon.svg`)
- [ ] Confirm `dist/index.html` contains `<link rel="manifest">`, `<meta name="theme-color">`, apple meta tags
