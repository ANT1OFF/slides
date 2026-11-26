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
- Presenting saves build steps in the URL, ignores held navigation keys, and adds stage gestures,
  an idle cursor, interruptible transitions, and autoplay (A).
- Timed steps: `<Beat at>` plays content seconds into a build step, `<Build until>` makes a step
  leave, `<SplitText>` reveals a line per word or letter, and `<Ambient>` adds opt-in drift, creep
  or pointer parallax. Back, jumps, print, the overview and reduced motion show steps settled.
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
- **Checks:** `npm run check` (format, lint, layer boundaries, types, every deck builds, examples up to
  date), `npm run verify` (every deck offline in Chrome, every key), and `npm run upgrade` (merge
  upstream on a branch, then both).
- The showcase gives DotGrid more room and uses taller Node cards.
- Verify checks that the build refuses a remote image and a missing font file.
- Verify walks every built deck: every step forwards and back, by URL hash and in fast bursts, must
  land on the same picture. It audits motion for single-frame pops and flashes, checks that reduced
  motion, the overview and print show final states, and writes film strips to `dist/qa/<deck>/`
  (docs/checklist.md). Fixed along the way: with reduced motion, the progress bar and blocks'
  own CSS transitions still eased.
- `npm run lint` runs oxlint on upstream's code, and `npm run check` runs it. It skips `src/library/` and your decks, so it never fails on team code.
- `npm run lint` is stricter: type-aware rules (floating promises, unsafe `any`, needless casts) through the beta `tsrs` backend, the `@cloudflare/oxlint-config` preset, oxlint's suspicious, pedantic and style categories, and two local rules (blank lines between groups of statements; a `// SAFETY:` comment on each cast). Upstream's code is rewritten to pass, with no change in behaviour; formatting stays with Prettier.
- Spectrum accepts a build offset. With `build={0}`, the first tier starts visible.
- View Transition sequencing lives in its own module, with the same slide navigation.
- The README is shorter and keeps the sharing warning in one place.
- Built example decks in `examples/html/`, and a project skill for Claude Code and Codex.
- Added a storytelling guide, a presentation checklist and a fill-in brief for deck authors.
- `<Morph id>` (from `@core`): the same id on two neighbouring slides, and that element moves and
  resizes from one to the other while the slide changes; going back returns it. Six more transitions:
  `iris` (from the centre, a `data-origin` element or a shared Morph), `blur`, and `wipe`, `shove`,
  `flip` and `split`, which take a direction (`"wipe up"`). Going back now plays every transition a
  fifth shorter. A deck that uses none of it looks as before. See [docs/motion.md](docs/motion.md).

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
- `wipe` is now a built-in transition with a soft edge and a direction. Your library's
  `src/library/motion/wipe.css` (the starter's example) still wins, as any file of yours with a
  built-in's name does; delete it to get the built-in one.
- The build now also fails on a CSS `url()` it can't resolve, such as a theme's `@font-face` whose
  font file was deleted: delete the rule, or put the font back.
