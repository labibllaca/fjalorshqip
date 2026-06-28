# Fjalor UI Modernization

Date: 2026-06-28

## Goal

Modernize the dictionary app UI: airy, minimalist, high-legibility typography, floating containers instead of rigid sidebars, mobile-first bottom nav.

## Design Language

- **Aesthetic**: Modern, airy, functional. Inter/system-ui sans-serif, monochromatic + accent (#d53). Generous whitespace.
- **Containers**: Soft rounded corners (16px), soft shadows (`0 4px 24px rgba(0,0,0,.06)`), no glassmorphism.
- **Typography**: `line-height: 1.8` for definitions. Monospaced for metadata/linguistic codes.

## Layout

### Desktop

```
┌─────────────────────────────────────────────┐
│    ┌──────┐                                 │
│    │  ╱   │   Main Content (centered)        │
│    │ ╱    │   max-width: 720px               │
│    │╱     │   ┌───────────────────────┐      │
│    │ Nav  │   │     Search Bar        │      │
│    │ Pill │   │  (hero, centered)     │      │
│    │      │   ├───────────────────────┤      │
│    │  🏠  │   │                       │      │
│    │  ⭐  │   │   Definition text     │      │
│    │  📅  │   │   with generous       │      │
│    │  🎮  │   │   line-height         │      │
│    │  🌙  │   └───────────────────────┘      │
│    └──────┘                                 │
│                                 ┌────────────┴┐
│               Info Ribbon ─────▶│Related Words│
│                                 │  (card)     │
│                                 ├─────────────┤
│                                 │Etymology    │
│                                 │  (card)     │
│                                 └─────────────┘
└─────────────────────────────────────────────┘
```

- **#root**: `display: flex; flex-direction: column` (no CSS grid)
- **Nav pill**: `position: fixed; left: 24px; top: 50%; translateY(-50%)`, vertical column, `border-radius: 999px`, elevated shadow
- **Main content**: centered via `margin: 0 auto; max-width: 720px`
- **Info ribbon**: `position: fixed; right: 24px; top: 50%; translateY(-50%)`, stacked floating cards with soft shadows

### Mobile (<1024px)

- **Nav**: detaches to bottom bar (`position: fixed; bottom: 0; inset-inline: 0; flex-direction: row`)
- **Info ribbon**: hidden by default, triggered via FAB, slides up as bottom sheet (`max-height: 60vh; border-radius: 16px 16px 0 0`)
- **Content**: padding-bottom to clear bottom nav

## Component Changes

| Component | Current | New |
|---|---|---|
| `#root` | CSS grid `--left-col 1fr` | `display: flex; flex-direction: column` |
| `LeftNav` | Sticky grid col, `48px` | Fixed pill `border-radius: 999px`, `box-shadow`, mobile: bottom bar |
| `MainLayout` | Grid-based | No grid, content area handles centering |
| `RightPanel` | Fixed right, peeks 10%, dark bg | Info ribbon, floating card(s), `opacity: .3` → `1` on hover |
| `WordSidebar` | Fixed right drawer, dark bg | Same ribbon, 2 explicit cards |
| `.content` | `grid-column: 2; max-width: 880px` | `margin: 0 auto; max-width: 720px` |
| `.site-title` | 3rem on home | Keep, compact on inner pages |
| SearchBar | Plain input | Hero: larger, rounded, shadow, suggestion dropdown |
| Entries | Standard list | Cards `border-radius: 16px`, hover lift |
| WOTD | Centered text | Gradient glow card |
| Drawer toggle | Hamburger (mobile) | FAB on mobile → bottom sheet |

## Design Tokens (CSS custom props)

```css
--radius-sm: 8px;
--radius-md: 16px;
--radius-pill: 999px;
--shadow-float: 0 4px 24px rgba(0,0,0,.06), 0 1px 4px rgba(0,0,0,.04);
--shadow-elevated: 0 8px 32px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04);
--max-reading: 720px;
--nav-width: 52px;
--ribbon-width: 260px;
--line-height-reading: 1.8;
```

## Interactions

- View transitions: already set up, tune timing
- Card hover: `translateY(-2px)` + shadow lift, `transition: .2s ease`
- Search suggestions: fadeIn + slideDown, 200ms
- WOTD: animated gradient pulse on `box-shadow`
- Info ribbon: `opacity .3s ease` on hover

## Implementation Order

1. Define new CSS variables, remove grid layout from `#root`
2. Restyle `LeftNav` → floating pill + bottom bar
3. Restyle `RightPanel` / `WordSidebar` → info ribbon
4. Restyle SearchBar → hero + autocomplete
5. Restyle Entries → cards
6. Restyle WOTD → gradient glow
7. Mobile: bottom nav + bottom sheet
8. Tune animations & transitions

## Files to Modify

- `src/components/MainLayout.tsx` — restructure layout, ribbon container
- `src/components/MainLayout.scss` — new tokens, remove grid, new ribbon/nav styles
- `src/components/LeftNav.tsx` — pill styling, bottom bar variant
- `src/components/RightPanel.tsx` — ribbon card styling
- `src/components/WordSidebar.tsx` — ribbon card styling
- `src/components/searchbar/SearchBar.tsx` — hero + dropdown
- `src/components/searchbar/SearchBar.module.scss` — hero styling
- `src/components/entries/Entries.tsx` — card styling
- `src/components/entries/Entries.module.scss` — card styling
- `src/pages/WordOfTheDay.tsx` — gradient glow
- `src/pages/WordOfTheDay.module.scss` — if added, glow keyframes
