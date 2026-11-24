# Slides

Presentations as React code. Each deck is one `.tsx` file and builds into **one self-contained HTML
file**: fonts, images, video and code inlined, nothing fetched when it opens. Email it, put it on a
USB stick, open it offline in any browser.

- **Building blocks** for text, layout, numbers, diagrams, charts, photos, video and sound.
- **Themes** as folders: colours, fonts and a logo, picked with one line per deck.
- **Presenting**: build steps, transitions, presenter window with notes, overview, print to PDF.
- **A library that grows**: keep a private copy as your team's slide library. Your own blocks,
  layouts, slides, themes and effects are files in your folders, used by name; nothing to register.
- **Data that can be refreshed**: numbers carry where they came from, so `npm run refresh` (or your
  agent) can update them a year later.

## Quick start

This is a template repo, not a package: clone it (for a team, as a private copy; see "Your own
copy") and your decks live in `src/decks/`. Needs Node.js 22.18 or newer.

```bash
git clone https://github.com/ANT1OFF/slides.git my-slides && cd my-slides
npm install
npm run new my-talk      # creates src/decks/my-talk/ from the starter deck
npm run dev              # opens a list of decks; pick my-talk
npm run build my-talk    # writes dist/my-talk.html
```

`npm run build` with no name builds every deck. Open the HTML file and press **F** for fullscreen.
npm 11 may warn about install scripts (`fsevents`) during `npm install`; that is harmless and needs
nothing from you.

## Example decks

Built examples are committed in [examples/html/](examples/html/): download one and open it in a
browser, offline, no install needed. Press **F** for fullscreen, **?** for every key.

- [showcase.html](examples/html/showcase.html): every block, in the default theme.
- [example-pitch.html](examples/html/example-pitch.html): a seed pitch ("Ledgerly") in the `acme` theme.
- [example-talk.html](examples/html/example-talk.html): a talk, "Small PRs, fast teams", in the `signal` theme, dark.
- [example-update.html](examples/html/example-update.html): a support team update in the `editorial` theme, with refreshable data.

## A deck

```tsx
// src/decks/my-talk/index.tsx
import { slide, type DeckDefinition } from "@core";
import { Bullets, EndSlide, Frame, TitleSlide } from "@blocks";

const deck: DeckDefinition = {
  title: "My talk",
  theme: "editorial", // optional: a folder in src/themes
  transition: "fade", // optional: between slides
  slides: [
    <TitleSlide title="My talk" subtitle="One line on why it matters." byline="Your name" date="June 2026" />,
    slide(
      <Frame section="Part one" title="Three things we learned">
        <Bullets build items={["First", "Second", "Third"]} />
      </Frame>,
      { notes: "Shown in the presenter window (N)." },
    ),
    <EndSlide />,
  ],
};

export default deck;
```

That is the whole model: **a deck is a title, an optional theme, and a list of slides. A slide is JSX.**
`slide(…, { notes, hidden, id, transition })` adds speaker notes, hides a backup slide, gives it a
stable id or its own transition. Imports: `@blocks` (built-in blocks), `@core` (`slide`, `Build`,
`asOf`, types) and `@library/…` (your team's own slides and blocks).

## Building blocks

About 40 blocks: whole slides (`TitleSlide`, `Frame`, `SectionSlide` …), text, layout, media,
numbers, diagrams and charts. Open [showcase.html](examples/html/showcase.html) (or `showcase` in
`npm run dev`) to see every one with its name and an example; press **G** for the overview. The
source, `src/decks/showcase/index.tsx`, is the code for each.

The same props mean the same thing everywhere: `start` delays a block's entrance (ms); `build`
reveals a list-like block one item per press of → (`true` starts at step 1, a number starts there,
`build={0}` shows the first item at once); `inverted` puts a slide on the theme's other scheme.
Anything else is plain JSX with Tailwind classes; wrap any element in `<Build at={1}>` to reveal it
on a press of →.

### Animation

All by name, all plain CSS underneath: `<Reveal effect="pop">` for an entrance (`rise`, `fade`,
`pop`), `<Build at={1} effect="pop">` for a build step, and `transition: "fade"` on a deck or
`slide(…, { transition: "push" })` between slides (`fade`, `push`, `zoom`). Your own effects and
transitions are CSS files in `src/library/motion/`; see [docs/extending.md](docs/extending.md#motion).
Where the browser lacks View Transitions, or the viewer prefers reduced motion, the slide simply
changes.

## Themes

A theme is a folder in `src/themes/`; four come with the repo: `default` (plain, Inter, one
vermilion accent), `editorial` (a printed page), `signal` (a poster in black and yellow) and `acme`
(an example company theme, to copy for yours). Pick one, and change the look of one deck:

```tsx
theme: "editorial",                       // a folder in src/themes
scheme: "dark",                           // the theme's dark colours
footer: "Acme · Board meeting",           // bottom left of every slide (false hides it)
vars: { "--color-accent": "#0a7d5a" },    // any token, for this deck only
```

[docs/themes.md](docs/themes.md) has every option and the steps to **make your own theme** (colours,
fonts, logo, a team default).

## Images, video and sound

Import files in the deck and pass them to a block, so the build inlines them:

```tsx
import hero from "./hero.jpg";
<PhotoSlide src={hero} alt="…">
  <PhotoCaption title="…" />
</PhotoSlide>;
```

The build fails if a deck links a file instead (`src="https://…"`, `src="/photo.jpg"`, a web font
URL) and says what to import. Inlined files grow by a third, so compress them: photos at about
200 KB, video a few MB (the build warns above 15 MB); link to anything long.

## Presenting

Every key works in the built file, offline.

| Key                         | Does                                                                         |
| --------------------------- | ---------------------------------------------------------------------------- |
| → Space ↓ PgDn, click right | Next build step, then next slide                                             |
| ← ↑ PgUp, click left        | Previous build step, then previous slide                                     |
| Home / End                  | First / last slide                                                           |
| a number, then Enter        | Jump to that slide                                                           |
| F                           | Fullscreen                                                                   |
| N                           | Presenter window: this and the next slide, notes, timer (R resets) and clock |
| G                           | Overview grid: click, or arrow keys and Enter, to jump; Esc or G closes      |
| P                           | Print every visible slide in its final state; choose "Save as PDF"           |
| B or .                      | Blank the screen; any key brings it back                                     |
| ?                           | List these keys                                                              |

- The URL hash is the slide number (`deck.html#12`). Hidden slides (`slide(x, { hidden: true })`)
  are skipped when presenting and printing; reach them from the overview.
- **Growth mode:** M switches numbers between raw counts and growth for blocks given a `relative`
  value (`Stat`, `StatRow`, `BarSeries`, `StackedArea`).
- **Your own keys and extras** (a timer bar, a pointer) are components on the deck's `overlay`; see
  [docs/extending.md](docs/extending.md#keys-and-presenter-extras).

## Checking and exporting

```bash
npm run format   # fixes formatting (npm run check fails on it)
npm run check    # formatting, layer boundaries, types, every deck builds, examples/html is up to date
npm run verify   # opens every built deck offline in Chrome and checks fonts, media and every key
npm run pdf x    # dist/x.pdf: one page per visible slide in its final state (no name: every deck)
npm run refresh  # refreshes the data behind the slides (docs/working-with-decks.md, "Data")
npm run upgrade  # merges upstream updates on a branch, then check and verify
```

`verify` and `pdf` use your Chrome (or `CHROME_PATH`), else Playwright's Chromium
(`npx playwright-core install chromium`).

## Your own copy (for teams)

To keep this repo as your team's slide library, make a **private copy** by cloning (not "Use this
template", not a public fork) and keep this repo as a fetch-only `upstream` remote. Your decks,
library and themes live in folders upstream never touches, so `npm run upgrade` merges cleanly.
[docs/working-with-decks.md](docs/working-with-decks.md) has the commands and the whole cycle:
team theme, reusing and promoting library pieces, refreshable data, upgrading.

## Guides

- [AGENTS.md](AGENTS.md): the short workflow and media rules for AI coding agents (and people).
- [Working with decks as a team](docs/working-with-decks.md): private copy, library, data, upgrades.
- [Themes](docs/themes.md): the four themes, per-deck options, making your own.
- [Extending](docs/extending.md): everything you can add (blocks, layouts, effects, keys …) and where.
- [Making a building block](docs/making-a-block.md): conventions, tokens, build steps, layouts.
- [Design](docs/design.md): the token set, the type scale and the layout rules.
- [Inspiration](docs/inspiration.md): which ideas came from which frameworks.

## Before you send a deck

The HTML file contains everything in the deck, including hidden slides, speaker notes and the data
behind every chart. Check it before you send it outside your team.

## Licence

MIT, see [LICENSE](LICENSE). The fonts in `src/themes/*/fonts/` are under the SIL Open Font License,
with their licence files next to them. Each built deck carries the notices for what it embeds.
