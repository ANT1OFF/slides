---
name: slides
description: Make, change or refresh presentations in this repo (React slides built into one self-contained HTML file per deck). Use for "make a deck/slides/presentation", reusing or promoting slides and blocks in the team library, making a team theme, layout, style, animation, slide transition, code highlighter, keyboard shortcut or presenter extra (timer bar, pointer), refreshing a deck's data, exporting a deck to PDF, or checking a deck before committing.
---

# Slides

Read `AGENTS.md` (the rules) and `src/library/AGENTS.md` (the team's house rules) first. These
recipes only say which steps to take; the details are in the files they link to. Never hand-write
HTML: every deck is built by the repo.

## New deck

1. `npm run new <name>` (creates `src/decks/<name>/` as a copy of the team's starter, `src/decks/_starter/`).
2. Write the slides following AGENTS.md "Workflow"; reuse before creating (next recipe).
3. Check and verify (last recipe).

## Reuse from the library

1. List `src/library/slides/` and `src/library/blocks/`, and skim `src/decks/showcase/index.tsx` for
   built-in blocks. `npm run dev` shows a preview of every library slide, block and motion file.
2. Import with `@library/…` / `@blocks`, override props, spread `…Slides()` sets.
   Pattern and examples: `docs/working-with-decks.md` §3.

## Promote a block or slide

1. Move it from the deck folder into `src/library/blocks/` or `src/library/slides/` (never
   `src/blocks/`), make its content props with defaults. A block file also exports
   `example` (an element, or `slide(…)` for a layout): its preview, which `npm run verify` renders.
2. Conventions: `docs/making-a-block.md`. Ownership: AGENTS.md "Who owns what".
3. Update the deck's import; check and verify.

## Add a layout, style, animation, transition, highlighter, key or presenter extra

Each is a file in a team folder, used by name or import; never edit `src/core/`, `src/blocks/` or
`src/styles.css` for it. `docs/extending.md` has the table and the examples.

1. Layout: a block in `src/library/blocks/` built from `Slide`, `SlideHeader`, `FrameBody`, `Footer`
   (`@blocks`); the body goes in `FrameBody` so verify checks it fits. Example:
   `src/library/blocks/SplitFrame.tsx`. A dense slide: `<Frame density="compact">` (docs/design.md).
2. Team-wide token or utility class: `src/library/styles.css` (`@theme`, `@utility`). One deck only:
   a `.css` file in the deck's folder, imported by the deck.
3. Entrance or build-step effect: `src/library/motion/<name>.css`, a class named after a from-only
   `@keyframes`; use `<Reveal effect="<name>">` or `<Build at={1} effect="<name>">`.
4. Slide transition: `src/library/motion/<name>.css` with `@keyframes <name>-in` and `<name>-out`;
   use `transition: "<name>"` on the deck or `slide(…, { transition: "<name>" })`. Built in: `fade`,
   `push`, `zoom`, `"none"`.
5. Use the motion tokens (`--duration-*`, `--ease-*`, `--rise`) in motion CSS; check it in the
   overview (G) and print (P), which must show the final state.
6. Code in another language: a block in `src/library/blocks/` that passes `tokenize` to `Code`
   (spans with the `tok-*` classes; `tokenize(line, keywords)` from `@blocks` is the built-in one).
   Example: `src/library/blocks/Sql.tsx`.
7. Keyboard shortcut or presenter extra: a component using `useDeckKey(key, does, run)` and
   `useDeckNav()` from `@core`, put on the deck with `overlay: <TimerBar />`. Never edit
   `src/core/Deck.tsx`. Built-in keys win; the new key shows under `?`. Example:
   `src/library/blocks/TimerBar.tsx`.

## New team theme

1. Follow docs/themes.md, "Make your own theme" (copy `src/themes/acme/`).
2. Make it the team default in `src/library/settings.json` if asked.
3. Preview: `npm run dev`, `?deck=showcase&theme=<name>` and `&scheme=dark`.

## Refresh data

Follow AGENTS.md "Data: provenance and refresh": `npm run refresh <deck>` (`npm run refresh -- <deck> --shared` for library data too), follow `how` for agent
sources, ask the user for manual ones, update `updated`, rebuild.

## Export a PDF

1. `npm run check` and `npm run verify` first, so the deck is sound.
2. `npm run pdf <deck>` (no name: every deck). It builds the deck if needed and writes
   `dist/<deck>.pdf`: one 1920×1080 page per visible slide, final state, no animation, offline.
3. Look at a page or two (e.g. `pdftoppm -png -r 50 -f 1 -l 1 dist/<deck>.pdf /tmp/page`, or open it).
   Hidden slides and speaker notes aren't included. No Chrome found: set `CHROME_PATH`.
   `dist/` is gitignored; don't commit the PDF.

## Check and verify (before every commit)

`npm run check` then `npm run verify`; both must pass. Then look at the changed slides in
`npm run dev` (press G). Upstream updates: `npm run upgrade`.

## Set up a team's private copy

Follow docs/working-with-decks.md, "1. Make your private copy". The `upstream` remote must be fetch-only, so private decks
can never be pushed to the public kit: `git remote set-url --push upstream DISABLED` (`npm run upgrade`
warns if it isn't). Never push to `upstream`.
