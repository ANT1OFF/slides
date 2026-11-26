# Extending

Everything a team adds is **a file in one of its own folders, used by its name or by an import**.
There is nothing to register and no upstream file to edit. Your folders are `src/decks/`,
`src/library/` and `src/themes/<yours>/`; the full ownership table is in [AGENTS.md](../AGENTS.md).

## I want to add …

| A …                                          | Put it in                                                           | Use it like this                                                                              | More                                                    |
| -------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Block** (an element inside a slide)        | `src/library/blocks/<Name>.tsx`, or the deck's folder for a one-off | `import { Funnel } from "@library/blocks/Funnel.tsx"`                                         | [making-a-block.md](making-a-block.md)                  |
| **Layout** (a whole-slide frame)             | The same: a layout is a block that fills the slide                  | Build it from `Slide`, `SlideHeader`, `FrameBody`, `Footer`, `Kicker`, `Logo` (`@blocks`)     | [Layouts](#layouts)                                     |
| **Reusable slide or slide set**              | `src/library/slides/<topic>.tsx`                                    | `<Questions />`, `...openingSlides({ title })`                                                | [working-with-decks.md](working-with-decks.md) §5       |
| **Theme** (colours, type, fonts, logo)       | `src/themes/<name>/`                                                | `theme: "<name>"` on the deck; team default in `src/library/settings.json`                    | [themes.md](themes.md)                                  |
| **Look of one deck**                         | The deck                                                            | `scheme`, `logo`, `footer`, `vars` on the deck                                                | [themes.md](themes.md)                                  |
| **Team-wide CSS** (tokens, utilities, rules) | `src/library/styles.css`                                            | `@theme { --color-brand-2: … }` gives `bg-brand-2`; `@utility team-badge { … }` gives a class | [Styles](#styles)                                       |
| **CSS for one deck**                         | A `.css` file in the deck's folder                                  | `import "./deck.css"` in the deck                                                             | [Styles](#styles)                                       |
| **Entrance effect**                          | `src/library/motion/<name>.css`                                     | `<Reveal effect="<name>">`, or the class on an SVG element                                    | [Motion](#motion)                                       |
| **Build-step effect**                        | The same file: one effect serves both                               | `<Build at={1} effect="<name>">`                                                              | [Motion](#motion)                                       |
| **Transition between slides**                | `src/library/motion/<name>.css`                                     | `transition: "<name>"` on the deck, or `slide(…, { transition: "<name>" })`                   | [Motion](#motion)                                       |
| **Motion timing** (calmer, snappier)         | Your theme, or a deck's `vars`                                      | `--duration-fast`, `--duration-base`, `--duration-slow`, `--stagger`, `--rise`, `--ease-*`    | [Motion](#motion)                                       |
| **Loop** (steady motion on a diagram)        | `src/library/motion/<name>.css`                                     | The class on the element, `style={loop(startMs, periodSeconds)}`                              | [Motion](#motion)                                       |
| **Preview of a block** in the dev gallery    | The block's file                                                    | `export const example = <Funnel stages={…} />`                                                | [Previews](#previews)                                   |
| **Code highlighting** for another language   | A block in `src/library/blocks/` that wraps `Code`                  | `<Code tokenize={sqlTokens}>`                                                                 | [Code highlighting](#code-highlighting)                 |
| **Presenter extra** (timer bar, pointer …)   | A component in `src/library/blocks/`                                | `overlay: <TimerBar minutes={20} />` on the deck; it reads `useDeckNav()`                     | [Keys and presenter extras](#keys-and-presenter-extras) |
| **Keyboard shortcut**                        | The same component, or any block                                    | `useDeckKey("t", "Restart the talk timer", restart)`                                          | [Keys and presenter extras](#keys-and-presenter-extras) |
| **Starter deck** (what `npm run new` writes) | `src/decks/_starter/`                                               | Edit it; every new deck is a copy of it                                                       | [Starter deck](#starter-deck)                           |
| **Data with its source**                     | `<name>.data.json` next to the deck, or in `src/library/data/`      | `import data from "./x.data.json"`, `asOf(data)`                                              | [working-with-decks.md](working-with-decks.md), "Data"  |
| **Images and logos**                         | The deck's folder, or `src/library/assets/`                         | Import the file where it is used, so the build inlines it                                     | README, "Images, video and sound"                       |
| **House rules for agents**                   | `src/library/AGENTS.md`                                             | Agents read it after the root `AGENTS.md`                                                     |                                                         |

`npm run dev` shows what it finds: decks, themes, the built-in blocks, and a small preview of every
library slide, library block and motion file ([Previews](#previews)).

The visual rules and references are in [Design](design.md) and [Inspiration](inspiration.md).

## Motion

One folder, `src/library/motion/`, holds every animation of your own: **one CSS file per effect or
transition**. The build finds the files, inlines them into every deck, and you use them by name.
Motion for one deck only is the same CSS in a file the deck imports. After adding a new file,
restart `npm run dev`. Two examples ship in the
folder: `swoop.css` (an effect) and `wipe.css` (a transition).

**An entrance effect** is a class named after a `from`-only `@keyframes`. The element's own style is
its final state, which is why print, the overview and reduced motion need no extra code.

```css
/* src/library/motion/swoop.css */
@keyframes swoop {
  from {
    opacity: 0;
    transform: translateX(calc(var(--rise) * -5)) rotate(-3deg);
  }
}
.swoop {
  animation: swoop var(--duration-slow) var(--ease-out) both;
  animation-delay: var(--d, 0ms);
}
```

```tsx
<Reveal effect="swoop" delay={200}>…</Reveal>   // when the slide opens
<Build at={2} effect="swoop">…</Build>          // on the second press of →
<rect className="swoop" style={delay(300)} />   // on an SVG element
```

Built in: `rise` (the default), `fade`, `pop`. A `Build` without `effect` fades in as before.

**A slide transition** is a pair of `@keyframes`: `<name>-in` for the arriving slide and
`<name>-out` for the leaving one. Going back, the deck plays the pair the other way round and
reversed, so you write one direction.

```css
/* src/library/motion/wipe.css */
@keyframes wipe-in {
  from {
    clip-path: inset(0 0 0 100%);
  }
}
@keyframes wipe-out {
  to {
    transform: translateX(-4%);
  }
}
```

```tsx
const deck: DeckDefinition = {
  title: "Q3 review",
  transition: "wipe", // every slide; leave out for none
  slides: [
    <TitleSlide … />,
    slide(<SectionSlide … />, { transition: "push" }), // this slide arrives differently
    slide(<Frame … />, { transition: "none" }),
  ],
};
```

Built in: `fade`, `push`, `zoom`, `blur`, `iris`, and `wipe`, `shove`, `flip` and `split`, which take
a direction (`"wipe up"`); `"none"` switches it off. [motion.md](motion.md) shows each and says when
to use it. A name with no keyframes behind it does nothing: the slide just changes. A file of yours
with a built-in's name replaces it, which the starter's `wipe.css` does.

**Direction and origin.** For the run, the deck sets on `<html>` what your keyframes can read:
`--dx` and `--dy` (the direction after the name as -1, 0 or 1; left, the
default, is `-1 0`), and, when the slide before has a `data-origin` element or a shared Morph,
`--origin-x`, `--origin-y` and `--origin-r`: its centre and the distance to the farthest corner, in
the slide's 1920×1080 pixels. So `transition: "curtain down"` runs your `curtain-in` and
`curtain-out` with `--dy: 1`:

```css
@keyframes curtain-in {
  from {
    transform: translateY(calc(var(--dy) * -100%));
  }
}
```

**Elements that carry over.** Wrap the same thing on two neighbouring slides in
`<Morph id="hero">` (from `@core`), and it moves and resizes from one to the other while the
transition runs. [motion.md](motion.md#morph-one-element-two-slides) has the rules.

**Timing comes from tokens.** Built-in motion reads `--duration-fast` (a build step),
`--duration-base` (a block entering, a slide change), `--duration-slow` (bars, lines), `--rise`,
`--ease-out` and `--ease-in-out`; `<Reveal order={i}>` and `stagger(i, start)` space list items
`--stagger` apart. Set them in a theme, or for one deck with `vars: { "--duration-base": "900ms" }`.
Use them in your own motion files so they follow. Most built-in charts and diagrams still space
their own parts by fixed steps tuned per block.

**To restyle one transition**, key on the attribute `<html>` carries while it runs:

```css
html[data-transition="wipe"]::view-transition-new(slide) {
  animation-duration: 1.2s;
}
```

`data-transition-back` is also set when going back, which runs a fifth shorter
(`--transition-duration`). The two snapshots are `::view-transition-old(slide)` and
`::view-transition-new(slide)`.

**What happens in each mode**

| Mode                                       | What happens                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Reduced motion                             | No transition runs and no Morph flies; entrance effects end at once                             |
| Print (P), overview (G), presenter         | The final state: `.static-motion` switches animation off, and every `Build` is on its last step |
| A browser without the View Transitions API | The slide changes with the plain entrance, as a deck with no transition does                    |

A loop of your own that should not show in print needs one more rule:
`.static-motion .my-loop { display: none; }`.

## Styles

`src/library/styles.css` is yours and is part of the kit's stylesheet (`src/styles.css` imports it
last), so Tailwind's `@theme`, `@utility` and `@apply` work in it:

```css
/* src/library/styles.css */
@theme {
  --color-brand-2: #7a3cff; /* gives bg-brand-2, text-brand-2 … */
}
@utility team-badge {
  @apply type-label rounded-box bg-accent px-4 py-2 text-on-accent;
}
```

Keep the file, even if empty. Prefer the theme's tokens to new colours: a fixed colour doesn't follow
dark or inverted slides. A `@utility` in a CSS file imported any other way is silently dropped by
Tailwind, which is why this one file exists.

CSS for one deck goes in the deck's folder: `import "./deck.css"` in the deck. It is inlined into
that deck only. Plain CSS and keyframes work there; `@utility` and `@theme` don't.

## Layouts

A layout is a block that fills the slide; there is no separate concept. `Frame` and the other
whole-slide blocks are made of exported pieces, so a layout of your own is short:

| Piece         | What it is                                                                         |
| ------------- | ---------------------------------------------------------------------------------- |
| `Slide`       | The shell: fills the stage with the theme's slide padding, as a column; `inverted` |
| `SlideHeader` | The top row: `kicker` on the left, the logo (or `aside`) on the right              |
| `FrameBody`   | The space under the title; `npm run verify` checks that what is inside fits        |
| `Footer`      | The bottom row: the deck's footer text and the slide number                        |
| `Kicker`      | A small label with the accent bar                                                  |
| `Logo`        | The theme's or deck's logo                                                         |

`src/library/blocks/SplitFrame.tsx` is a worked example (a fixed side panel), used by the `Evidence`
slide in `src/library/slides/team.tsx`. Put a layout's body in `FrameBody` (or mark your own element
`data-frame-body`), so verify reports it when it is too tall, as it does for a `Frame`. For a small
variation, `Frame` takes a `className`, and `density="compact"` for a dense slide.
[making-a-block.md](making-a-block.md) has the walkthrough.

## Previews

The dev gallery (`npm run dev`) draws the library instead of listing file names, and "Open the
library" shows the same slides full size, as one deck:

| For                             | It shows                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| A file in `src/library/slides/` | Every exported component with its default props, and every `…Slides()` set                  |
| A file in `src/library/blocks/` | The file's `example` export                                                                 |
| A file in `src/library/motion/` | One slide per entrance effect (it plays on opening and on →) and one per transition between |

A block usually needs props, so its file says what to show:

```tsx
// src/library/blocks/Funnel.tsx
export const example = (
  <Funnel
    stages={[
      { label: "Visited", value: 1200 },
      { label: "Signed up", value: 640 },
    ]}
  />
);
```

An element is shown inside a `Frame` titled with the file's name. A block that fills the slide
itself (a layout) wraps its example in `slide(…)` and is shown as it is:
`export const example = slide(<SplitFrame … />)`. A block file without an `example` is listed by
name and not drawn.

`npm run verify` builds this same view and opens it offline, so a library slide, a block's example
or a motion file that fails to render fails verify, with the file's name.

## Code highlighting

`Code` colours common languages with a small built-in tokenizer. For another language, or a
highlighter of your choice, pass `tokenize`: a function from one line of source to the nodes to
show.

```tsx
<Code tokenize={sqlTokens}>{`select * from decks`}</Code>
// tokenize: (line: string) => ReactNode[]
```

The spans' classes are the contract, and the theme colours them: `tok-kw`, `tok-string`,
`tok-number`, `tok-type`, `tok-fn`, `tok-comment`, `tok-punct`. The built-in tokenizer is exported
from `@blocks` as `tokenize(line, keywords?)`, so adding a language is often just its keywords:

```tsx
// src/library/blocks/Sql.tsx (shipped as an example; shortened)
const KEYWORDS = new Set("select from where group by order".split(" "));
export const sqlTokens = (line: string) => tokenize(line, KEYWORDS);
export const Sql = (props: Omit<ComponentProps<typeof Code>, "tokenize">) => <Code tokenize={sqlTokens} {...props} />;
```

For a full highlighter, import it in your wrapper block and return its output from `tokenize`. Only
the decks that use that block carry its size; the kit's own tokenizer stays at about 1 kB.

## Keys and presenter extras

A presenter extra (a timer bar, a laser pointer, a watermark, a listener for a remote) is a plain
component. Two things connect it to the deck, both from `@core`:

- **`overlay` on the deck** draws it once over the window, for the whole deck, above the slides.
- **`useDeckNav()`** gives it the position and the controls: `{ index, step, count, slides, nav, goto }`.
  `index` counts from 0. `slides` lists `{ id, hidden }` in deck order, including backups.
  `goto` accepts a zero-based index or a slide id and ignores unknown ids. Set an explicit `id`
  on slides you want to jump to by name. `nav(1)` and `nav(-1)` do what → and ← do.
- **`useDeckKey(key, does, run)`** adds a keyboard shortcut for as long as the component is on
  screen. It runs only while presenting, and it is listed under `?` after the built-in keys.

```tsx
// src/library/blocks/TimerBar.tsx (shipped as an example; shortened)
export function TimerBar({ minutes = 20 }: { minutes?: number }) {
  const { index, count } = useDeckNav();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  useDeckKey("t", "Restart the talk timer", () => setStartedAt(Date.now()));
  // … a bar whose width is the share of `minutes` used, compared with index / count
}

const deck: DeckDefinition = { title: "Q3 review", overlay: <TimerBar minutes={20} />, slides: [...] };
```

To jump to the first backup with a shortcut:

```tsx
const { slides, goto } = useDeckNav();
useDeckKey("k", "Jump to the first backup", () => {
  const backup = slides.find((slide) => slide.hidden);
  if (backup) goto(backup.id);
});
```

Rules that keep this simple:

- The built-in keys always win; pick a free one (`?` shows which are taken). `key` is a
  `KeyboardEvent.key`: `"t"`, `"Escape"`, `"F9"`. A letter also matches with Shift or Caps Lock.
- Clicks pass through the overlay to the deck. An element that should take clicks itself needs
  `pointer-events-auto`, and `onClick={(e) => e.stopPropagation()}` if the click shouldn't also
  move the deck.
- The overlay is laid out in window pixels, not on the 1920×1080 stage, and has the deck's theme
  tokens (`bg-accent`, `text-ink-2` …).
- It is not drawn in print or the PDF export, in the overview's thumbnails or in the presenter
  window. Both hooks also work inside a slide, e.g. a "jump to the appendix" button.
- Several extras: `overlay: <><TimerBar /><LaserPointer /></>`. To give every new deck one, put it
  in the starter deck.

## Starter deck

`npm run new <name>` copies `src/decks/_starter/` to `src/decks/<name>/` and replaces the text
`New deck` with the new deck's title. The folder is yours: make it open with your team's slides
(`...openingSlides()`), theme and transition, add files every deck needs, and every new deck starts
that way. It is type-checked like any deck. A team's defaults live here, not in more settings.

## The names you can rely on

- Imports: everything exported by `@core` and `@blocks`, and your own files through `@library/…`.
- Exports the kit reads from your files: `default` from a deck; components and `…Slides` functions
  from `src/library/slides/`; `example` from a file in `src/library/blocks/`.
- On a deck: `overlay`, next to `theme`, `scheme`, `logo`, `footer`, `vars`, `transition`.
- Folders: `src/library/{slides,blocks,motion,data,assets}/`, `src/library/styles.css`,
  `src/library/settings.json`, `src/themes/<name>/`, `src/decks/<name>/`, `src/decks/_starter/`.
- CSS: the tokens in `src/themes/default/tokens.css`; the `type-*` and `rule-*` utilities; `--d`
  (an effect's delay) and `--dur` (a loop's period); `.static-motion`; `.inverted` (the theme's other scheme); `.accented` (a box or slide filled
  with the accent, its text in `on-accent`); `.compact` (body text, padding and gaps a notch
  smaller); `data-frame-body` (a body verify checks for overflow); the `tok-*`
  classes of a code token;
  `html[data-transition]`, `html[data-transition-back]` and the `<name>-in` / `<name>-out` keyframe
  pair; `[data-stage]`, `[data-theme]`, `[data-scheme]`.

## Page-review tags

The deck tags the DOM so tools that comment on a page (for example an AI agent's preview pane) know
which slide and build step a comment was made on: `data-deck` and `data-deck-mode` on the root,
`data-slide`, `data-slide-id` and `data-notes` on each slide, `data-build` and `data-build-count` on
the current one, `data-stage`, `data-theme` and `data-scheme` on the 1920×1080 stage, and in
`npm run dev` only, `data-source` (file:line:column) on every element.

## What is not pluggable, on purpose

No plugin registry, no JavaScript animation library, no per-noun folders beyond the ones above, no
auto-imported components, one stage size (1920×1080). Each would add a second way to do what a
component, a CSS file or a prop already does. The presenter window and the overview are not
pluggable either: a deck's `overlay` covers additions to the deck window. If you need something
these don't reach (a different presenter view, a change to what a built-in key does), that is a
change to the engine: open a pull request upstream.
