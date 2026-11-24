# Changelog

What changed upstream, newest first. Teams with their own copy read this before `npm run upgrade`.
Versions follow `v0.x` tags until the layout and APIs settle; anything that needs a change in your
decks, library or themes is listed under **Upgrade notes**.

## Unreleased (v0.1.0)

First public version.

- **Decks as React code:** `src/decks/<name>/index.tsx`, built into one self-contained HTML file
  each, with every font, image, video and sound inlined. The build fails on a remote or un-inlined
  asset, and each file carries the licence notices for what it embeds.
- **Presenting:** build steps, transitions between slides, presenter window with notes and timer,
  overview, print and `npm run pdf`, fullscreen, blank screen, jump to slide, growth mode, and a
  key list (`?`). All of it works from the file, offline.
- **About 40 built-in blocks**, shown in the showcase: slides and layout pieces, text, code,
  tables, numbers, diagrams, charts, photos, video and sound. The same props (`start`, `build`,
  `inverted`) mean the same thing on each.
- **Four themes**, each light and dark: `default`, `editorial`, `signal` and the example company
  theme `acme`; the showcase or an example deck uses each. A theme is a folder; a deck picks
  one by name and can override `scheme`, `logo`, `footer` and any token. See [docs/themes.md](docs/themes.md).
- **A team library:** `src/library/` (`@library/…`) for reusable slides, slide sets, blocks,
  layouts, data, assets, team-wide CSS, motion files, a team default theme and house rules for
  agents. Everything a team adds is a file in its own folders, used by name; the dev gallery
  previews it, `npm run verify` renders it, and the showcase's "Your own" slide shows the three
  you'll add most. See [docs/extending.md](docs/extending.md).
- **Refreshable data:** `*.data.json` files with their source, `asOf()` for the footer, and
  `npm run refresh`.
- **Checks:** `npm run check` (format, layer boundaries, types, every deck builds, examples up to
  date), `npm run verify` (every deck offline in Chrome, every key), and `npm run upgrade` (merge
  upstream on a branch, then both).
- The showcase gives DotGrid more room and uses taller Node cards.
- Verify checks that the build refuses a remote image and a missing font file.
- Built example decks in `examples/html/`, and a project skill for Claude Code and Codex.

**Upgrade notes** (only for copies made before v0.1.0)

- Make the `upstream` remote fetch-only: `git remote set-url --push upstream DISABLED`.
  `npm run upgrade` warns while it can be pushed to.
- Upstream no longer changes `src/library/` or `src/decks/` (except the showcase). If the upgrade
  conflicts on starters there, keep yours: `git rm -- <path>` for starters you had deleted, then
  `git restore --source=HEAD --staged --worktree -- src/library src/decks ':(exclude)src/decks/showcase'`.
- If it conflicts on `examples/html/`, take upstream's:
  `git restore --source=MERGE_HEAD --staged --worktree -- examples/html`.
- Wrap the main content of your `SplitFrame` (or any layout of your own) in `<FrameBody>`, so
  `npm run verify` checks it for overflow. See
  [the layout example](docs/making-a-block.md#make-your-own-layout).
- Some defaults changed, so look at slides that use these: `HBars` fills the content width (pass
  `width` to narrow it), `Flow` is taller (pass `height`), `Cycle` has arrowheads, smaller cards
  and a rounder ring, `StatRow` with three numbers or fewer is larger, and built-in motion is a
  little quicker and reads the theme's motion tokens.
- The build now also fails on a CSS `url()` it can't resolve, such as a theme's `@font-face` whose
  font file was deleted: delete the rule, or put the font back.
