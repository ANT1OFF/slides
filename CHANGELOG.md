# Changelog

What changed upstream, newest first. Teams with their own copy read this before `npm run upgrade`.
Versions follow `v0.x` tags until the layout and APIs settle; anything that needs a change in your
decks, library or themes is listed under **Upgrade notes**.

## Unreleased (v0.1.0)

First public version.

- **Animation by name.** `<Reveal effect>` takes any effect name, `<Build effect>` plays one on a
  build step, and a deck or a slide can name a `transition` between slides (built in: `fade`, `push`,
  `zoom`; on the View Transitions API, with a plain slide change where it is missing or motion is
  reduced). A team's own effects and transitions are CSS files in `src/library/motion/`.
- Built-in motion reads the motion tokens (`--duration-*`, `--ease-*`, `--rise`, `--stagger`), so a
  theme or a deck's `vars` can tune it. Timings moved slightly: `fade` and `pop` 700 → 600 ms, the
  rise distance 28 → 24 px, a build step's fade 500 → 300 ms.
- `src/library/styles.css`: team-wide tokens and utilities, part of the main stylesheet.
- Layout pieces exported for layouts of your own: `Slide`, `SlideHeader` (next to `Footer`, `Kicker`,
  `Logo`); `Frame` takes `className`. `src/library/blocks/SplitFrame.tsx` is an example.
- `npm run new` copies `src/decks/_starter/`, the team's own starter deck.
- [docs/extending.md](docs/extending.md): every extension point in one table. The ownership table
  now lists every file.

- Built example decks and the showcase are committed in `examples/html/`; `npm run build:examples`
  rebuilds them and `npm run check` fails when they are stale.

- Decks as React code (`src/decks/<name>/index.tsx`), built into one self-contained HTML file each.
- Presenting: build steps, presenter window, overview, print to PDF, fullscreen, blank screen,
  jump to slide, growth mode, key list (`?`).
- 41 built-in blocks, shown in the showcase deck; four themes (default "Plain", editorial, signal,
  and the example custom theme acme), each light and dark.
- Team library in `src/library/` (`@library/…`): reusable slides and slide sets, blocks, data,
  assets, `settings.json` (team default theme) and `AGENTS.md` (house rules).
- Refreshable data: `*.data.json` with provenance, `asOf()`, `npm run refresh`.
- `npm run check` (format, layer boundaries, types, every deck builds), `npm run verify` (every deck
  offline in Chrome, plus every key on a fixture deck), `npm run upgrade` (merge upstream on a branch).
- Project skill for Claude Code (`.claude/skills/slides`) and Codex (`.agents/skills/slides`).
