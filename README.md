# Slides

Build React presentations into **one self-contained HTML file per deck**. Fonts, images, video and
code are inlined for offline presenting. Use the built-in blocks and themes or grow your own
team library. Record data sources so `npm run refresh` can update your figures.

## Quick start

Clone this template repo with Node.js 22.18 or newer. Your decks live in `src/decks/`.

```bash
git clone https://github.com/ANT1OFF/slides.git my-slides && cd my-slides
npm install
npm run new my-talk      # creates src/decks/my-talk/ from the starter deck
npm run dev              # opens a list of decks; pick my-talk
npm run build my-talk    # writes dist/my-talk.html
```

`npm run build` with no name builds every deck. Open the HTML file and press **F** for fullscreen.
An npm 11 warning about `fsevents` install scripts is harmless.

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

`slide(…, { notes, hidden, id, transition })` sets speaker notes, visibility, a stable id and a
slide-specific transition. Import team slides and blocks through `@library/…`.

## Building blocks

Press **G** in the showcase to see all the blocks. The deck source has code for each one.
[Showcase source](src/decks/showcase/index.tsx)

The same props mean the same thing everywhere: `start` delays a block's entrance (ms); `build`
reveals a list-like block one item per press of → (`true` starts at step 1, a number starts there,
`build={0}` shows the first item at once); `inverted` puts a slide on the theme's other scheme.
Anything else is plain JSX with Tailwind classes; wrap any element in `<Build at={1}>` to reveal it
on a press of →. Motion is CSS used by name: `<Reveal effect="pop">`, `<Build effect="pop">`, and
`transition: "fade"` between slides ([docs/extending.md](docs/extending.md#motion)).

## Themes

Pick a folder from `src/themes/` with `theme: "editorial"`, and use `scheme: "dark"` for its dark
colours. The themes guide covers overrides, making your own theme and setting a team default.
[Themes guide](docs/themes.md)

## Images, video and sound

Import files in the deck and pass them to a block, so the build inlines them:

```tsx
import { PhotoCaption, PhotoSlide } from "@blocks";
import hero from "./hero.jpg";

<PhotoSlide src={hero} alt="Clouds over the ridge">
  <PhotoCaption title="The ridge at dawn" />
</PhotoSlide>;
```

The build fails if a deck links a file instead (`src="https://…"`, `src="/photo.jpg"`, a web font
URL) and says what to import. Inlined files grow by a third, so compress them: photos at about
200 KB, video a few MB (the build warns above 15 MB); link to anything long.

## Presenting

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
npm run check    # formatting, lint (type-aware oxlint), layer boundaries, types, every deck builds, examples/html is up to date
npm run verify   # opens every built deck offline in Chrome and checks fonts, media and every key
npm run pdf x    # dist/x.pdf: one page per visible slide in its final state (no name: every deck)
npm run refresh  # refreshes the data behind the slides (docs/working-with-decks.md, "Data")
npm run upgrade  # merges upstream updates on a branch, then check and verify
```

`verify` and `pdf` use your Chrome (or `CHROME_PATH`), else Playwright's Chromium
(`npx playwright-core install chromium`).

## Your own copy (for teams)

Clone a **private copy** and configure this repo as a fetch-only `upstream` remote. Keep your
decks, library and themes in the team-owned folders for clean upgrades.
[Private copy setup](docs/working-with-decks.md#1-make-your-private-copy)

## Guides

- [AGENTS.md](AGENTS.md): the short workflow and media rules for AI coding agents (and people).
- [Working with decks as a team](docs/working-with-decks.md): private copy, library, data, upgrades.
- [Themes](docs/themes.md): the four themes, per-deck options, making your own.
- [Extending](docs/extending.md): everything you can add (blocks, layouts, effects, keys …) and where.
- [Making a building block](docs/making-a-block.md): conventions, tokens, build steps, layouts.

## Before you send a deck

The HTML file contains everything in the deck, including hidden slides, speaker notes and the data
behind every chart. Check it before you send it outside your team.

## Licence

MIT, see [LICENSE](LICENSE). The fonts in `src/themes/*/fonts/` are under the SIL Open Font License,
with their licence files next to them. Each built deck carries the notices for what it embeds.
