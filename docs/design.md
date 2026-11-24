# Design

The visual design behind the themes: one set of tokens, themes that are nothing but token values,
and layout guidance for every block. The blocks in `src/blocks/` follow it, and a new block should
too (see [making-a-block.md](making-a-block.md)).

- Every token, with comments: `src/themes/default/tokens.css`
- The type roles that apply them (`type-title`, `type-lead`, `type-label` …) and the rule and
  padding utilities: `src/styles.css`
- Themes: `src/themes/<name>/theme.css`

## What the research says

Sources read: reveal.js theme settings and its white, black, simple, serif and dracula themes;
Slidev base layouts and the seriph theme; Marp default, gaia and uncover; Spectacle's default
theme; Butterick's Practical Typography on presentations; WCAG 1.4.3; iA Presenter's layout and
theme docs; Knaflic on slide titles and chart colour. Principles taken from them, not content:

| Principle                                                                                 | Evidence                                            | In this design                                     |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Body text is 4 to 6% of slide height                                                      | reveal 6.0%, Spectacle 5.7%, Marp 4.0%, Slidev 3.2% | body 44 px (4.1%), list titles 54 px (5%)          |
| A floor for small print near 1/50 of the height                                           | "8H rule" (unverified secondary source)             | `--text-label` 26 px (2.4%); nothing smaller       |
| One base size for the whole deck, no auto-shrink                                          | Butterick                                           | fixed scale; overflow is a content problem         |
| Compact heading scale, big sizes kept for cover, section, fact                            | reveal h1 2.5x, Slidev cover and fact layouts       | title 1.7x body; display 4.2x on title slides only |
| One family, heading weight near 600, no uppercase by default                              | reveal white and black, seriph, Spectacle           | Inter 650 titles, sentence case                    |
| One accent; secondary text is a dimmed ink                                                | seriph 50%, gaia `--color-dimmed`                   | `--color-accent`, `--color-ink-2`                  |
| Off-white and off-black, never pure                                                       | Butterick, reveal black `#191919`                   | canvas `#f4f4f0` and `#101114`                     |
| A theme is about 20 variables                                                             | reveal `--r-*`, gaia, iA presets                    | 8 colours per scheme, 4 fonts, the rest optional   |
| Dark is the same tokens, plus a per-slide invert                                          | Marp `invert`, iA `.dark`                           | `data-scheme`, `.inverted`                         |
| Side padding near 6% of the width                                                         | Marp 5.5 to 6.1%, Slidev 5.7%                       | 120 px (6.25%)                                     |
| Left-aligned by default                                                                   | Butterick                                           | everything is left-aligned; nothing is centred     |
| The title is the takeaway; label marks directly; one highlighted series; colour is scarce | Knaflic                                             | chart guidance below, `--color-chart-key`          |

Not verified at the source: Kawasaki's 30 pt rule and Duarte's glance test (search results only),
Keynote, Pitch and Tome defaults, Tufte.

## Tokens

All in `src/themes/default/tokens.css`, with comments. Sizes are px on the 1920 x 1080 stage. Names follow
Tailwind v4 namespaces, so the colour, font, text, radius and ease tokens can go straight into
`@theme` and produce utilities (`bg-canvas`, `text-ink-2`, `font-display`, `text-title`).

### Colour: eight values per scheme

| Token                 | Plain light | Plain dark | Used for                                        |
| --------------------- | ----------- | ---------- | ----------------------------------------------- |
| `--color-canvas`      | `#f4f4f0`   | `#101114`  | slide background                                |
| `--color-surface`     | `#ffffff`   | `#1a1c21`  | panels, tables, code                            |
| `--color-ink`         | `#131417`   | `#f1f0ea`  | text                                            |
| `--color-accent`      | `#e2411b`   | `#ff5d3a`  | fills: kicker bar, rules, bars, highlights      |
| `--color-accent-text` | `#c9360f`   | `#ff6a48`  | the accent as a text colour                     |
| `--color-on-accent`   | `#ffffff`   | `#101114`  | text on an accent fill                          |
| `--color-accent-2`    | `#1f6f8b`   | `#5cc0de`  | second voice: strings in code, a second callout |
| `--color-accent-3`    | `#8a6a00`   | `#e0b84a`  | third voice, rarely                             |

Plus `--color-chart-1` to `-5`, the categorical series in a fixed order.

Derived, never set by a theme (mixed from canvas and ink, so they follow any theme):
`--color-ink-2` (secondary text), `--color-ink-3` (line numbers only), `--color-rule` (hairlines),
`--color-muted` (unhighlighted marks, "Other"), `--color-chart-6`, `--color-highlight`
(highlighted code line), `--color-chart-key` (the one highlighted mark; defaults to the accent).

Measured contrast against the canvas (WCAG ratio):

| Theme                  | ink         | ink-2     | ink-3     | accent-text |
| ---------------------- | ----------- | --------- | --------- | ----------- |
| Plain light / dark     | 16.7 / 16.5 | 7.1 / 7.2 | 3.7 / 3.9 | 4.7 / 6.7   |
| Editorial light / dark | 15.0 / 14.6 | 6.3 / 6.6 | 3.4 / 3.7 | 6.7 / 10.3  |
| Signal light / dark    | 17.3 / 17.7 | 7.7 / 7.5 | 3.9 / 3.9 | 17.3 / 13.8 |

So: `ink` and `ink-2` for any text; `accent-text` for text of any size; `ink-3` only for line
numbers and other text nobody has to read; `accent` itself is never a text colour.

### Schemes, and inverted and accented slides

- `scheme: "dark"` on a deck (which sets `data-scheme="dark"` on the stage) switches the whole deck. Light is the default.
- `.inverted` on a slide or a box shows the other scheme's values, so the accent changes with the
  background (a plain canvas and ink swap leaves a light-mode accent on a dark slide).
- `.accented` fills a slide or a box with the accent and sets ink to `--color-on-accent`.
- `data-theme` and `data-scheme` go on the same element.

### Type

| Token                 | Plain          | Editorial  | Signal         | Used for                            |
| --------------------- | -------------- | ---------- | -------------- | ----------------------------------- |
| `--font-display`      | Inter          | Newsreader | Archivo        | titles, numbers, quotes             |
| `--font-body`         | Inter          | Newsreader | Archivo        | everything else                     |
| `--font-label`        | JetBrains Mono | Inter      | JetBrains Mono | kickers, axes, folios               |
| `--font-mono`         | JetBrains Mono | same       | same           | code                                |
| `--text-display`      | 184            | 212        | 250            | title slide                         |
| `--text-section`      | 148            | 156        | 200            | section divider, closing slide      |
| `--text-statement`    | 120            | 136        | 168            | one-sentence slide                  |
| `--text-quote`        | 84             | 96         | 92             | quote slide                         |
| `--text-title`        | 76             | 90         | 112            | slide title                         |
| `--text-lead`         | 54             | 58         | 54             | list item titles, lead paragraph    |
| `--text-body`         | 44             | 46         | 44             | body                                |
| `--text-small`        | 38             | 41         | 38             | detail lines, captions, table cells |
| `--text-label`        | 26             | 26         | 26             | labels; the floor                   |
| `--text-code`         | 30             | 30         | 30             | code                                |
| `--text-stat` / `-sm` | 400 / 96       | 440 / 104  | 460 / 128      | hero number / supporting numbers    |

How display type is set: `--display-weight`, `--display-tracking`, `--display-leading`,
`--display-transform`, `--display-stretch`; the same for `--title-*`; `--body-weight`,
`--body-leading`, `--strong-weight`, `--stat-weight`, `--quote-weight`, `--quote-style`;
`--label-weight`, `--label-tracking`, `--label-transform`.

Emphasis: `<em>` inside a title, statement or quote is styled by `--em-style`, `--em-color`,
`--em-background`, `--em-pad`. Plain colours it, Editorial sets it in italic, Signal draws a
marker behind it. One phrase per slide at most, and not on every slide.

### Space, shape, lines

`--slide-pad-x` 120, `--slide-pad-top` 80, `--slide-pad-bottom` 64, `--gap-title` 56,
`--gap-column` 80, `--gap-item` 32, `--gap-tight` 12, `--pad-box` 48, `--measure` 24ch (longest
title line), `--radius-box` 0, `--radius-mark` 2, `--rule` 2 (hairlines), `--rule-strong` 6
(kicker bar, panel tops, chart baseline, title-slide rule).

### Motion

`--ease-out` (the existing `--ease-out-expo` curve), `--ease-in-out`, `--duration-fast` 300 ms,
`--duration-base` 600 ms, `--duration-slow` 900 ms, `--stagger` 90 ms, `--rise` 24 px. They are
all zero under `prefers-reduced-motion`. The built-in entrances, build steps and slide transitions
read them, so a theme (or a deck's `vars`) changes a deck's pace by setting them. Rules:

- One entrance per slide: blocks fade and rise by `--rise` in reading order, `--stagger` apart.
- Data draws once, slowly: bars grow from the baseline, lines draw left to right, numbers count up.
- Nothing loops on a content slide. Looping motion pulls the eye from the speaker; keep it for
  diagrams where the motion is the point (a pipeline, a cycle).
- A build step is opacity only, `--duration-fast`.

### Themes

A theme sets the eight colours per scheme, the chart series, and whatever type, space and line
tokens it wants to differ. Nothing else.

|                | Plain (default)              | Editorial                                                       | Signal                                                          |
| -------------- | ---------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| Folder         | `src/themes/default`         | `src/themes/editorial`                                          | `src/themes/signal`                                             |
| Overrides      | none                         | colours, 3 fonts, the type scale and weights, rule widths       | colours, 2 fonts, display sizes and case, emphasis, rule widths |
| Fonts to embed | Inter, JetBrains Mono: 88 kB | plus Newsreader roman and italic: 367 kB                        | Archivo, JetBrains Mono: 130 kB                                 |
| Best for       | anything; the neutral start  | talks, essays, strategy                                         | keynotes, big rooms, short decks                                |
| Watch for      | none                         | light serif weights: keep the room dark or use the light scheme | capitals: keep titles under eight words                         |

A minimal theme is one rule: `[data-theme="mine"] { --color-accent: #0a7d5a; --color-accent-text: #086b4d; }` in `src/themes/mine/theme.css`.

All fonts are SIL OFL 1.1 (licences next to them in `src/themes/*/fonts/`), Latin subset, variable. Each theme names
system fallbacks, so a deck still reads without the embedded files.

## Layout

### Every slide

- Stage 1920 x 1080. Padding 80 top, 120 sides, 64 bottom.
- **Header** (30 px high): kicker on the left, which is a label with a 44 px accent bar before it.
  The logo or `aside` sits on the right, at most 40 px high.
- **Title**: `--text-title`, at most two lines, at most `--measure` wide, 36 px under the header.
  Write it as the takeaway ("Lead time fell by four fifths"), not the topic ("Lead time").
- **Body**: starts `--gap-title` under the title and fills the rest. Content that does not fill it
  is centred vertically; lists and charts stretch to fill.
- **Footer**: a label on the left (deck title, or the source on a chart slide) and the slide
  number on the right.
- Everything shares the left edge at x = 120. Nothing is centred horizontally.
- Budgets: a title of 8 words; 3 to 5 list items; 12 words per item; one idea per slide.

### Slides

| Block                  | Layout                                                                                                                                                                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TitleSlide**         | Header: kicker left, time or track right. Title in `--text-display`, bottom-anchored, two balanced lines, with the full stop in `accent-text`. Subtitle in `--text-lead`, `ink-2`, 44 px below. Then a `--rule-strong` ink rule, and the byline and date as labels under it. No logo larger than the header slot. |
| **SectionSlide**       | `.inverted`. Content sits at the bottom left: "02 / 05" as a 30 px label in `accent-text`, title in `--text-section`, subtitle in `--text-lead`. A row of progress ticks at the bottom, one per section, the current one in the accent. Replaces the animated rings, which decorate without saying anything.      |
| **StatementSlide**     | One sentence in `--text-statement`, display style, vertically centred, at most 20ch wide, one `<em>`. Kicker in the header as usual.                                                                                                                                                                              |
| **QuoteSlide**         | Quote in `--text-quote`, at most 22ch wide, vertically centred. The opening mark hangs outside the left edge in `accent-text`. Attribution 56 px below: a 72 px accent bar, the name in `--strong-weight`, the role in `ink-2`, all `--text-small`. No giant quote glyph.                                         |
| **EndSlide**           | Built like SectionSlide: `.inverted`, bottom-left, title in `--text-section`, links as labels in a row under a `--rule-strong` rule.                                                                                                                                                                              |
| **PhotoSlide / image** | Full bleed, or half the slide with the text column in the other half. Never a floating picture with a shadow. Text over a photo sits on a canvas-coloured band or a 60% canvas scrim, not on the photo. `--radius-box` on inset images.                                                                           |

### Blocks inside a slide

| Block                                  | Layout                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bullets**                            | Rows, not dots: a hairline above each row and under the last, a two-digit number in the label font and `accent-text` in a 140 px first column, the item in `--text-lead` at `--strong-weight`, an optional detail line in `--text-small`, `ink-2`. Rows share the height equally, up to 620 px. For an unnumbered list use an 18 px accent square in the same column.                                                     |
| **Agenda**                             | The same rows; the active row keeps full ink, the others drop to `ink-2` (not to 35% opacity, which falls under the contrast floor).                                                                                                                                                                                                                                                                                      |
| **Columns**                            | Grid with `--gap-column`; 1:1 or 5:6. Text column: a lead paragraph in `--text-lead`, then `--text-small` in `ink-2`, at most 30ch. Columns are centred against each other vertically.                                                                                                                                                                                                                                    |
| **Panel, Cards**                       | `--color-surface`, `--radius-box`, `--pad-box` inside, and a `--rule-strong` ink rule along the top instead of a ring or a shadow. Card title `--text-lead`; body `--text-small`. Up to four across, `--gap-item` apart.                                                                                                                                                                                                  |
| **Table**                              | Label-style column heads, hairline row rules, `--text-small`, no zebra and no vertical rules. The column to read is `--strong-weight`; the others stay regular or `ink-2`.                                                                                                                                                                                                                                                |
| **Compare**                            | Two panels. The recommended side is `.inverted` (or `.accented` for a louder deck) rather than marked with a tick.                                                                                                                                                                                                                                                                                                        |
| **Callout**                            | A panel with the `--rule-strong` rule on the left in the accent; title as a label, text in `--text-body`.                                                                                                                                                                                                                                                                                                                 |
| **Stat (hero)**                        | The number in `--text-stat`, `--stat-weight`, `accent-text`, tabular figures; the unit at 26% of that size in ink on the same baseline; a caption in `--text-lead`, `ink-2`, 80 px to the right. One hero per slide.                                                                                                                                                                                                      |
| **Stat (row)**                         | Up to four, each under a hairline ink rule: number in `--text-stat-sm` in ink, caption in `--text-small`, `ink-2`. Supporting numbers are ink, so the hero stays the only coloured one.                                                                                                                                                                                                                                   |
| **Code**                               | `--color-surface` panel with the `--rule-strong` top rule, `--text-code`, line-height 1.6, line numbers in `ink-3`. Keywords `accent-text` at 600, strings `accent-2`, comments `ink-2` italic, function names bold ink: four voices, all from tokens. One highlighted line: `--color-highlight` behind it and an accent bar on its left edge. At most 10 lines of 64 characters; a caption in `--text-small` underneath. |
| **Timeline, Pipeline**                 | A `--rule` ink line with 20 px nodes; the current or key node filled with the accent, the rest canvas with an ink outline. Label above in the label style, title below in `--text-small` at `--strong-weight`. Up to six steps.                                                                                                                                                                                           |
| **Cycle, Spectrum, DotGrid, diagrams** | Strokes `--rule` wide in ink; fills are surface, muted, or the accent for the one thing the slide is about. Labels in the label font, never under 26 px.                                                                                                                                                                                                                                                                  |

### Charts

- The slide title states the finding. The chart needs no title of its own; what is measured goes
  in a note or the footer.
- **One series**: every mark `--color-muted`, the one that matters `--color-chart-key`.
- **Several series**: `--color-chart-1` to `-5` in order, never cycled; a sixth and beyond become
  "Other" in `--color-chart-6`. A legend is always shown for two or more series, and up to four
  are also labelled directly at the end of the line or on the bar.
- Every palette in the token files passes the colour-blind separation check for adjacent series
  in its scheme. Yellow and green sit under 3:1 against light canvases, which is why values are
  always labelled.
- Labels and values are ink or `ink-2`, never the series colour.
- Values on the marks instead of a value axis: `--strong-weight`, 40 px, tabular figures. Category
  labels in the label style under a `--rule-strong` ink baseline. No gridlines by default; if a
  chart needs them, `--color-rule` hairlines.
- Bars: `--radius-mark` on the data end only, a gap of at least 28 px, growing from the baseline.
  Lines: 4 px, with a 12 px dot on the last point.
- Put the headline number in the chart's empty corner, in `--text-stat-sm` and `accent-text`.
- No dual axes, no 3D, no pie with more than four slices.
