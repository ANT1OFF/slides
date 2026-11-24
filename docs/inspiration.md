# Inspiration

Ideas adapted from other slide tools and from presentation design advice. No code, content, branding
or assets were copied; these are the patterns we took and where they came from.

| Idea                                                                                              | Where from                                                   | How it shows up here                                                                                            |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `B` or `.` to blank the screen, `?` for a list of keys, typing a number then Enter to jump        | reveal.js keyboard defaults                                  | Same keys in the deck window                                                                                    |
| `G` / overview grid                                                                               | reveal.js (`O`/`Esc`), Slidev (`o`)                          | `G` opens the grid; `Esc` closes it                                                                             |
| Code line highlights stepped with `1\|2-3\|all`                                                   | reveal.js `data-line-numbers`, Slidev code blocks            | `<Code highlight="1\|2-3\|all">`                                                                                |
| A tiny tokenizer instead of a full highlighter                                                    | Size trade-off noted for Shiki/Prism in single-file output   | `src/blocks/Code.tsx`, about 1 KB                                                                               |
| Core layout set: cover, section, statement, quote, end, two columns, image left/right, full image | Slidev built-in layouts, MDX Deck `Split`                    | `TitleSlide`, `SectionSlide`, `StatementSlide`, `QuoteSlide`, `EndSlide`, `Columns`, `PhotoSplit`, `PhotoSlide` |
| Per-slide `invert` class                                                                          | Marp `class: invert`                                         | `inverted` prop that swaps canvas and ink tokens                                                                |
| Theme as an object merged over a base                                                             | MDX Deck themes, Slidev theme overrides                      | a theme folder that only lists what differs, plus per-deck `vars`                                               |
| Notes attached to each slide                                                                      | reveal.js `<aside class="notes">`, Slidev comments           | `slide(x, { notes })`                                                                                           |
| Presenter view with current, next, notes and timer, synced across windows                         | reveal.js speaker view, Slidev presenter mode                | `N` opens it; it works from a local file via `postMessage`                                                      |
| Agenda, timeline, comparison, table, callout, cards                                               | Common sections in pitch and report templates                | `Agenda`, `Timeline`, `Compare`, `Table`, `Callout`, `Cards`                                                    |
| Type sizes for 1920×1080: titles 72–96 px, statements 120–180 px, body ≥ 36 px, captions ≥ 24 px  | General slide typography guidance (1 pt = 2 px at 1920 wide) | Block defaults                                                                                                  |
| One accent plus at most two supporting colours; highlight one series, mute the rest               | Data-visualisation practice                                  | Token set: `accent`, `accent-2`, `accent-3`; `BarSeries` highlights one bar                                     |
| Dark keynote, warm editorial and high-contrast palettes                                           | Original palettes, written for this repo                     | The default theme's dark scheme, `editorial`, `signal`                                                          |

The design itself (the token set, type scale, layout and chart rules) came from a separate design pass
that read reveal.js, Slidev, Marp and Spectacle themes, Butterick's Practical Typography, WCAG 1.4.3,
iA Presenter's theme docs and Knaflic on charts. Its sources and reasoning are in
[design.md](design.md#what-the-research-says).
