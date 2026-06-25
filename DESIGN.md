# filedeadrop — Design System

A complete reference for building new components and layout sections that match the existing visual language. If a value is not listed here, use the closest system token — do not invent new values.

---

## Design Tokens

All tokens are CSS custom properties declared in `src/index.css` and must be referenced via `var()` in all component modules. Never hardcode a color value.

### Colors

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#F3F3F1` | Page background |
| `--color-surface` | `#FAFAF8` | Card / panel background |
| `--color-dark-surface` | `#111111` | Inverted (dark) card background |
| `--color-text` | `#111111` | Primary text |
| `--color-interactive` | `#333333` | Button hover / active state |
| `--color-secondary` | `#666666` | Secondary text |
| `--color-muted` | `#BABAB4` | Subdued labels, dashed borders, disabled text, body text on dark surfaces |
| `--color-border` | `#DDDDD8` | All borders and dividers |
| `--color-inset` | `#F0F0EE` | Dropzone / inset panel background |
| `--color-gutter` | `#ECECEA` | Trust strip background, step number column |

---

## Typography

Two font families only. Both are self-hosted from `public/fonts/` — no external CDN requests.

- **Inter** — all prose, UI labels, buttons. Weights: 400 (body), 500 (emphasis/controls), 600 (section headings).
- **JetBrains Mono** — technical / meta content (see [Monospace Usage](#monospace-usage)). Weight: 400.

`html { font-size: 62.5% }` is set globally so that `1rem = 10px`. All font sizes are authored in rem against this base.

### Type Scale

6 steps. Do not introduce new sizes — fit new elements into the closest existing step.

| Step | rem | px | Typical role |
|---|---|---|---|
| xs | 1.1rem | 11px | Labels, mono metadata, footer, region select |
| sm | 1.3rem | 13px | Controls, buttons, small body (FAQ, steps) |
| md | 1.5rem | 15px | Prominent UI — wordmark, dropzone prompt, feature title, file name |
| base | 1.6rem | 16px | Body reading text, PrivacyPolicy content |
| lg | 2.0rem | 20px | Section heading (SecurityCard only) |
| xl | 2.4rem | 24px | h1 |

### Weights

- 400 — body, labels, mono
- 500 — h1, controls, emphasis
- 600 — headings, feature titles, step titles, wordmark

### Line Heights

3 values only:

| Value | Role |
|---|---|
| 1.2 | Tight — headings and sub-headings |
| 1.65 | Body default — set on `body`, inherit where possible |
| 1.8 | Spacious — long-form reading (definitions, FAQ, capabilities, PrivacyPolicy) |

### Letter Spacing

3 values only:

| Value | Role |
|---|---|
| -0.01em | Wordmarks (Header, Footer) |
| 0.01em | Controls and buttons |
| 0.1em | All uppercase labels (`text-transform: uppercase`) |

Do not add letter-spacing to non-uppercase text — the typeface's natural spacing is correct.

All uppercase labels use `text-transform: uppercase`.

---

## Spacing Scale

An implicit 8px base grid. Use multiples of 4 for fine-grained spacing, multiples of 8 for structural spacing.

| Step | Value | Typical use |
|---|---|---|
| 2px | 2px | Tight stacking (word → pronunciation) |
| 4px | 4px | Inline icon/text gap |
| 6px | 6px | Caption below primary label |
| 8px | 8px | (baseline unit) |
| 10px | 10px | Row gaps inside compact controls |
| 12px | 12px | Tight section gaps |
| 16px | 16px | Paragraph margin, control row gap |
| 20px | 20px | Component internal spacing (label → title) |
| 24px | 24px | Card internal padding (mobile), control group gap |
| 28px | 28px | Dropzone / file zone margin-bottom |
| 36px | 36px | Card inner padding (desktop) |
| 48px | 48px | Section divider margin, side padding (desktop) |
| 64px | 64px | Definition block bottom margin |
| 96px | 96px | Full-page section top / bottom padding |
| 112px | 112px | Page top padding (desktop, clears fixed header) |

---

## Layout

- **Max width:** 720px, centered (`margin: 0 auto`)
- **Top padding:** 112px (desktop) / 64px (mobile) — clears the fixed 48px header with breathing room
- **Side padding:** 48px (desktop) / 24px (mobile)
- **Breakpoint:** `@media (max-width: 600px)` — single breakpoint, no intermediate sizes
- **Page structure:** flex column, `#root` is `min-height: 100vh`; `<main>` takes `flex: 1`

---

## Borders & Radius

| Use | Value |
|---|---|
| Standard border | `1px solid var(--color-border)` |
| Section divider (`<hr>`) | `1px solid var(--color-border)` |
| Dashed dropzone border | `1px dashed var(--color-muted)` |
| Definition left accent | `2px solid var(--color-border)` |
| FAQ row dividers | `1px solid var(--color-border)` (top + bottom) |
| Input / small element radius | 4px |
| Card / panel radius | 6px |

No other border styles. No `border-radius` values other than 4px and 6px.

---

## Shadow

One allowed shadow, used only on the main content card:

```
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
```

Applied to: upload card (`.wrap`), view card (`.wrap`). No other elements receive a shadow.

---

## Interactive States

### Transitions

All interactive elements use a single timing: `150ms ease-out`.

```css
transition: background 150ms ease-out;   /* primary button */
transition: border-color 150ms ease-out; /* secondary button */
```

No other transition durations or easing curves.

### Buttons

**Primary button**
```
background: var(--color-text)      → hover: var(--color-interactive)
color: var(--color-bg)
border: none
border-radius: 4px
padding: 10px 22px
font: 1.3rem/500 Inter, letter-spacing: 0.01em
```

**Secondary button**
```
background: transparent            → hover: border-color: var(--color-text)
color: var(--color-text)
border: 1px solid var(--color-border)
border-radius: 4px
padding: 9px 20px
font: 1.3rem/500 Inter
```

**Disabled state** (primary only): `background: var(--color-muted)`, cursor default.

### Focus

Form elements (select, input): `outline: 1.5px solid var(--color-text); outline-offset: 2px`.

### Select / Dropdown

```
font: 1.1rem JetBrains Mono
appearance: none
background-image: custom SVG chevron (stroke: var(--color-muted))
padding: 7px 28px 7px 10px
border: 1px solid var(--color-border), border-radius: 4px
```

---

## Animations

One allowed animation: a 150ms opacity fade-in for content that appears on state change.

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
/* usage */
animation: fadeIn 150ms ease-in;
```

Use only when content is revealed dynamically (upload state changes, view states). Do not use entrance animations on static page load content.

---

## Monospace Usage

Apply `font-family: 'JetBrains Mono', monospace` to any text that is technical, machine-generated, or metadata — not prose:

- All-caps section labels (e.g. "ZERO-KNOWLEDGE ARCHITECTURE")
- Step numbers in protocol sections
- Region selector and region label
- File name display on the view page
- File size / metadata (e.g. "2.4 MB · encrypted")
- Upload progress / status line (URL, hash)
- Pronunciation / IPA notation
- `<code>` elements globally

Do not use JetBrains Mono for prose, headings, button labels, or FAQ content.

---

## Dark Surface (Inverted Card)

The SecurityCard component uses a dark background (`var(--color-dark-surface)` = #111111). On dark surfaces, the standard semantic tokens apply in an inverted way:

| Role | Token | Result on dark |
|---|---|---|
| Primary text | `var(--color-bg)` (#F3F3F1) | Near-white — for titles |
| Body text | `var(--color-muted)` (#BABAB4) | Light gray — readable body copy |
| Subdued label | `var(--color-secondary)` (#666666) | Dark-but-visible ghost label |

Do not introduce new dark-mode tokens. Apply the existing palette with this mapping. The dark surface pattern is intentionally limited to the SecurityCard — do not extend it to other components without discussion.

---

## Component Patterns

### Card (`.wrap`)

```
border: 1px solid var(--color-border)
border-radius: 6px
background: var(--color-surface)
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)
overflow: hidden
```

Inner padding: 36px desktop, 24–28px mobile.

Cards never stack shadows — one shadow per logical card only.

### Section Label (SectionLabel component)

1.1rem JetBrains Mono, all-caps, `letter-spacing: 0.1em`, `color: var(--color-muted)`. Used as a section classifier above a heading. Has a fixed bottom margin before the content it labels.

### Trust Strip

Background: `var(--color-gutter)` (#ECECEA). Horizontal flex, centered items, 10px 16px padding. Items use 1.1rem JetBrains Mono, `letter-spacing: 0.1em`, all-caps. Appears as a footer inside cards, separated by a top border.

### Section Spacing

Sections on the home page use `padding: 0 0 96px` (bottom only — top is handled by the previous section's bottom or the page top padding). The SecurityCard section also uses `padding: 0 0 96px`.

The FAQ section uses the same bottom padding but its rows have 28px top/bottom internal padding.

---

## Grid Patterns

### Page Layout

Single column, 720px max-width, centered. No multi-column page layout.

### FAQ Grid

```css
display: grid;
grid-template-columns: 1fr 1.2fr;
gap: 48px;
```

Question column is narrower (1fr), answer column is wider (1.2fr). Collapses to single column at 600px.

### Protocol Steps Grid

```css
display: grid;
grid-template-columns: 56px 1fr;
```

56px left column for the step number (centered, background: `var(--color-gutter)`). Right column is the step body. No gap — the columns are visually distinct by background.

### Capabilities / Features

Vertical `flex` column with `gap: 40px`. Each feature is a row (icon/number + body text).

---

## Constraints

- **CSS Modules only** — no global styles beyond `src/index.css`, no Tailwind, no component libraries
- **No gradients** — flat backgrounds only
- **No box-shadow** beyond the single card shadow (`0 1px 3px rgba(0,0,0,0.05)`)
- **No decorative animations** — only the 150ms `fadeIn` for dynamic state reveals and hover transitions
- **No centered body text** — left-aligned everywhere; center alignment only inside dropzone/status panels
- **Single breakpoint** — `max-width: 600px` only; no intermediate breakpoints
- **No hardcoded color values** — always reference CSS custom properties via `var()`
- **No third-party fonts** — Inter and JetBrains Mono are self-hosted; no Google Fonts or CDN requests
- **No z-index** — avoid stacking contexts; no overlapping elements that require explicit z-index management
