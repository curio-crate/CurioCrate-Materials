# Teacher & student site: UI system ("the crate label")

The teacher and student site (`.site`, everything under `src/app/(site)`) is a tool, not a statement page. It borrows
its look from the physical kit's printed matter: the label on the side of the crate, the colored caps on the sample
tubes, the code card in the lid. Studio (`.studio`) is a separate product with its own look and is not covered here.

Tokens live only in `src/styles/tokens.css` (the `.site` block). `scripts/check-theme.mjs` fails the build on any
literal color or font anywhere else. Shared primitives are in `src/app/(site)/site.css`.

## 1. Principles

1. **Two colors, two jobs, never mixed.** CurioCrate blue (`--sx-accent` #1670d4) means *you can act on this*: links,
   buttons, switches, focus. A kit's **cap color** means *this belongs to that kit*: dots, stripes, rail lines, icon
   tints. Cap colors are never used for buttons; blue is never used to identify a kit.
2. **One loud thing per page.** On a kit page it is the crate label's hatch band; on the home page it is the headline
   and the live class preview. Everything else is quiet.
3. **Structure is information.** Numbers only where there is an order (lessons A.0 to A.5, the three set-up steps,
   lesson steps). Dashed lines mean "tear here", "not yet" or "empty slot". Tickets mean "a code you type".
4. **Prefer removing UI.** No sticky header, no catalog, one demo, no decorative gradients or grids.
5. **Words:** sentence case, plain verbs, no tracked-out capitals, no "·"-joined meta strings, no "→" added to link
   text (use the `arrow` icon, which nudges on hover).

## 2. Tokens

### Color

| Token | Value | Use |
| --- | --- | --- |
| `--sx-bg` | #f4f6fa | Page (the bench) |
| `--sx-surface` | #ffffff | Panels, rows, inputs (paper) |
| `--sx-sunken` | #eef2f7 | Tracks, chip counts, skeletons |
| `--sx-border` / `-strong` | #dfe6ef / #c6d2e1 | Hairlines / control outlines |
| `--sx-heading` | #0c1a30 | Night ink: headings, pressed chips |
| `--sx-text` / `--sx-muted` | #2a3950 / #56667c | Body / secondary (AA on white and bench) |
| `--sx-accent` | #1670d4 | Actions (4.9:1 on white) |
| `--sx-brand` | #1b7fe8 | Decoration only (meters, current-page bar, focus ring) |
| `--sx-cap-lum` / `-ink` | #12a391 / #0b7366 | Kit cap: teal glow (Luminol) |
| `--sx-cap-gold` / `-ink` | #e5a02e / #8a5a00 | Kit cap: gold (Circuits) |
| `--sx-cap-blue` / `-ink` | #5a5fd8 / #4146b8 | Kit cap: night indigo (Clean Water) |
| `--sx-success`, `--sx-warning`, `--sx-danger` | #08694f, #8a5a00, #b8322a | Status, each with a `-soft` tint |

**Kit caps are data-driven.** `kits.accent` (Studio → Kits → "Card style": `lum` / `gold` / `blue`) is written to
`data-cap` on any wrapper; `site.css` maps it to `--cap` (decoration) and `--cap-ink` (AA text). Tints are derived with
`color-mix(in srgb, var(--cap) 12%, transparent)`, so a new cap needs only two tokens and one `[data-cap]` rule.

### Type

| Role | Family | Settings |
| --- | --- | --- |
| Headings, kit names, big numbers | Bricolage Grotesque (variable) | 700–800, `font-stretch` 82–92%, tracking −0.02 to −0.04em |
| Interface and reading | Plus Jakarta Sans | 400–700; 15px UI, 16px reading, line-height 1.55 / 1.75 |
| Codes people type (class, kit, school) | JetBrains Mono 500 | Ticket component only |

Scale (`--sx-fs-*`): 12 · 13 · 15 · 16 · 18 · 22 · 28 · 38 · 52 · 68px. Reading measure ≤ 68ch; leads ≤ 62ch.

### Space, shape, elevation

- Space: 4px steps (`--sx-1` 4 … `--sx-24` 96). Page gutter 32px, 16px under 720px.
- Radius grows with size: tags 6, controls 10, rows 12, panels 16, crate labels and hero panels 22, chips pill.
- Elevation: a crisp edge first (`--sx-shadow-sm`), a soft drop only when something is hovered or floats
  (`--sx-shadow`, `--sx-shadow-lg`). Hover never lifts lists; it darkens the border and deepens the shadow.

### Motion

| Token | Value | Use |
| --- | --- | --- |
| `--sx-ease` | cubic-bezier(.22, 1, .36, 1) | Entrances, hovers |
| `--sx-ease-in-out` | cubic-bezier(.65, 0, .35, 1) | Things that move and stay |
| `--sx-ease-exit` | cubic-bezier(.4, 0, 1, 1) | Leaving (dialog close) |
| `--sx-spring` | `linear()` spring: stiffness 380, damping 28, mass 1 (ζ≈0.72, ~4% overshoot) | Switch knobs, presses, chips, ToC marker, dialog scale |
| `--sx-t-press` / `-hover` / `-enter` / `-toggle` / `-page` | 120 / 180 / 360 / 480 / 420ms | |

Rules: hover = color/border only (180ms). Press = `scale .97` on the spring. Page change = fade + 6px rise (420ms,
`template.tsx`). Filtered items = fade + 4px rise, 28ms stagger capped at 8 items. Skeletons only appear after 150ms.
`prefers-reduced-motion` turns every animation into an instant change (globals.css).

## 3. Components (site.css unless noted)

| Component | Structure | States |
| --- | --- | --- |
| `.btn` (+ `-solid`, `-ghost`, `-danger`, `-danger-solid`, `-sm`, `-lg`) | inline-flex, gap 8, heights 34 / 40 / 48 | hover border→muted; active scale .97; disabled .55 |
| `.sx-chip` in `.sx-chips` | pill toggle with `.sx-chip-count` | `aria-pressed="true"` = night ink fill |
| `.sx-switch` | 42×24 track, 18px knob | knob travels on the spring; stretches to 22px while pressed; `aria-busy` while saving |
| `.sx-ticket` (`-sm`) | dashed border, notched ends, mono | static; used by `CopyCode` |
| `.sx-dot` | 8px cap dot with 3px halo | names a kit in crumbs, results, headings |
| `.sx-empty` | dashed panel: bold line + one sentence + the one action that fills it | — |
| `.sx-dialog` | native `<dialog>`, 440px, scrim `--sx-scrim` | opens: scale .96→1 on spring; closes: 140ms fade |
| `.sx-skel` | shimmer block | used by `(site)/loading.tsx` |
| `ContentRow` / `ContentList` (components/content) | grid `44px / 1fr / auto`; whole row is the link | hover tint + arrow nudge; locked = muted icon + "Locked" pill; `step` puts it on the numbered rail |
| `AssignSwitch` (components/ui) | switch inside a form (works without JS) | optimistic, saves via `/api/classes/assign` with `keepalive`, reverts and announces on failure |
| `ConfirmButton` (components/ui) | trigger + modal; place inside the form it submits | Cancel is focused first; Escape and backdrop click cancel |

## 4. Views

**Header** (static): brand, 3–4 links that fill the bar's height, actions. The current page gets a 2px blue bar on the
header's bottom edge; hover previews a short grey bar.

**Home**: `[copy 1.05fr][live class preview 1fr]`, then the three set-up steps as a dashed procedure line where each
step shows the real thing you handle (kit code ticket, class code, switch), then the two student ways in.

**Dashboard**
```
Lincoln Middle School
Welcome back, Dana.                         [Redeem a kit code] [+ New class]
[ search every lesson, lab and handout ...                            / ]
(Lesson 10) (PDF 9) (Video 5) (Online lab 3) (Training 3)
┌ Your kits ─────────────────────┐  ┌ Classes        2 of 6 ┐
│ ▞[art] Luminol   ▞[art] Circuit│  │ Period 3   ▭KQWMTR    │
│ ▞[art] Water     ▞[art] ...    │  │ Period 5   ▭TETEWY    │
│ Recently opened (list)         │  │ School code, links    │
└────────────────────────────────┘  └───────────────────────┘
```
Typing or choosing a type swaps everything below the search for a result list (matches marked, open items first).
`/` focuses search from anywhere; Escape clears.

**Kit page**
```
Dashboard › ● Luminol
┌▞ Luminol Forensics Kit                     ┌──────────┐ ┐
│▞ REAL FORENSIC CHEMISTRY.                  │ kit art  │ │ crate label
│▞ description                               └──────────┘ │
│▞ [Grades 6–8 | Lessons 6 | Class time 4 h 20 min]       │
├┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┤ tear line
│  🔒 The free lessons are open. Redeem...     [Redeem code]│
└──────────────────────────────────────────────────────────┘
(Everything 9) (Lessons 6) (Online lab 1) (Teacher resources 1) (Training 1)
Lessons  Taught in order                     │ NGSS alignment (codes + names,
 (A.0)─ Predict: How faint…        →         │   practices folded away)
   ┊                                          │ What students learn
 (A.1)┄ Why it glows             Locked       │ In the box
```

**Lesson page**: crumbs with kit dot; kicker line (cap rule + kit name, type and section, minutes); title; lead; NGSS.
Aside (sticky): *Teach this* first (one switch per class, then Print / Copy link / Google Classroom), then *On this
page* with a sliding cap-colored marker that follows the reader. Steps are numbered in the kit's cap ink.

**Class page**: code ticket, seats meter, assigned count; *What students see* grouped by kit (cap dot, "n of m
assigned") with instant switches; roster; results; Curie.AI; settings with a confirm dialog for delete.

**Student pages**: the same rows with kit caps; empty states tell the student what will appear and when.

## 5. UX changes and why

| Friction | Change |
| --- | --- |
| No way to find a lesson without opening each kit | Dashboard search across every kit, with type chips |
| Each assign switch reloaded the whole class page | Optimistic switches that save in the background |
| Removing a student had no confirmation and deleted their results | Confirm dialog; delete class and student account use the same dialog |
| Kit page listed nine items as equal cards | Filter chips; lessons on a numbered rail that shows order and what's locked |
| Locked kits said "redeem a code" even when free lessons were open | "Free lessons only" vs "Locked", worked out per kit |
| Kit identity carried only by a name | Cap color on every surface that belongs to a kit |
| Teach tools buried under a long table of contents | Teach this first in the lesson aside |
| Redeem success text and "Go to dashboard" were near-invisible (dark-theme tokens on white) | Site tokens |
