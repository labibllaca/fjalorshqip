# Fjalor UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the dictionary UI: floating nav pill, info ribbon, hero search, card-based entries, bottom nav on mobile.

**Architecture:** Pure CSS/SCSS restyle + minor JSX adjustments. No new dependencies. Same data flow, same routes.

**Tech Stack:** React 18, SCSS, Vite, CSS view transitions

---

## File Structure

| File | Responsibility |
|---|---|
| `src/components/MainLayout.scss` | Layout tokens, #root flex, content centering, ribbon position |
| `src/components/MainLayout.tsx` | Structural tweaks (remove grid wrappers if any) |
| `src/components/LeftNav.tsx` | Pill styling classes, theme icon |
| `src/components/RightPanel.tsx` | Ribbon card, opacity hover |
| `src/components/WordSidebar.tsx` | Ribbon card(s): related words + etymology |
| `src/components/searchbar/SearchBar.tsx` | Hero size, autocomplete dropdown |
| `src/components/searchbar/SearchBar.module.scss` | Hero input styles, dropdown animation |
| `src/components/entries/Entries.tsx` | Card wrappers |
| `src/components/entries/Entries.module.scss` | Card styles, hover lift |
| `src/pages/WordOfTheDay.tsx` | Gradient glow wrapper |

---

### Task 1: Design Tokens + Layout Grid Removal

**Files:**
- Modify: `src/components/MainLayout.scss`

- [ ] **Step 1: Replace :root block with new tokens**

Edit `src/components/MainLayout.scss:1-18` — replace existing `:root` variables:

```scss
:root {
  --bg: #f5f5f5;
  --surface: #ffffff;
  --panel: #0f1720;
  --panel-text: #f1f5f9;
  --muted: #6b7280;
  --accent: #d53;
  --accent-hover: #c42;
  --text: #111827;
  --type-serif: 'Playfair Display', Georgia, serif;
  --type-sans: 'Inter', system-ui, sans-serif;
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-pill: 999px;
  --shadow-float: 0 4px 24px rgba(0,0,0,.06), 0 1px 4px rgba(0,0,0,.04);
  --shadow-elevated: 0 8px 32px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04);
  --max-reading: 720px;
  --nav-width: 52px;
  --ribbon-width: 260px;
  --line-height-reading: 1.8;
}
```

- [ ] **Step 2: Remove CSS grid, switch #root to flex column**

Replace `#root` block (~lines 86-93):

```scss
#root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
```

- [ ] **Step 3: Update `.content` to centered reading column**

Replace `.content` block (~lines 143-151):

```scss
.content {
  width: 100%;
  max-width: var(--max-reading);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  padding: 24px 16px;
}
```

- [ ] **Step 4: Remove `.content-footer` grid-column rules**

Replace `.content-footer` block (~lines 335-347):

```scss
.content-footer {
  max-width: var(--max-reading);
  margin: 0 auto;
  padding: 32px 16px 16px;
  width: 100%;
  font-size: 14px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/MainLayout.scss
git commit -m "refactor: new design tokens, #root flex column, centered content"
```

---

### Task 2: Floating Nav Pill

**Files:**
- Modify: `src/components/LeftNav.tsx`
- Modify: `src/components/MainLayout.scss`

- [ ] **Step 1: Replace `.left-nav` styles in MainLayout.scss**

Replace `.left-nav` block (~lines 102-110) and `.nav-icon` (~lines 111-122):

```scss
.left-nav {
  position: fixed;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  background: var(--surface);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-elevated);
  z-index: 100;
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--muted);
  border-radius: var(--radius-pill);
  transition: color .15s, background .15s;
  text-decoration: none;
}
.nav-icon:hover { color: var(--accent); background: var(--hover-bg); }
```

- [ ] **Step 2: Add bottom-nav mobile media query**

At the end of the mobile section (~line 550+), replace existing `.left-nav` mobile rules:

```scss
@media (max-width: 1024px) {
  .left-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    transform: none;
    flex-direction: row;
    justify-content: space-around;
    padding: 8px 16px;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    box-shadow: var(--shadow-elevated);
    background: var(--surface);
    z-index: 100;
  }

  #root {
    padding-bottom: 72px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MainLayout.scss
git commit -m "feat: floating nav pill desktop, bottom bar mobile"
```

---

### Task 3: Info Ribbon (RightPanel + WordSidebar → Floating Cards)

**Files:**
- Modify: `src/components/MainLayout.scss`
- Modify: `src/components/MainLayout.tsx`
- Modify: `src/components/RightPanel.tsx`
- Modify: `src/components/WordSidebar.tsx`

- [ ] **Step 1: Replace `.right-panel` styles with ribbon card**

In MainLayout.scss, replace `.right-panel` block (~lines 369-397):

```scss
.right-panel {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: var(--ribbon-width);
  background: var(--surface);
  color: var(--text);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-float);
  padding: 20px;
  opacity: .3;
  transition: opacity .3s ease, box-shadow .3s ease;
  z-index: 50;
  overflow-y: auto;
  max-height: 70vh;
}
.right-panel:hover,
.right-panel.open {
  opacity: 1;
  box-shadow: var(--shadow-elevated);
}
```

Replace `.right-panel.dismissed` block:

```scss
.right-panel.dismissed {
  opacity: .3 !important;
  box-shadow: var(--shadow-float) !important;
}
```

- [ ] **Step 2: Update panel-inner, panel-title, etc. inside right panel**

Replace `.panel-inner` and related nested styles:

```scss
.right-panel .panel-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.right-panel .panel-title {
  font-family: var(--type-serif);
  font-size: 18px;
  margin: 0;
  color: var(--text);
}
.right-panel .panel-text { margin: 0; color: var(--muted); }
.right-panel .panel-meta { font-size: 13px; color: var(--muted); }
.right-panel .panel-divider { border: none; border-top: 1px solid var(--border); margin: 8px 0; }
.right-panel .panel-attributes { display: flex; flex-wrap: wrap; gap: 6px; }
.right-panel .attr-badge {
  background: var(--hover-bg);
  color: var(--text);
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 500;
}
.right-panel .toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-size: 13px;
  color: var(--muted);
}
.right-panel .toggle-row input { accent-color: var(--accent); cursor: pointer; }
```

- [ ] **Step 3: Add ribbon card base class for WordSidebar**

Add before mobile queries:

```scss
.ribbon-card {
  position: fixed;
  right: 24px;
  width: var(--ribbon-width);
  background: var(--surface);
  color: var(--text);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-float);
  padding: 20px;
  z-index: 50;
  overflow-y: auto;
  max-height: 35vh;
}
.ribbon-card:first-of-type {
  top: calc(50% - 19vh);
}
.ribbon-card:last-of-type {
  top: calc(50% + 2vh);
}
```

- [ ] **Step 4: Update WordSidebar to use `.ribbon-card` class**

In `WordSidebar.tsx`, change `className={`word-sidebar ${panelOpen ? 'open' : ''}`}` to `className={`ribbon-card ${panelOpen ? 'open' : ''}`}`.

Add mobile media query for ribbon cards:

```scss
@media (max-width: 1024px) {
  .right-panel,
  .ribbon-card {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    top: auto;
    width: 100%;
    max-height: 60vh;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    transform: translateY(100%);
    opacity: 1;
    transition: transform .28s cubic-bezier(.4,0,.2,1);
  }
  .right-panel.open,
  .ribbon-card.open {
    transform: translateY(0);
  }
  .right-panel:hover,
  .ribbon-card:hover {
    transform: translateY(0);
    opacity: 1;
    box-shadow: var(--shadow-elevated);
  }
}
```

- [ ] **Step 5: Remove `.panel-close` absolute positioning override in mobile if needed, keep close button**

- [ ] **Step 6: Commit**

```bash
git add src/components/MainLayout.scss src/components/WordSidebar.tsx
git commit -m "feat: info ribbon with floating cards, bottom sheet on mobile"
```

---

### Task 4: Hero Search Bar

**Files:**
- Modify: `src/components/searchbar/SearchBar.tsx`
- Modify: `src/components/searchbar/SearchBar.module.scss`

- [ ] **Step 1: Update SearchBar.module.scss**

```scss
.search-bar {
  position: relative;
  width: 100%;
}

.search-input {
  width: 100%;
  padding: 16px 20px;
  font-size: 1.25rem;
  font-family: var(--type-sans);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-float);
  transition: box-shadow .2s, border-color .2s;
  outline: none;
}
.search-input:focus {
  border-color: var(--accent);
  box-shadow: var(--shadow-elevated);
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-elevated);
  z-index: 50;
  max-height: 300px;
  overflow-y: auto;
  animation: dropdownIn .2s ease-out;
}

@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Update SearchBar.tsx classes if needed** (likely just `search-bar` container wrapper)

- [ ] **Step 3: Commit**

```bash
git add src/components/searchbar/SearchBar.module.scss
git commit -m "feat: hero search input with shadow and dropdown animation"
```

---

### Task 5: Entries as Cards

**Files:**
- Modify: `src/components/entries/Entries.tsx`
- Modify: `src/components/entries/Entries.module.scss`

- [ ] **Step 1: Update Entries.module.scss**

```scss
.entries-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entry-card {
  padding: 16px 20px;
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-float);
  transition: transform .2s ease, box-shadow .2s ease;
  cursor: pointer;
  text-decoration: none;
  color: var(--text);
  display: block;
}
.entry-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.entry-term {
  font-family: var(--type-serif);
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.entry-attrs {
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 4px;
}

.entry-preview {
  font-size: 0.95rem;
  color: var(--muted);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

- [ ] **Step 2: Update Entries.tsx to wrap items in `.entry-card`**

Wrap each entry in `<Link>` or `<div>` with `className="entry-card"`. Add `.entry-term`, `.entry-attrs`, `.entry-preview` spans.

- [ ] **Step 3: Commit**

```bash
git add src/components/entries/Entries.tsx src/components/entries/Entries.module.scss
git commit -m "feat: entry cards with hover lift effect"
```

---

### Task 6: WOTD Gradient Glow

**Files:**
- Modify: `src/pages/WordOfTheDay.tsx`
- Modify: `src/components/MainLayout.scss` (add keyframes)

- [ ] **Step 1: Add glow keyframes to MainLayout.scss**

```scss
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(221, 85, 51, .15), var(--shadow-float); }
  50%      { box-shadow: 0 0 40px rgba(221, 85, 51, .25), var(--shadow-elevated); }
}
```

- [ ] **Step 2: Add wotd-card class**

```scss
.wotd-card {
  background: var(--surface);
  border-radius: var(--radius-md);
  padding: 32px 40px;
  box-shadow: var(--shadow-float);
  animation: glowPulse 3s ease-in-out infinite;
  max-width: 540px;
  width: 100%;
}
```

- [ ] **Step 3: Update WordOfTheDay.tsx**

Wrap the hero content in `<div className="wotd-card">`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/WordOfTheDay.tsx src/components/MainLayout.scss
git commit -m "feat: WOTD card with animated gradient glow"
```

---

### Task 7: Mobile Bottom Sheet for Ribbon

**Files:**
- Modify: `src/components/MainLayout.tsx`
- Modify: `src/components/MainLayout.scss`

- [ ] **Step 1: Add a FAB button for mobile in MainLayout.tsx**

Add a floating action button visible only on mobile:

```tsx
{/* Mobile FAB to open ribbon */}
<button
  className="fab-ribbon"
  onClick={toggleDrawer}
  aria-label="Hape panelin e detajeve"
>
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4M12 8h.01"/>
  </svg>
</button>
```

- [ ] **Step 2: Add FAB styles**

```scss
.fab-ribbon {
  display: none;
  position: fixed;
  right: 20px;
  bottom: 84px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  border: none;
  box-shadow: var(--shadow-elevated);
  cursor: pointer;
  z-index: 99;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1024px) {
  .fab-ribbon {
    display: flex;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MainLayout.tsx src/components/MainLayout.scss
git commit -m "feat: mobile FAB for info ribbon bottom sheet"
```

---

### Task 8: Tune Animations & View Transitions

**Files:**
- Modify: `src/components/MainLayout.scss`

- [ ] **Step 1: Tune view transition timing**

```scss
::view-transition-old(root) {
  animation: fade-out .15s ease-out;
}
::view-transition-new(root) {
  animation: fade-in .2s ease-in;
}
```

- [ ] **Step 2: Add micro-interaction to all interactive cards**

```scss
.card-lift {
  transition: transform .2s ease, box-shadow .2s ease;
}
.card-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MainLayout.scss
git commit -m "refactor: tune view transitions, add card-lift micro-interaction"
```
