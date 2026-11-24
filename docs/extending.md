# Extending

Everything a team adds is **a file in one of its own folders, used by its name or by an import**.
There is nothing to register and no upstream file to edit. Your folders are `src/decks/`,
`src/library/` and `src/themes/<yours>/`; the full ownership table is in [AGENTS.md](../AGENTS.md).

## I want to add …

| A …                                          | Put it in                                                           | Use it like this                                                                              | More                                                   |
| -------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Block** (an element inside a slide)        | `src/library/blocks/<Name>.tsx`, or the deck's folder for a one-off | `import { Funnel } from "@library/blocks/Funnel.tsx"`                                         | [making-a-block.md](making-a-block.md)                 |
| **Layout** (a whole-slide frame)             | The same: a layout is a block that fills the slide                  | Build it from `Slide`, `SlideHeader`, `Footer`, `Kicker`, `Logo` (`@blocks`)                  | [Layouts](#layouts)                                    |
| **Reusable slide or slide set**              | `src/library/slides/<topic>.tsx`                                    | `<Questions />`, `...openingSlides({ title })`                                                | [working-with-decks.md](working-with-decks.md) §5      |
| **Theme** (colours, type, fonts, logo)       | `src/themes/<name>/`                                                | `theme: "<name>"` on the deck; team default in `src/library/settings.json`                    | README, "Make your own theme"                          |
| **Look of one deck**                         | The deck                                                            | `scheme`, `logo`, `footer`, `vars` on the deck                                                | README, "Themes"                                       |
| **Team-wide CSS** (tokens, utilities, rules) | `src/library/styles.css`                                            | `@theme { --color-brand-2: … }` gives `bg-brand-2`; `@utility team-badge { … }` gives a class | [Styles](#styles)                                      |
| **CSS for one deck**                         | A `.css` file in the deck's folder                                  | `import "./deck.css"` in the deck                                                             | [Styles](#styles)                                      |
| **Entrance effect**                          | `src/library/motion/<name>.css`                                     | `<Reveal effect="<name>">`, or the class on an SVG element                                    | [Motion](#motion)                                      |
| **Build-step effect**                        | The same file: one effect serves both                               | `<Build at={1} effect="<name>">`                                                              | [Motion](#motion)                                      |
| **Transition between slides**                | `src/library/motion/<name>.css`                                     | `transition: "<name>"` on the deck, or `slide(…, { transition: "<name>" })`                   | [Motion](#motion)                                      |
| **Motion timing** (calmer, snappier)         | Your theme, or a deck's `vars`                                      | `--duration-fast`, `--duration-base`, `--duration-slow`, `--stagger`, `--rise`, `--ease-*`    | [Motion](#motion)                                      |
| **Loop** (steady motion on a diagram)        | `src/library/motion/<name>.css`                                     | The class on the element, `style={loop(startMs, periodSeconds)}`                              | [Motion](#motion)                                      |
| **Starter deck** (what `npm run new` writes) | `src/decks/_starter/`                                               | Edit it; every new deck is a copy of it                                                       | [Starter deck](#starter-deck)                          |
| **Data with its source**                     | `<name>.data.json` next to the deck, or in `src/library/data/`      | `import data from "./x.data.json"`, `asOf(data)`                                              | [working-with-decks.md](working-with-decks.md), "Data" |
| **Images and logos**                         | The deck's folder, or `src/library/assets/`                         | Import the file where it is used, so the build inlines it                                     | README, "Images, video and sound"                      |
| **House rules for agents**                   | `src/library/AGENTS.md`                                             | Agents read it after the root `AGENTS.md`                                                     |                                                        |

`npm run dev` lists what it finds: decks, themes, blocks, library slides, and the effects and
transitions in `src/library/motion/`.

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

Built in: `fade`, `push`, `zoom` (and `"none"`). A name with no keyframes behind it does nothing:
the slide just changes.

**Elements that carry over.** Give an element on two neighbouring slides the same
`style={{ viewTransitionName: "hero" }}` and the browser moves and resizes it from one to the other
while the transition runs. A name must be unique on its slide.

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

`data-transition-back` is also set when going back. The two snapshots are
`::view-transition-old(slide)` and `::view-transition-new(slide)`.

**What happens in each mode**

| Mode                                       | What happens                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Reduced motion                             | No transition runs; entrance effects end at once                                                |
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
| `Footer`      | The bottom row: the deck's footer text and the slide number                        |
| `Kicker`      | A small label with the accent bar                                                  |
| `Logo`        | The theme's or deck's logo                                                         |

`src/library/blocks/SplitFrame.tsx` is a worked example (a fixed side panel), used by the `Evidence`
slide in `src/library/slides/team.tsx`. For a small variation, `Frame` takes a `className`.
[making-a-block.md](making-a-block.md) has the walkthrough.

## Starter deck

`npm run new <name>` copies `src/decks/_starter/` to `src/decks/<name>/` and replaces the text
`New deck` with the new deck's title. The folder is yours: make it open with your team's slides
(`...openingSlides()`), theme and transition, add files every deck needs, and every new deck starts
that way. It is type-checked like any deck. A team's defaults live here, not in more settings.

## The names you can rely on

- Imports: everything exported by `@core` and `@blocks`, and your own files through `@library/…`.
- Folders: `src/library/{slides,blocks,motion,data,assets}/`, `src/library/styles.css`,
  `src/library/settings.json`, `src/themes/<name>/`, `src/decks/<name>/`, `src/decks/_starter/`.
- CSS: the tokens in `src/themes/default/tokens.css`; the `type-*` and `rule-*` utilities; `--d`
  (an effect's delay) and `--dur` (a loop's period); `.static-motion`; `.inverted`;
  `html[data-transition]`, `html[data-transition-back]` and the `<name>-in` / `<name>-out` keyframe
  pair; `[data-stage]`, `[data-theme]`, `[data-scheme]`.

## What is not pluggable, on purpose

No plugin registry, no JavaScript animation library, no per-noun folders beyond the ones above, no
auto-imported components, one stage size (1920×1080). Each would add a second way to do what a
component, a CSS file or a prop already does. If you need something these don't reach (a new key,
a different presenter view), that is a change to the engine: open a pull request upstream.
