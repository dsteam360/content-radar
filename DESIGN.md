# Design System — Toke Haus

## Product Context
- **What this is:** Premium local cannabis dispensary with WooCommerce e-commerce
- **Who it's for:** Cannabis consumers who care about quality — experienced buyers who want to know what they're getting, not just where to buy
- **Space/industry:** Cannabis retail, competing with both chain dispensaries and lower-quality local shops
- **Project type:** E-commerce web app (WooCommerce/WordPress)
- **Memorable thing:** "Premium quality you can trust."

## Aesthetic Direction
- **Direction:** Luxury-Organic — "The apothecary that's been here 15 years"
- **Decoration level:** Intentional — subtle texture and depth, never decorative for its own sake
- **Mood:** Old-growth forest. Quiet authority. The design doesn't need to convince you of anything — it behaves like a place that's been in the neighborhood for 15 years and earned its reputation. Not corporate luxury (polished and cold), not streetwear (loud and hype). Think fine wine shop, aged-whiskey bar, well-curated bottle shop.
- **Primary mode:** Dark. Always. Light surfaces (cream `#F5F0E4`) appear only as accent backgrounds for specific sections (effect tiles, trust bars) — never as a full alternate theme.
- **Anti-patterns avoided:** No neon green/cannabis leaf clichés, no purple gradients, no generic SaaS grid layouts, no clinical white, no centered-everything hero.

## Typography

- **Display/Hero:** [Fraunces](https://fonts.google.com/specimen/Fraunces) — Optical serif with warmth and literary weight. Used for hero headings, section titles, product names in featured cards. Nothing like what other dispensaries use. Italic variant adds editorial personality.
- **Body:** [DM Sans](https://fonts.google.com/specimen/DM+Sans) — Clean, professional, readable without being generic. Used for paragraphs, nav links, descriptions, UI copy.
- **Data/Labels/UI:** [Geist Mono](https://fonts.google.com/specimen/Geist+Mono) — Monospaced, technical. Used for THC/CBD percentages, prices, grade badges, strain specs, eyebrow labels. Makes product data feel like lab information, not a menu board.
- **Loading:** Google Fonts CDN via `<link>` preconnect

### Type Scale
| Level | Size | Weight | Font | Use |
|---|---|---|---|---|
| Hero | 56–88px | 400 | Fraunces | Page hero headlines |
| H2 | 32–48px | 400 | Fraunces | Section titles |
| H3 | 20–24px | 500 | Fraunces | Card names, sub-headers |
| Body | 16px | 400 | DM Sans | Paragraphs, descriptions |
| UI Small | 13px | 500–600 | DM Sans | Nav links, button labels, tags |
| Eyebrow | 9–11px | 500 | Geist Mono | Section labels, uppercase caps |
| Data | 11–22px | 400–600 | Geist Mono | Prices, THC%, grade, stock |

## Color

- **Approach:** Restrained with intentional warmth — lime is rare and meaningful, amber is premium punctuation, parchment replaces clinical white

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0F1F0F` | Page background — near-black green, richer than pure black |
| `--surface` | `#1A4A1A` | Cards, panels, header background |
| `--surface-el` | `#234d23` | Elevated surfaces — hover states, stats bar |
| `--text` | `#E8E2D4` | Primary text — warm parchment, not clinical white |
| `--muted` | `#8BAE8B` | Secondary labels, captions, placeholder text |
| `--lime` | `#A8F080` | Primary accent — CTAs, highlights, AAAA badges, stat numbers |
| `--amber` | `#C4914A` | Secondary accent — pricing, sale indicators, premium moments |
| `--border` | `#2D6A2D` | Card borders, dividers |
| `--cream` | `#F5F0E4` | Light section backgrounds (effect tiles, trust sections only) |
| `--cream-text` | `#1C2A1C` | Text on cream sections |
| `--cream-muted` | `#5A7A5A` | Muted text on cream sections |

**Amber rationale:** No other cannabis brand uses warm amber alongside green. It reads as aged whiskey, terpenes in sunlight, craft goods. Signals expertise and care in a way that lime alone can't. Used for prices and sale signals specifically — the most trust-critical moments.

**Parchment rationale:** Clinical white on dark green feels cold and medical. Parchment (`#E8E2D4`) makes the dark sections feel aged and warm — like the product has been here a while.

**Accessibility note:** Verify `--muted` (#8BAE8B) on `--bg` (#0F1F0F) meets WCAG AA for small text. Use `--text` for any body-sized muted content if contrast fails.

## Spacing

- **Base unit:** 8px
- **Density:** Comfortable — generous whitespace, especially in hero and between sections

| Token | Value | Use |
|---|---|---|
| 2xs | 4px | Micro gaps (between badge elements) |
| xs | 8px | Tight internal padding |
| sm | 16px | Card internal padding |
| md | 24px | Component gaps |
| lg | 32px | Section sub-element spacing |
| xl | 48px | Between major components |
| 2xl | 64px | Section padding |
| 3xl | 96px | Hero vertical padding |

- **Max content width:** 1280px
- **Page horizontal padding:** 32px (desktop), 20px (mobile)

## Layout

- **Approach:** Hybrid — editorial hero sections (asymmetric, composition-first), grid-disciplined product/shop areas
- **Grid:** 12 columns, 24px gutter (desktop); 4 columns (tablet); 1 column (mobile)
- **Hero layout:** Two-column — headline + CTAs left, stat cards right. Headline is NOT centered. First viewport reads as a poster, not a document.
- **Deals grid:** **2 columns** — large cards with prominent product photography. Give the imagery room to showcase what's being sold.
- **Effect tiles:** 4 columns (desktop), 2 (mobile) on cream background
- **Border radius:** `sm: 4px` (badges, pills) · `md: 8px` (buttons, inputs) · `lg: 12px` (cards, panels) · `full: 9999px` (tags, cart bubble)

## Motion

- **Approach:** Intentional — only transitions that add comprehension or feedback, no decorative animation
- **Easing:** enter: `ease-out` · exit: `ease-in` · move: `ease-in-out`
- **Duration:** micro: 50–100ms · standard: 220ms · medium: 300ms
- **Card hover:** `translateY(-2px)` + border-color shift to lime + subtle shadow — signals interactivity without drama
- **No:** scroll-jacking, parallax, auto-playing anything, bouncy spring physics

## Components

### Buttons
- **Primary:** `background: #A8F080 · color: #0F1F0F · font-weight: 700 · border-radius: 8px · padding: 14px 24px`
- **Secondary:** `background: transparent · color: #E8E2D4 · border: 1px solid #2D6A2D · hover: border-color #8BAE8B`
- **Ghost:** `background: transparent · color: #A8F080 · border: 1px solid #A8F080`
- All buttons: `font-family: DM Sans · font-size: 13px · letter-spacing: 0.04em · min-height: 44px`

### Badges / Grade Pills
- **AAAA:** lime background `rgba(168,240,128,0.12)` · lime text · lime border
- **AAA:** amber background `rgba(196,145,74,0.12)` · amber text · amber border
- **Muted:** elevated surface bg · muted text
- All badges: `font-family: Geist Mono · font-size: 10px · letter-spacing: 0.12em · text-transform: uppercase · border-radius: 9999px`

### Deal Cards
- **Image area:** Square aspect ratio (1:1), product photo or placeholder with emoji fallback
- **Grade badge:** Absolute top-right of image
- **Strain type:** Geist Mono eyebrow (indica/sativa/hybrid + category)
- **Strain name:** Fraunces 18px
- **THC/CBD:** Geist Mono 11px, lime accent on numbers
- **Price:** Geist Mono 22px in amber · original price struck through in muted
- **CTA button:** Full-width secondary style, hover to lime primary

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-19 | Initial design system created | Based on competitive research + user approval via /design-consultation |
| 2026-04-19 | Fraunces as display font | Nothing else in the cannabis category uses an optical serif — creates immediate differentiation and authority |
| 2026-04-19 | Amber accent added (#C4914A) | No cannabis brand uses warm amber. Reads as craft, aged expertise. Used for pricing — the most trust-critical moments |
| 2026-04-19 | Parchment text (#E8E2D4) | Clinical white on dark green reads cold and medical. Parchment signals warmth and age. |
| 2026-04-19 | Dark mode primary, cream secondary | Brand is premium and dark-first. Cream surfaces used only for accent sections (effect tiles, trust bars), never as full alternate theme |
| 2026-04-19 | Deals grid 2-column | Product photography needs room. Large cards showcase what's being sold. |
| 2026-04-19 | Geist Mono for all data | Lab-data feel for THC%, prices, grades. Signals expertise. Makes the product feel scientifically curated. |
| 2026-04-24 | Full redesign — fresh CSS from mockup | Complete style.css rewrite implementing the approved mockup. Flat dark backgrounds (no gradients), card-style stats, solid grade badges (lime/amber fill not translucent), mockup-exact hero layout, footer #0A150A. All Kadence overrides preserved. |
| 2026-04-24 | Grade badges solid fill | Mockup uses solid lime (#A8F080) for AAAA and solid amber (#C4914A) for AAA — reads as a label stamp, stronger visual hierarchy than the previous translucent treatment. |
| 2026-04-24 | Hero: flat #0F1F0F, not gradient | Gradient read as generic SaaS. Flat dark is more authoritative and matches the "old-growth forest" mood. |
