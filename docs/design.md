# Fjalor Shqip — Design Tokens

## Brand
```yaml
name: Fjalor Shqip
tagline: Fjalor i gjuhës shqipe
accent: '#d53'
```

## Colors

| Token | Light | Sepia | Dark | Description |
|---|---|---|---|---|
| `--bg` | `#f8f8f5` | `#f4ede1` | `#0d1117` | Page background |
| `--surface` | `#ffffff` | `#fdf6ec` | `#161b22` | Card/surface background |
| `--panel` | `#0f1720` | `#2c1f0e` | `#010409` | Sidebar panel bg |
| `--panel-text` | `#f1f5f9` | `#f4ede1` | `#e6edf3` | Panel text color |
| `--text` | `#111827` | `#3b2f1e` | `#e6edf3` | Body text |
| `--muted` | `#6b7280` | `#8a7560` | `#8b949e` | Secondary/muted text |
| `--accent` | `#d53` | `#d53` | `#d53` | Primary accent (#dd5533) |
| `--accent-hover` | `#c42` | `#c42` | `#c42` | Accent hover |
| `--card-bg` | `#ffffff` | `#fdf6ec` | `#161b22` | Card background |
| `--border` | `#e5e7eb` | `#d6c9b3` | `#30363d` | Borders/dividers |
| `--hover-bg` | `#f3f4f6` | `#f0e6d4` | `#1c2128` | Hover state bg |
| `--color-success` | `#16a34a` | `#16a34a` | `#22c55e` | Success/valid |
| `--color-error` | `#dc2626` | `#dc2626` | `#ef4444` | Error/invalid |

## Typography

| Token | Value | Usage |
|---|---|---|
| `--type-serif` | `'Playfair Display', Georgia, serif` | Headings, terms |
| `--type-sans` | `'Inter', system-ui, sans-serif` | Body, UI |
| `--line-height-reading` | `1.8` | Definition line height |

### Type scale
- Site title: 3rem / 700 / serif (home), 1.8rem (mobile)
- Page heading: 1.8rem / 700 / serif (`--type-serif`)
- Entry term: 1.8rem / 700 / serif
- WOTD term: `clamp(1.8rem, 8vw, 4rem)` / 600 / serif
- Body: 1rem / 400 / sans (`--type-sans`)
- Definition: 1.15rem / 400 / sans (WOTD), 1rem / 400 / sans (entries)
- Small/meta: 0.85rem / 400 / sans
- Input: 1.15rem–1.25rem / 400 / sans

## Spacing scale

| Token | Value |
|---|---|
| `--gap` | `24px` |

Common values: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px

## Border radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `8px` | Buttons, small surfaces |
| `--radius-md` | `16px` | Cards, panels, inputs |
| `--radius-pill` | `999px` | Nav pill, badges |

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-float` | `0 4px 24px rgba(0,0,0,.06), 0 1px 4px rgba(0,0,0,.04)` | Cards, inputs default |
| `--shadow-elevated` | `0 8px 32px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04)` | Hover, modals, dropdowns |

Dark theme shadows use higher opacity (0.4–0.5 range).

## Layout

| Token | Value | Description |
|---|---|---|
| `--max-reading` | `720px` | Max content width |
| `--nav-width` | `52px` | Desktop nav width |
| `--ribbon-width` | `260px` | Side ribbon width |

## Breakpoints

| Name | Width | Behavior |
|---|---|---|
| Desktop | `>1024px` | Floating nav pill left, ribbon cards right |
| Tablet/Mobile | `≤1024px` | Bottom nav bar, ribbon as bottom sheet |
| Small mobile | `≤600px` | Single column, compact padding |

## Motion

| Property | Value |
|---|---|
| Default duration | 200–300ms |
| Max duration | 400ms |
| Easing (enter) | `ease-out` |
| Easing (exit) | `ease-in` |
| Easing (move) | `cubic-bezier(.4,0,.2,1)` |
| Hover lift | translateY(-2px) + shadow, 200ms ease |
| Reduced motion | All animations disabled via `prefers-reduced-motion` |
