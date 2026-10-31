# Curiocrate brand: extracted from the live site

Source: https://curiocrate.org. Extracted 2026-10-30 with headless Chromium (Playwright 1.64). The site is a
Vite + React app styled with Tailwind v4 plus custom CSS. Styles only exist after JavaScript runs, so every value
below is a **computed style** read in the browser, not guessed from HTML.

Raw data (all reproducible with `node scripts/brand/extract.mjs` and `node scripts/brand/hover-probe.mjs`):

| File | Contents |
| --- | --- |
| `design/raw/computed-styles.json` | Computed styles for header, headings, paragraphs, links, buttons, inputs, cards and footer on all 12 nav pages |
| `design/raw/hover-states.json` | Before/after hover styles for nav, hero CTAs, footer links; dropdown panel; scrolled header |
| `design/raw/css-meta.json` | `:root` custom properties, font imports, loaded font faces |
| `design/raw/index-DZcDZhH6.css` | The site's compiled stylesheet |
| `design/reference/*.png` | Full-page and viewport screenshots of every nav page at 1440px and 1366x768 |

Pages visited: `/`, `/kits/luminol`, `/demo`, `/kits`, `/newsletter`, `/initiatives/teaching`, `/initiatives/sap`,
`/initiatives/kits`, `/chapters`, `/gallery`, `/team`, `/contact`.

## Fonts

The site loads all fonts with one Google Fonts stylesheet (CSS `@import` inside its bundle):

```
https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Barlow+Condensed:wght@500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400&display=swap
```

We load the same URL as a `<link rel="stylesheet">` with `preconnect`. That is the same source, files and
`display=swap`; a link is fetched in parallel instead of after the CSS bundle.

| Role | Family | Weights / sizes seen | Notes |
| --- | --- | --- | --- |
| Display headings (h1, h2, section titles, card titles) | **Cormorant Garamond**, serif | 300 and 400. h1 72-96px, line-height 1.0-1.1, letter-spacing -0.02em to -0.03em. h2 52-68px, -0.02em. h3 22-40px | Second line of a headline is often *italic* in pastel blue, e.g. "Science for every / *curious mind.*" |
| Body | **Plus Jakarta Sans**, system-ui, sans-serif | 400 (body), 600 (small CTA pill), 700 (labels). 16px/24px base; lead 17-19px/1.6; small 13-15px/1.7-1.9 | `body` color `#e8f4fd` |
| Nav, buttons, eyebrows, meta | **JetBrains Mono**, monospace | 400 (700 on kit pages). 11px, letter-spacing 3px, UPPERCASE. Eyebrow `.label`: 9-10px, 4px tracking, pastel1 at 70% opacity | Language toggle 10px, 1.5px tracking |
| Kit/product display (Luminol pages only) | **Barlow Condensed** | 700, uppercase, 46-92px, line-height 0.98 | Used by the kit marketing pages; we use it for kit names on kit cards |

## Colors

`:root` custom properties defined by the site (exact):

| Token | Value | Use on site |
| --- | --- | --- |
| `--void` | `#03050f` | Page background (`body`) |
| `--deep` | `#060d1f` | Dropdown panels (at 95%), map bg |
| `--mid` | `#0f2044` | Hover fill on map controls |
| `--navy` | `#162a5c` | Deep accent |
| `--pastel1` | `#a8d4f0` | Primary accent: Donate button bg, links, eyebrows, focus |
| `--pastel2` | `#c5e3f7` | Muted text base (used at 55%, 40% alpha) |
| `--pastel3` | `#dff0fb` | Light accent |
| `--cream` | `#f0f7ff` | Headings, active nav text |
| `--glow` | `#a8d4f059` | Glows |
| `--glow2` | `#a8d4f014` | Faint fills |
| `--gold` | `#f0c070` | Warnings / "in progress" dashed borders |
| `--text` | `#e8f4fd` | Body text |
| `--muted` | `#c5e3f78c` | Muted text (pastel2 at 55%) |

Computed colors observed (most frequent first):

| Purpose | Value |
| --- | --- |
| Body text | `rgb(232,244,253)` = `#e8f4fd` |
| Heading text | `rgb(240,247,255)` = `#f0f7ff`; some card titles `#ffffff` |
| Muted text / inactive nav / footer links | `rgba(197,227,247,0.55)` |
| Very muted (mobile menu inactive) | `rgba(197,227,247,0.4)` - fails contrast, see DECISIONS |
| Hero subtitle | `rgba(197,227,247,0.78)` |
| Footer copyright | `rgba(168,212,240,0.25)` - fails contrast, see DECISIONS |
| Accent link / "Become a member" text | `#a8d4f0` |
| Text on pastel button | `rgb(6,16,31)` = `#06101f` |
| Kit-page glow accent ("lum") | `#46e3d3` (rgb 70,227,211); text on it `#02201d` |
| Kit-page text | `#e4f3f0`; muted `rgba(214,238,233,0.66)` |
| Kit-page surfaces | `#041315`, `#06191c`, `#020b0c`; chips `rgba(10,34,37,0.72)` |
| Kit-page paper | `#e8d8b0` with text `#2b2416` |
| Footer star logo blue | `#1b7fe8` |

Borders are always `1px solid` pastel1 at low alpha: `0.06` (footer top), `0.1-0.12` (cards, dropdowns),
`0.15` (active nav), `0.22-0.25` (secondary buttons), `0.3` (small CTAs), `0.5` (primary glass button).

## Header

`nav.cn-nav`, `position: fixed`, full width, height 94px, padding `18px 36px`, transparent background. When the page
scrolls it gets `backdrop-filter: blur(18px)` (still transparent), transition `transform .5s cubic-bezier(.4,0,.2,1), background .4s`.

- Logo: `public/brand/cclogofull5.png` (1026x332) shown at **179x58**, left, with `filter: drop-shadow(0 0 10px rgba(168,212,240,.5))`.
- Links on the right: JetBrains Mono 11px / 3px tracking / uppercase, padding `8px 14px`, radius 4px,
  color `rgba(197,227,247,.55)` -> hover `#c5e3f7`/`#f0f7ff` (0.3s). Active: color `#f0f7ff`, bg `rgba(168,212,240,.08)`,
  border `1px solid rgba(168,212,240,.15)`.
- Dropdowns ("Kits ▾"): panel bg `rgba(6,13,31,.95)`, border `1px solid rgba(168,212,240,.12)`, radius 12px, padding 8px,
  shadow `0 16px 48px rgba(0,0,0,.4)`, `backdrop-filter: blur(24px)`; items JetBrains Mono 11px/2px tracking, radius 8px,
  padding `10px 16px`, active item bg `rgba(168,212,240,.08)` color `#a8d4f0`.
- EN/ES pill toggle: radius 18px, active chip bg `rgba(168,212,240,.16)`.
- "Become a member": outline button, color `#a8d4f0`, border `rgba(168,212,240,.25)`; hover bg `rgba(168,212,240,.1)` + glow `0 0 20px rgba(168,212,240,.15)`.
- "Donate": filled, bg `#a8d4f0`, text `#06101f`, padding `8px 16px`; hover glow `0 0 20px rgba(168,212,240,.15)`.
- Mobile: full-screen menu with Cormorant Garamond 38px/300 links.

## Footer

`footer`: bg `rgba(3,5,15,.6)` + `backdrop-filter: blur(20px)`, top border `1px solid rgba(168,212,240,.06)`,
padding `56px 40px 40px`. Inner max-width **1100px**, 4 columns: brand (star logo + 13px tagline, muted, max-width 200px)
then three link columns **Explore / Connect / Program**. Column labels use `.label`: JetBrains Mono 9px, 4px
tracking, uppercase, `#a8d4f0` at 70% opacity. Links: Plus Jakarta Sans ~14px, `rgba(197,227,247,.55)`, hover
`#c5e3f7` (`transition: color .2s`). Bottom bar: top border `rgba(168,212,240,.05)`, padding-top 24px,
JetBrains Mono 10px / 2px tracking: "© 2026 CURIOCRATE · 501(c)(3) NONPROFIT" left, "curiocrate.org" right.

## Buttons

| Variant | Values |
| --- | --- |
| Glass primary (hero) | JetBrains Mono 11px / 3px / uppercase; padding `13px 28px`; radius **3px**; bg `rgba(168,212,240,.12)`; border `1px solid rgba(168,212,240,.5)`; `backdrop-filter: blur(12px)`; color `#f0f7ff`. Hover: bg `.2`, shadow `0 0 24px rgba(168,212,240,.2)`. Transition .35s |
| Glass secondary | same, color `rgba(197,227,247,.7)`, border `rgba(168,212,240,.22)`, transparent. Hover: color `#f0f7ff`, bg `.2`, border `.65` |
| Small outline CTA ("Apply now →") | JetBrains Mono 10px / 2.5px; padding `10px 22px`; radius 3px; color `#a8d4f0`; border `rgba(168,212,240,.3)` |
| Nav filled (Donate) | bg `#a8d4f0`, text `#06101f`, radius 4px |
| Kit primary (`lum-btn--primary`) | JetBrains Mono 12px/700/2.5px; padding `15px 26px`; radius 6px; bg `#46e3d3`, text `#02201d`. Hover: `0 0 28px rgba(70,227,211,.45)`, `translateY(-1px)` |
| Kit ghost | border `rgba(70,227,211,.4)`, text `#e4f3f0`; hover bg `rgba(70,227,211,.1)`, border `#46e3d3` |
| Announcement pill | Plus Jakarta Sans 15px/600; bg `rgba(3,5,15,.65)`; radius 6px; padding `8px 16px`; teal underline glow |

## Cards and surfaces

| Surface | Values |
| --- | --- |
| Glass card (contact, newsletter) | bg `rgba(8,16,42,.5)`/`rgba(8,15,38,.6)`; border `1px solid rgba(168,212,240,.1-.12)`; radius **14-20px**; padding `48px 48px 40px`; `backdrop-filter: blur(8-24px)` |
| Feature card (kit highlight) | bg `#041315` + `radial-gradient(60% 80% at 85% 50%, rgba(70,227,211,.16), transparent 70%)`; border `1px solid rgba(70,227,211,.35)`; radius **18px**; padding 52px; shadow `0 30px 80px rgba(0,0,0,.45)` |
| News card | radius 18px, image with dark gradient overlay, mono meta row with dot + category |
| Chip / tag | radius 999px; padding `10px 16px`; bg `rgba(10,34,37,.72)`; border `rgba(70,227,211,.3)`; 15px/600 |
| List row | radius 10px; padding `16px 18px`; bg `rgba(10,34,37,.72)`; border `rgba(70,227,211,.16)`; in-progress: `1px dashed rgba(240,192,112,.5)` |
| Input | height 48px; padding `0 14px`; radius 8px; bg `rgba(2,10,11,.6)`; border `rgba(70,227,211,.3)`; label 14px/700 |

Radii used, by frequency: 8px, 4px, 6px, 18px, 3px, 999px, 10px, 12px, 14px, 20px.

## Spacing and layout

- Base unit: Tailwind `--spacing: .25rem`.
- Content max-width: **1100px** (footer, sections at 170px side margin on 1440); kit pages **1056px**; wide sections 1200-1360px.
- Section padding: 96-140px vertical, 40px horizontal (`home-section`: `120px 40px`).
- Page title pattern (inner pages): mono eyebrow (e.g. "GET IN TOUCH") → Cormorant h1 (80-96px/300) → muted 17px lead, centered or left.
- Background: `--void` with a sparse **star field** (1-2px white dots, a few soft blurred glows) across all pages.
- Motion: `cubic-bezier(.4,0,.2,1)`, .15-.4s transitions; scroll-reveal fades.

## Logo and icon files (`public/brand/`)

| File | Size | Use |
| --- | --- | --- |
| `cclogofull5.png` | 1026x332 | Header wordmark (white "CurioCrate™" with star and orbit). Shown at 179x58 |
| `cclogosmall.png` | 1080x1080 | Favicon (`<link rel="icon">`) and footer star mark (shown at 40x40, margin-bottom 16px). Blue star + orbit on transparent bg |

Used as-is; no recolor, redraw or stretch (aspect ratio locked). The site has no `/favicon.ico`,
`apple-touch-icon` or web manifest (those URLs return the SPA's HTML), so `cclogosmall.png` is the only icon.

## Values we could not read

- **Header background after scroll**: computed bg stays `rgba(0,0,0,0)`; only `backdrop-filter: blur(18px)` is
  applied. Nothing else to read.
- **Star field**: drawn by script at runtime, not CSS, so we can't read exact star positions or animation timing.
  We rebuild it with static CSS gradients that look the same (see DECISIONS).
- `/demo` desktop screenshot timed out once (heavy WebGL demo); the Chromebook screenshot of `/demo` was captured.
