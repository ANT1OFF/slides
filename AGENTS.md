# AGENTS.md

Guidance for AI coding agents (and people) building decks and blocks in this repo. The README covers
the user-facing details; this is the short version of how to work here.

## The model

- A deck is `src/decks/<name>/index.tsx`, exporting `{ title, theme?, scheme?, slides }`. A slide is JSX.
- Built-in blocks come from `@blocks`, the engine (`slide`, `Build`, `asOf`, types) from `@core`, and
  the team's own reusable slides and blocks from `@library/…` (`src/library/`). Everything else a
  deck uses is a local import from its own folder: media, data files, one-off components.
- A theme is a folder in `src/themes/<name>/` (`theme.css`, optional `fonts/` and `logo.svg`).
- Animation is CSS used by name: `<Reveal effect>`, `<Build effect>`, and `transition` on a deck or a
  slide. Built in: effects `rise`, `fade`, `pop`; transitions `fade`, `push`, `zoom`. The team's own
  are files in `src/library/motion/`; team-wide CSS is `src/library/styles.css`.
- Output is one self-contained HTML file per deck. Nothing may be fetched when it opens.
- `src/core/` imports nothing from blocks or the library, and `src/blocks/` nothing from the
  library; `npm run check` enforces it.

**Also read `src/library/AGENTS.md`**: the team's own house rules (tone, theme, naming, data sources).
They come on top of this file. This file is upstream's; don't edit it, put team rules there.

## Who owns what

| Owned by                 | Paths                                                                                                                                                                                                                                                                                                                                                                                                  | Rule                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **You** (your team)      | `src/decks/` (except `showcase/`; `_starter/` is the deck `npm run new` copies), `src/library/` (slides, blocks, `motion/`, `styles.css`, data, assets, `settings.json`, `AGENTS.md`), `src/themes/<yours>/`                                                                                                                                                                                           | Change freely. Upstream ships a few starters there and never touches them again.                   |
| **Upstream** (this repo) | `src/core/`, `src/blocks/`, `src/decks/showcase/`, `src/themes/{default,editorial,signal,acme}/`, `src/main.tsx`, `src/styles.css`, `src/gallery.tsx`, `src/library-view.tsx`, `src/virtual-deck.d.ts`, `index.html`, `examples/`, `scripts/`, `vite/`, `docs/`, `.github/`, `.claude/skills/`, `.agents/skills/`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `LICENSE` | Don't edit; `npm run upgrade` replaces them. Fix things for everyone with a pull request upstream. |
| Shared                   | `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `.prettierrc`, `.prettierignore`                                                                                                                                                                                                                                                                                 | Edit only when you must (e.g. adding a dependency); expect small merges.                           |

Work in the team's folders. Promote reusable pieces into `src/library/`, never into `src/blocks/`.
A team-wide default theme goes in `src/library/settings.json`, never into `src/themes/default/`;
team-wide CSS in `src/library/styles.css`, never into `src/styles.css`; animations in
`src/library/motion/`, never into `src/core/motion.css`.

## Workflow

1. **Create the deck:** `npm run new <name>` (lowercase, dashes). It copies the team's starter,
   `src/decks/_starter/`.
2. **Search the library before creating anything.** List `src/library/slides/` and
   `src/library/blocks/` (or open `npm run dev` → Library) for team slides and sets, and
   `src/decks/showcase/index.tsx` for every built-in block. Reuse and override props first.
3. **Write each slide** from library slides and blocks. Content slides start with `Frame`; write the
   title as the point ("Lead time fell by four fifths"), not the topic.
4. **Make what's missing.** One-off: in the deck's folder. Reusable (a second deck wants it, or it's a
   team pattern like an intro or closing): in `src/library/slides/` (a component with a default for
   every prop, or a `…Slides` function returning a set) or `src/library/blocks/`. Follow
   [docs/making-a-block.md](docs/making-a-block.md). `src/blocks/` is upstream's: something every
   user of this repo would want goes there only as a pull request upstream. Where each kind of
   thing goes ([docs/extending.md](docs/extending.md) has the details):

   | To add                                     | Put it in                                                                     |
   | ------------------------------------------ | ----------------------------------------------------------------------------- |
   | A block, or a layout (a whole-slide block) | `src/library/blocks/<Name>.tsx`; layouts start from `Slide` and `SlideHeader` |
   | A reusable slide or slide set              | `src/library/slides/<topic>.tsx`                                              |
   | An entrance or build-step effect           | `src/library/motion/<name>.css`: a class named after a from-only `@keyframes` |
   | A transition between slides                | `src/library/motion/<name>.css`: `@keyframes <name>-in` and `<name>-out`      |
   | A team-wide token or utility class         | `src/library/styles.css` (`@theme`, `@utility`)                               |
   | CSS for one deck                           | A `.css` file in the deck's folder, imported by the deck                      |
   | What every new deck starts with            | `src/decks/_starter/`                                                         |

5. **Theme it:** `theme: "<name>"` (a string literal) on the deck. A new look is a copy of
   `src/themes/acme/` with new values. Per deck: `scheme`, `logo`, `footer`, `vars`.
6. **Record where numbers come from** (see "Data" below) whenever a slide shows real-world figures.
7. **Check before committing:** `npm run format`, then `npm run check` (format, types, every deck builds; the build fails on
   remote or un-inlined assets, so fix the import rather than the check), then `npm run verify` (every
   deck offline in Chrome: fonts, media, licence notices, overflow, every key). Both must pass. Then
   look at the slides: `npm run dev`, open the deck, press G. To hand someone a PDF: `npm run pdf <deck>`
   writes `dist/<deck>.pdf` (one page per visible slide, final state; offline, needs Chrome or `CHROME_PATH`).

## Data: provenance and refresh

Real-world numbers live in a `*.data.json` file next to the deck (or in `src/library/data/` when
shared), imported by the deck: `{ "source": "script" | "agent" | "manual", "how": "…", "updated":
"YYYY-MM-DD", "values": { … } }`. `how` is the command (script), the retrieval instructions (agent), or
who to ask (manual). Use `asOf(data, "source")` from `@core` for the slide's footer.

When asked to update or refresh a deck's data:

1. `npm run refresh <deck>`: runs the deck's script sources and lists its agent and manual ones.
   Add `--shared` if its slides use data in `src/library/data/`.
2. For each **agent** source, follow its `how` (e.g. query `gh`, read a dashboard), write the new
   values, and set `updated` to today.
3. For each **manual** source, ask the user for the values; don't guess.
4. If a script fails, report why (usually a missing export or credentials); its old values stay.
5. Check slide titles and notes that quote the numbers in words still read true.
6. `npm run build <deck>` and `npm run verify`.

## Media: preference order

Use the first option that can do the job.

| #   | Use                                                                                         | For                                                            | Why                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **HTML and CSS** (blocks, Tailwind classes)                                                 | Text, layout, lists, tables, cards, simple shapes and diagrams | Text stays real text: selectable, searchable, read by screen readers, crisp at any size, themed by tokens, costs almost nothing in file size |
| 2   | **Chart and diagram blocks** (`BarSeries`, `LineChart`, `Flow`, `Timeline` …)               | Data and processes                                             | Already themed, animated and tested; numbers stay text; use one whenever it fits before drawing your own                                     |
| 3   | **Inline SVG** (JSX `<svg>`, or `Node`/`Arrow`)                                             | Icons, logos, and diagrams or charts no block covers           | Vector, so crisp on any projector; colours from tokens or `currentColor`, so it follows themes and dark slides; tiny                         |
| 4   | **Raster images** (WebP or AVIF, JPEG as fallback) via `Figure`, `PhotoSlide`, `PhotoSplit` | Photographs only                                               | Inlined as base64 (+33%); resize to the size shown (≤ 1920 px wide) and compress to ~200 KB each                                             |
| 5   | **Video and audio** via `Video`, `Audio`                                                    | Only when motion or sound is the point                         | Largest by far and inlined too; keep clips a few seconds, small and compressed (the build warns above 15 MB); link to anything long instead  |

Always import media files in the deck (`import hero from "./hero.webp"`) so the build inlines them.
Give every image and video a meaningful `alt` or caption.

## Don'ts

- **No remote URLs** for images, fonts, video, scripts or styles. The deck must work offline and
  the build refuses them. Links (`<a href>`) for the audience to click are fine. A code sample that
  shows a URL in an attribute can trip the check; write it as `"https:/" + "/example.com"`.
- **No text baked into images.** Put words in HTML or SVG `<text>`, so they theme, scale and can
  be read and searched.
- **No screenshots of text or code.** Use `Code` for code and `Table` for tables.
- **No hex colours or Tailwind palette colours** (`blue-500`) in decks or blocks: use theme tokens
  (`text-ink`, `text-ink-2`, `bg-accent`, `text-accent-text` …), or the deck won't follow its theme.
- **No looping animation on content slides**; loops only on diagrams where motion is the point.
- **No JavaScript animation** (timers, animation libraries) for entrances or transitions: write CSS
  keyframes, so print, the overview and reduced motion keep working. One transition for a deck, a
  second for its section slides at most.
- Don't edit `src/core/` to change how one deck looks; use a block, a theme or deck `vars`.
- Don't commit `dist/`. The one exception is `examples/html/` (the built example decks and the
  showcase): after changing a block, a theme, `src/styles.css` or an example, run
  `npm run build:examples` and commit the result. `npm run check` fails if it is stale.

## Before you finish

- `npm run check` and `npm run verify` pass.
- Every new reusable slide is in `src/library/slides/` with defaults for every prop (so it shows in
  the library view); every new built-in block has a showcase slide and a row in the README's table.
- No upstream file changed for a team's own need: check `git status` against "Who owns what".
- Every real-world number has a `*.data.json` with its `source`, `how` and `updated`.
- If a PDF was asked for, `npm run pdf <deck>` ran and you looked at a page or two of `dist/<deck>.pdf`.
- You looked at every slide you changed, in the overview (G), in the deck's theme and scheme.
