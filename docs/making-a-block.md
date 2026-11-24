# Making a building block

A block is a React component that draws on the 1920×1080 stage. Slides are scaled to fit the screen,
so you design in real pixels at 1920×1080 and never think about screen sizes.

## Where it lives

| It's used by                | Put it in                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| One deck only               | The deck's folder, e.g. `src/decks/my-talk/Funnel.tsx`. Import it with `./Funnel.tsx`.                                              |
| Several of your decks       | `src/library/blocks/Funnel.tsx`, imported with `@library/blocks/Funnel.tsx`. It shows in the dev gallery.                           |
| Everyone who uses this repo | `src/blocks/`, but only as a pull request upstream: that folder is upstream's, and editing it in your copy makes upgrades conflict. |

Start deck-local. Promote a block to `src/library/blocks/` when a second deck wants it.

## A minimal block

```tsx
// src/library/blocks/Funnel.tsx
import type { ReactNode } from "react";
import { Build, Reveal } from "@core";
import { stepOf, type BuildProp } from "@blocks";

export interface FunnelStage {
  label: ReactNode;
  value: number;
}

/** A conversion funnel: one bar per stage, narrowing. `build` reveals a stage per press of →. */
export function Funnel({ stages, build, start = 200 }: { stages: FunnelStage[]; build?: BuildProp; start?: number }) {
  const top = stages[0]?.value || 1;
  return (
    <div className="flex flex-col gap-3">
      {stages.map((s, i) => (
        <Build key={i} at={stepOf(build, i)} enabled={!!build}>
          <Reveal
            delay={build ? 0 : start + i * 90}
            className={`type-strong flex h-24 items-center justify-between rounded-box px-10 ${i === stages.length - 1 ? "bg-accent text-on-accent" : "bg-surface"}`}
            style={{ width: `${(s.value / top) * 100}%` }}
          >
            <span>{s.label}</span>
            <span className="tabular-nums">{s.value.toLocaleString("en-US")}</span>
          </Reveal>
        </Build>
      ))}
    </div>
  );
}
```

## Conventions

Follow these and a block works in every theme, in dark and inverted slides, in the overview, in print
and in the presenter window without extra code. The full design rules are in [design.md](design.md).

**Imports**: a block imports only from `@core` and other blocks. Never from `@library`, a deck, a
theme or a virtual module; `npm run check` enforces this so the engine and blocks stay portable.

**Props**

- Data first (`items`, `rows`, `series`), then options. Reuse existing names: `title`, `items`,
  `start`, `build`, `highlight`, `columns`.
- `start?: number`: delay in ms before the entrance. Default 200–300 for content blocks.
- `build?: BuildProp` for anything list-like: `stepOf(build, i)` for item `i`, and
  `<Build at={…} enabled={!!build}>` around each item.
- Accept `ReactNode` for text, so callers can put `<em>` or `<code>` inside.
- One-line doc comment on every exported component saying what it is for.

**Colour**: only theme tokens, never hex values or Tailwind's palette (`blue-500`).

| Use                 | Class                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Background, panels  | `bg-canvas`, `bg-surface`                                                                                                       |
| Text                | `text-ink`; secondary `text-ink-2` (never `text-ink/60`: it falls under 4.5:1 in some themes)                                   |
| The accent as text  | `text-accent-text`; as a fill `bg-accent`; text on it `text-on-accent`                                                          |
| Hairlines and rules | `rule-top`, `rule-bottom` (hairline), `rule-top-strong` (panel top), `bg-rule`, `stroke-rule`                                   |
| Charts              | `series(i)` from `./palette.ts` for several series; `fill-muted` and `fill-chart-key` for one series with one mark that matters |

A photo is dark in every theme, so text over a photo is the one place to use `text-white`.

**Type**: use the type roles, which take size, weight, tracking and leading from the theme.

| Role                                                           | For                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `type-display`, `type-section`, `type-statement`, `type-quote` | Whole-slide text: title slide, section divider, statement, quote          |
| `type-title`                                                   | Slide titles (Frame draws these)                                          |
| `type-lead`, `type-strong`                                     | Lead paragraph; list and card titles                                      |
| `type-body`, `type-small`                                      | Body text; detail lines, captions, table cells                            |
| `type-label`                                                   | Kickers, column heads, axis labels, footers; the smallest text on a slide |
| `type-stat`                                                    | Numbers; add a size: `text-stat` (hero), `text-stat-sm`                   |

Nothing goes below `type-label` (26 px). Use `tabular-nums` for numbers that line up.

**Space and shape**: `rounded-box` for panels and images (0 in the default theme), padding
`p-(--pad-box)`, gaps `gap-(--gap-item)` and `gap-(--gap-column)`. A Frame body is about 1680 × 640 px.

**Motion**

- Entrance, once when the slide opens: `<Reveal effect="rise|fade|pop" delay={ms}>`, or a class on
  an SVG element: `rise`, `fade`, `pop`, `draw` (paths with `pathLength={1}`), `grow`, `grow-x`, with
  `style={delay(ms)}`. Stagger by about 90 ms; keep the whole entrance under ~1.5 s.
- Loops (`<Traveller>`, `<Pulse>`, `glow`, `spin`) only on diagrams where the motion is the point.
  Nothing loops on a content slide.
- Thumbnails, print and reduced motion render the final state automatically. Don't use JS timers
  for visibility.

**Build steps**

- Per-item reveals: `<Build at={n}>`; the deck counts a slide's steps from the Builds it contains.
- A block that changes state on each press (like `Code` stepping through highlights) calls
  `const step = useBuildStep(count)` from `@core`: 0 when the slide opens, `Infinity` in thumbnails
  and print.

**Numbers mode (M)**: if a block shows numbers with a natural growth version, read `useDisplay()`
from `@core` and accept the relative values as a prop, as `Stat` does.

**Media**: take `src` as a prop and let the deck import the file, so the build inlines it. Never
hard-code a URL; the build fails on remote URLs.

## Check it

For a library block: use it in a deck, then `npm run dev` and look at it in every theme and scheme
(`&theme=editorial`, `&theme=signal`, `&scheme=dark`) and on an inverted Frame; press G and P for
the final state; then `npm run check` and `npm run verify`.

## For an upstream pull request: add it to the showcase

A block in `src/blocks/` (upstream) also needs:

1. Export it from `src/blocks/index.ts` under the right heading.
2. Add a slide to `src/decks/showcase/index.tsx` with realistic, invented data and
   `{ id: "Funnel" }`, so it is easy to find in the overview.
3. Add it to the blocks table in the README.
4. Check it: `npm run dev`, open the showcase, and look at it in every theme and scheme
   (`&theme=editorial`, `&theme=signal`, `&scheme=dark`) and on an inverted Frame. Press G and P
   for the final state. Then `npm run check`, `npm run build` and `npm run verify`.
