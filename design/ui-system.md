# Teacher & student site: "kit parts"

The look of everything under `src/app/(site)` (Studio has its own, in `src/app/admin/studio.css`).
Goal: professional enough for a teacher, friendly enough for a 9 to 16 year old, built around CurioCrate blue.

References studied (Nov 2026): Apple product pages (one headline, the product big, clear ways in), Duolingo and
Brilliant (pressable buttons and tiles), Mystery Science and Seesaw (bold brand-color fields instead of grey).

## Rules

1. **One color family around CurioCrate blue (#1b7fe8).** Blue is the brand field (the home hero) and the action
   color. Navy is the ink. Pale sky tints separate sections. No other accent colors.
2. **Kit colors are blue's neighbors** (teal, indigo, violet), so they sit with the blue instead of fighting it.
   They only mark "belongs to this kit" (stripes, dots, icons) via `data-cap="lum|blue|gold"`.
3. **Status colors only for status.** Green means something succeeded, amber is a warning, red is an error.
4. **A ledge means you can press it.** Buttons, filter chips and clickable tiles have a solid bottom edge and sink
   when pressed. Panels you can't click are flat (2px border, no shadow).
5. **Light and dark follow the device** (`prefers-color-scheme`). Every color is a token with a dark value; never
   use a surface color as text or a text color as a background. Filled blue buttons use `--sx-fill`
   (white text, AA in both modes); blue text uses `--sx-accent` (lighter in dark mode).
6. **2px edges everywhere.** Radius grows with size: 8 tags, 12 buttons and inputs, 16 rows, 20 panels, 28 home tiles.

## Landing page

Read top to bottom in three seconds:
1. Full-width blue hero: product name, one headline, one line, two buttons (Teacher sign in, Try the demo).
2. The product, big: the interactive example class overlapping the blue (seats light up as students join).
3. Where to go: Teachers tile, Students tile, a wide navy "Try a real lab" tile with the kit's tube art.
4. How it works (3 numbered steps), then the two promises (NGSS, privacy).

## Type

- Headings and buttons: **Gabarito** 700 to 800 (`--font-label`).
- Everything you read: **Lexend** 400, 600 for emphasis (`--font-read`, mapped to `--font-body` inside `.site`).
  Lexend was designed to make reading easier. Body is 16px.
- Class and kit codes: JetBrains Mono (students type them, so each character must be unambiguous).
- No all-caps labels. Eyebrows are sentence case, blue, 14px.

## Colors

All values live in `src/styles/tokens.css` (`.site, html:has(.site)`, with a `prefers-color-scheme: dark` block).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--sx-brand` / `--sx-hero` | #1b7fe8 | #1b7fe8 | CurioCrate blue: hero, seat squares, decoration |
| `--sx-fill` | #1670d4 | #1670d4 | Filled buttons, switches, pressed chips |
| `--sx-accent` | #1670d4 | #6cb2ff | Blue text and icons |
| `--sx-heading` | #0b1b3a | #eef4ff | Headings |
| `--sx-bg` / `--sx-surface` | #fff / #fff | #0a1324 / #101d35 | Page and panels |
| `--sx-sky` | #ebf4ff | #0e2142 | Section tiles, selected rows |
| `--sx-navy` | #0b1b3a | #102244 | Demo tile, kit art |

## Specificity note

`site.css` styles headings with `.site :is(h1, h2…)` (specificity 0,1,1 to 0,2,0). A module class alone loses to it,
so a heading that needs a different color or size uses an element in its selector, e.g. `.hero h1.display`,
`.tile h2.tileTitle`, `.footer h2.label`.
