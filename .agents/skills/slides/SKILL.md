---
name: slides
description: Make, change or refresh presentations in this repo (React slides built into one self-contained HTML file per deck). Use for "make a deck/slides/presentation", reusing or promoting slides and blocks in the team library, making a team theme, layout, style, animation or slide transition, refreshing a deck's data, or checking a deck before committing.
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
   built-in blocks. `npm run dev` → Library shows every library slide.
2. Import with `@library/…` / `@blocks`, override props, spread `…Slides()` sets.
   Pattern and examples: `docs/working-with-decks.md` §3.

## Promote a block or slide

1. Move it from the deck folder into `src/library/blocks/` or `src/library/slides/` (never
   `src/blocks/`), make its content props with defaults.
2. Conventions: `docs/making-a-block.md`. Ownership: AGENTS.md "Who owns what".
3. Update the deck's import; check and verify.

## Add a layout, style, animation or transition

Each is a file in a team folder, used by name or import; never edit `src/core/`, `src/blocks/` or
`src/styles.css` for it. `docs/extending.md` has the table and the examples.

1. Layout: a block in `src/library/blocks/` built from `Slide`, `SlideHeader`, `Footer` (`@blocks`).
   Example: `src/library/blocks/SplitFrame.tsx`.
2. Team-wide token or utility class: `src/library/styles.css` (`@theme`, `@utility`). One deck only:
   a `.css` file in the deck's folder, imported by the deck.
3. Entrance or build-step effect: `src/library/motion/<name>.css`, a class named after a from-only
   `@keyframes`; use `<Reveal effect="<name>">` or `<Build at={1} effect="<name>">`.
4. Slide transition: `src/library/motion/<name>.css` with `@keyframes <name>-in` and `<name>-out`;
   use `transition: "<name>"` on the deck or `slide(…, { transition: "<name>" })`. Built in: `fade`,
   `push`, `zoom`, `"none"`.
5. Use the motion tokens (`--duration-*`, `--ease-*`, `--rise`) in motion CSS; check it in the
   overview (G) and print (P), which must show the final state.

## New team theme

1. Follow README "Make your own theme" (copy `src/themes/acme/`).
2. Make it the team default in `src/library/settings.json` if asked.
3. Preview: `npm run dev`, `?deck=showcase&theme=<name>` and `&scheme=dark`.

## Refresh data

Follow AGENTS.md "Data: provenance and refresh": `npm run refresh <deck>` (plus `--shared` for library data), follow `how` for agent
sources, ask the user for manual ones, update `updated`, rebuild.

## Check and verify (before every commit)

`npm run check` then `npm run verify`; both must pass. Then look at the changed slides in
`npm run dev` (press G). Upstream updates: `npm run upgrade`.
