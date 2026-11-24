# Your library

This folder is yours: your team's reusable slides, blocks, animations, styles, data and assets. Upstream ships only the
starters below and leaves the rest of it to you. Decks import from it with `@library/…`; `npm run dev` lists everything in it.

- `slides/`: reusable slides. Export a component per slide (every prop with a default), or a
  function ending in `Slides` that returns a set. See `slides/team.tsx`.
- `blocks/`: your own building blocks, used inside a `Frame`. See `blocks/Funnel.tsx`. A whole-slide
  layout is a block too: see `blocks/SplitFrame.tsx`.
- `motion/`: your own animations, one CSS file each, used by name. `motion/swoop.css` is an entrance
  effect (`<Reveal effect="swoop">`, `<Build effect="swoop">`); `motion/wipe.css` is a transition
  between slides (`transition: "wipe"`).
- `styles.css`: team-wide CSS: your own tokens (`@theme`) and utility classes (`@utility`).
- `data/`: `*.data.json` files several decks use, with where the values come from.
- `assets/`: images and logos, imported where they're used.

The examples here are starters; change or delete them (keep `styles.css` itself, even if empty).
The deck `npm run new` copies is yours too: `src/decks/_starter/`. Everything you can add and where
it goes is in [docs/extending.md](../../docs/extending.md); the full workflow is in
[docs/working-with-decks.md](../../docs/working-with-decks.md).
