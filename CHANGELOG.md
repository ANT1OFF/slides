# Changelog

What changed upstream, newest first. Teams with their own copy read this before `npm run upgrade`.
Versions follow `v0.x` tags until the layout and APIs settle; anything that needs a change in your
decks, library or themes is listed under **Upgrade notes**.

## Unreleased (v0.1.0)

First public version.

From dogfooding a team copy:

- **Dense slides:** `<Frame density="compact">` (or the `.compact` class) steps body text, small
  text, box padding and item gaps down a notch, from the theme's own sizes. The recipe for dense
  slides is in [docs/design.md](docs/design.md#dense-slides).
- **Overflow checks:** `npm run verify` also reports a slide whose content is taller than the stage,
  and a layout's body when it is in the new `FrameBody` piece (or marked `data-frame-body`). Reports
  name the slide number: `Frame-3 (slide 13)`.
- A deck's theme is read only from the deck object's own `theme` key, so data or props with a
  `theme` field no longer break the build.
- `npm run refresh <deck> --shared` works without the `--` under npm 11 too; the docs write
  `npm run refresh -- <deck> --shared`.
- In the overview (G), the arrow keys move and Enter jumps.
- `Build` takes `style`.
- `npm run upgrade` warns when the `upstream` remote can be pushed to. Make it fetch-only:
  `git remote set-url --push upstream DISABLED`, so a team's private decks can't be pushed to the
  public kit by mistake.
- Docs: the README section is "Your own copy (for teams)"; Inter and JetBrains Mono are in every
  deck; `build={0}`; `.accented`, `.compact` and `data-frame-body` among the names you can rely on;
  library pieces may import each other; replace the starters and update `src/library/README.md`
  and `AGENTS.md`.

- **Team-owned paths are frozen upstream.** After the first clone, upstream never changes, adds or
  removes a file in `src/library/` or `src/decks/` (except the showcase), so `npm run upgrade` can't
  conflict there. New examples ship in the docs or `examples/`; CI fails an upstream pull request
  that touches those paths. (Until now, #5 had changed `Funnel.tsx`, `SplitFrame.tsx` and
  `src/library/README.md` and added `Sql.tsx` and `TimerBar.tsx`.)

**Upgrade notes**

- Upgrading across #5 can conflict once on the starters it changed. A starter you deleted (a
  modify/delete conflict, e.g. `Funnel.tsx`): `git rm src/library/blocks/Funnel.tsx`. One you
  changed: keep yours, `git checkout --ours <file>`. `Sql.tsx` and `TimerBar.tsx` arrive as new
  files; delete them if you don't want them.

- If your copy committed rebuilt `examples/html/` files (the old advice when `npm run check` called
  them stale), take upstream's when the upgrade conflicts on them: `git checkout --theirs examples/html`.
- Set `upstream` fetch-only once: `git remote set-url --push upstream DISABLED`.
- The starter `src/library/blocks/SplitFrame.tsx` predates `FrameBody`. In your copy, put its body in
  `<FrameBody>` so verify checks it.

**Known gaps:** `npm run refresh <deck>` can't yet tell which `src/library` data a deck's slides
use (add `--shared`); `BarSeries` growth with `relativeTo: { base: "first" }` against a partial
first period gives a misleading multiple (pass a number instead).

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
- **Previews of the library.** The dev gallery draws every library slide, every library block
  (a block file's `example` export) and every effect and transition in `src/library/motion/`, and
  `npm run verify` renders them, so a broken one fails verify by name.
- `Code` takes `tokenize`, a highlighter of your own; the built-in one is exported as `tokenize`.
  `src/library/blocks/Sql.tsx` is an example.
- **Keys and presenter extras as components.** A deck's `overlay` is drawn over the window;
  `useDeckNav()` and `useDeckKey()` (`@core`) give a component the deck's position and its own
  shortcut, listed under `?`. `src/library/blocks/TimerBar.tsx` is an example.
- The examples and the showcase are built from upstream's files only (an empty library, their own
  class names), so `npm run check` no longer reports `examples/html/` as stale in a team copy that
  has its own classes, motion, `styles.css` or default theme.
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
