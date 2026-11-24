# Your library

This folder is yours: your team's reusable slides, blocks, data and assets. Upstream ships only the
starters below and leaves the rest of it to you. Decks import from it with `@library/…`; `npm run dev` lists everything in it.

- `slides/`: reusable slides. Export a component per slide (every prop with a default), or a
  function ending in `Slides` that returns a set. See `slides/team.tsx`.
- `blocks/`: your own building blocks, used inside a `Frame`. See `blocks/Funnel.tsx`.
- `data/`: `*.data.json` files several decks use, with where the values come from.
- `assets/`: images and logos, imported where they're used.

The examples here are starters; change or delete them. The full workflow is in
[docs/working-with-decks.md](../../docs/working-with-decks.md).
