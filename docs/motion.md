# Transitions, Morph, timed steps and backdrops

How one slide becomes the next, and how a press of → can be a short timeline. A deck needs none of
this: with no `transition`, no `Morph`, no `Backdrop` and plain `Build`s, each slide simply appears with a small
rise and each step fades in, and that is a good default. Add motion when it says something about
how two slides, or two moments on one slide, relate.

For entrance effects inside a slide (`<Reveal>`, `<Build effect>`) and for writing your own motion
files, see [extending.md](extending.md#motion).

## Transitions

Name one on the deck, and another on single slides:

```tsx
const deck: DeckDefinition = {
  title: "Q3 review",
  transition: "fade", // every slide; leave out for none
  slides: [
    slide(<SectionSlide title="What changed" />, { transition: "push" }), // this slide arrives differently
    slide(<Frame title="One number" />, { transition: "wipe up" }), // with a direction
    slide(<Frame title="No motion here" />, { transition: "none" }),
  ],
};
```

A slide's `transition` is how that slide **arrives**. Going back plays the same one in reverse, a
fifth shorter.

| Name    | What you see                                                         | Use it for                                          |
| ------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| `fade`  | A cross-fade                                                         | The deck's default. It never competes with content  |
| `push`  | The new slide slides in from the right as the old one leaves         | Section dividers: "next chapter"                    |
| `zoom`  | The new slide grows in as the old one grows out and fades            | Stepping into a detail, or a quote                  |
| `blur`  | Through soft focus: the old slide blurs away, the new one sharpens   | A change of subject, or of time                     |
| `iris`  | A circle opens from a point (the centre, or [a point](#iris-origin)) | Opening up one thing the last slide pointed at      |
| `wipe`  | A soft edge sweeps across                                            | Before and after; a plain "and then"                |
| `shove` | The new slide pushes the old one out, which gives way                | A sequence that moves in one direction              |
| `flip`  | The slide turns over like a card                                     | The other side: the counter-argument, the answer    |
| `split` | The slide parts from the middle                                      | A reveal                                            |
| `none`  | The slide just changes                                               | One slide in a deck that otherwise has a transition |

**Directions.** `wipe`, `shove`, `flip` and `split` take the way they move after a space: `left`
(the default), `right`, `up` or `down`. `"wipe up"` sweeps upwards, `"shove right"` pushes to the
right, `"split up"` parts up and down instead of sideways. Your editor completes the names.

**Timing** comes from the theme: `--duration-base` and `--ease-in-out`. Make a deck calmer with
`vars: { "--duration-base": "900ms" }`.

### Iris origin

`iris` opens from the centre unless the slide before has a point for it. Mark any element on that
slide with `data-origin`, and the circle opens out of its middle; going back, it closes into it.

```tsx
<Frame title="Three bets for Q4">
  <div data-origin>Self-serve billing</div>
</Frame>,
slide(<Frame title="Self-serve billing, in detail" />, { transition: "iris" }),
```

With several `data-origin` elements on a slide, the one that was clicked to move on is used, else
the first. A `<Morph origin>` is a point too, and without any marked element the iris opens from the
first Morph the two slides share.

## Morph: one element, two slides

Wrap the same thing on two neighbouring slides in a `Morph` with the same `id`. When the slide
changes, that element moves and resizes from where it was to where it is now, while the rest of the
slide plays its transition. Going back sends it back.

```tsx
import { Morph } from "@core";

<Frame title="The quarter in three numbers">
  <Morph id="first-reply" className="bg-surface p-(--pad-box)">
    <p className="type-stat">2.1h</p>
  </Morph>
</Frame>,
<Frame title="First reply time fell every week">
  <Morph id="first-reply" className="bg-surface p-20">
    <p className="type-stat text-[240px]">2.1h</p>
  </Morph>
</Frame>,
```

`Morph` is a plain wrapper (`as`, `className`, `style`), a `div` unless you say otherwise. Inside
running text, make it `as="span"` with `className="inline-block"`.

Rules, and what happens at the edges:

| Case                                       | What happens                                                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| The id is on both slides                   | It flies. Its box moves and resizes; the two pictures cross-fade, cropped from the top left, never squashed       |
| The id is on one slide only                | Nothing special: it stays part of its slide and follows the slide's transition                                    |
| The id is twice on one slide               | Neither morphs, the transition still runs, and the console reports it. `npm run verify` fails on it               |
| The deck has no `transition`               | The pair still flies, and the rest of the slide fades. `transition: "none"` on the arriving slide switches it off |
| An entrance or `CountUp` inside what lands | It shows its final state; it does not play again                                                                  |
| Jumping (overview, a number then Enter)    | The same: it flies when both slides have the id                                                                   |
| Print, overview, presenter window          | Each slide as it stands. A Morph has a view-transition-name only on the live stage, only while a transition runs  |
| Reduced motion, or no View Transitions API | The slide just changes                                                                                            |

Morph works best when the two versions look alike: the same background, the same words, a different
size or place. Two unrelated things with one id only cross-fade while moving.

## Timed steps: Beat, SplitText and Ambient

A `Build` step normally shows its content at once. Put `<Beat>`s inside it and the step becomes a
short timeline in seconds: the picture moves first, the headline lands a moment later, and the old
headline, a `<Build until>`, leaves within the first half second.

```tsx
import { Beat, Build } from "@core";

<Build at={1} until={2}>
  <h2>Six days to close</h2> {/* on step 1; leaves when step 2 arrives */}
</Build>
<Build at={2}>
  <Beat at={0} effect="fade"><Chart /></Beat> {/* the picture, at once */}
  <Beat><h2>One day after the change</h2></Beat> {/* one --beat-gap later */}
  <Beat at={3} effect="fade"><p>The caveat, last</p></Beat> {/* 3 s in */}
</Build>
```

| Piece                   | What it does                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `<Beat at={s} effect>`  | Plays an entrance effect `s` seconds into its step. Without `at`, one `--beat-gap` in (1.5 s by default)                     |
| `<Build until={n}>`     | Leaves on step `n`, fading and lifting away over `--beat-leave` (500 ms). Stack two in one grid cell to swap headlines       |
| `<SplitText effect at>` | A line arriving a word (or a letter) at a time: `mask` rises out of a clip, `blur` sharpens, `type` types, `scale` grows     |
| `<Ambient effect>`      | Slow motion under a hold, for a photo or a background: `drift`, `creep` (a slow zoom) or `parallax` (leans from the pointer) |

A `Beat` outside any `Build` belongs to the slide's entrance: it plays when the slide is arrived at
with →. Pieces of a `SplitText` follow one another by `--stagger` (a third of it per letter), and
screen readers hear the whole line once. The pieces stay real text, so it can be selected, searched
and printed.

**Only a step forward plays.** Going back, jumping (a number, the overview, the URL), reloading,
print, the overview, the presenter window and reduced motion all show the step settled, exactly as
it ends. A press of → during a timeline settles it at once and moves on, so an impatient presenter
never waits. `Ambient` is off by default, and off in reduced motion, print and the overview.

**Pacing** comes from the theme: `--beat-gap` (picture to headline) and `--beat-leave` (how fast a
line leaves), with `--stagger` for SplitText. A calmer deck: `vars: { "--beat-gap": "2.5s" }`.

### For a simple deck

Use none of it. Plain `Build` steps, one idea per press, read well and print well. If you want one
touch, make the payoff of one slide a `Beat`: the chart arrives on the press, the sentence that
says what it means lands a beat after (the "Why now" slide of the example pitch does this).

### Going further

- **Picture first, words second.** In a timed step, start the thing that changes at `at={0}` and
  let the headline land 1 to 3 seconds later; the audience looks, then reads.
- **Two to four beats a step, a few timed steps a deck.** A timeline on every press is a film,
  and the presenter is waiting for it.
- **The old line leaves quickly.** Give a replaced headline `until`; the default half second clears
  the stage before the new one lands.
- **SplitText for one line a slide,** a title or a statement. Body text should simply be there.
- **Ambient only behind a hold:** a title photo, a section divider, the slide you talk over longest.
  Never on text people read, never on charts.

## Backdrop: a drawn picture behind a slide

`Backdrop` draws a slow, generated picture in the theme's colours, with a few kilobytes of WebGL
and no image file. It is opt-in and has its own import, so a deck that doesn't use it carries none
of it.

```tsx
import { Backdrop } from "@blocks/backdrop";

slide(
  <Backdrop preset="depth" scrim="left" inverted>
    <StatementSlide kicker="Why now">The window is open for one more quarter</StatementSlide>
  </Backdrop>,
),
```

Wrap a whole slide in it, or give it a size (`className="h-80 rounded-box"`) for a panel. Inside a
Backdrop `bg-canvas` is see-through, so `TitleSlide`, `StatementSlide`, `SectionSlide` and `Frame`
sit straight on the picture. For a dark picture in a light deck put `inverted` on the Backdrop, not
on the slide inside it.

| Preset   | What it draws                                            | Use it for                              |
| -------- | -------------------------------------------------------- | --------------------------------------- |
| `aurora` | Soft pools of the accent colours, drifting               | A title, a closing slide                |
| `grain`  | A quiet two-colour wash with film grain                  | Behind a statement or a quote           |
| `dots`   | A halftone field whose dots swell and shrink in a wave   | A section divider, a panel beside text  |
| `depth`  | Layered ridges that slide past each other at their paces | A title or a statement, with `inverted` |

| Prop        | What it does                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `scrim`     | `left`, `right`, `top`, `bottom` or `full`: washes that side with the canvas colour, under the text    |
| `intensity` | 0 to 1: how much colour the picture has. `0.5` is a good "behind body text"                            |
| `colors`    | One to three colour tokens instead of the three accents: `["accent"]` for one hue, `["ink"]` for greys |
| `seed`      | Another number, another arrangement of the same picture                                                |
| `steps`     | Gives the slide that many build steps: each press of → shifts the picture a little                     |
| `time`      | Holds the picture at that second: a still, generated image                                             |
| `inverted`  | Draws on the theme's other scheme                                                                      |

**It is a pure function of time.** There is no simulation and no randomness, so the same second
always draws the same frame. Print and `npm run pdf`, the overview, the presenter window's "next"
slide and reduced motion all draw the frame at second 0 once and leave it. Add `?backdrop-time=12`
to the deck's URL to hold every backdrop at one second, for a screenshot. Without WebGL, or if the
browser refuses the shader, a CSS gradient from the same tokens stands in, and a lost GL context
keeps the last frame.

**What it costs.** About 8 KB in the deck's file. One GL context for the whole deck, however many
backdrops it has; frames are capped at about 2 megapixels and 30 a second, and nothing is drawn
for a slide that is not on screen. The shader is compiled when the deck opens, not when the first
backdrop slide does.

### When to use it, and when not

- **On the slides people look at, not the ones they read:** the title, a section divider, one
  statement, the closing slide. Two or three in a deck. On every slide it is wallpaper.
- **Not behind a chart, a table, code or a paragraph.** Data needs a flat ground, and blocks that
  cut shapes out with the canvas colour (pie gaps, timeline nodes) show the picture through them.
  If text must sit on it, use `scrim`, or `grain` at `intensity={0.5}`.
- **Not where a photo would say more.** A backdrop is mood; it is never the evidence.
- **One preset a deck.** It is a motif, like the deck's one transition.
- **A plain deck needs none of it.** A flat canvas is the default for a reason.

### Accessibility

- **Contrast.** The scrim puts back most of the canvas colour under the text, so the theme's
  contrast holds there. Without one, check the lightest and the darkest place the text crosses: body
  text needs 4.5:1, large titles 3:1. `aurora` and `dots` at full intensity are for large type only.
- **Motion.** The picture moves slowly (a pool crosses the slide in about a minute) and never
  flashes. With "reduce motion" set in the system it does not move at all.
- **Screen readers** skip it: the canvas is decoration, and the slide's text is ordinary HTML on top.
- **Print and PDF** show the still frame, so a handout matches the slide.

## When to keep it plain

- **Most decks: `fade`, or nothing.** A reader's attention goes to whatever moves. If the content is
  the point, let it be the only thing that changes.
- **One transition for the deck, a second for its section slides at most.** A different one on every
  slide reads as a demo of transitions; the showcase does it once so that you don't have to.
- **A transition should mean something.** `push` for "next chapter", `iris` for "into this one
  thing", `flip` for "the other side". If you can't say what it means, use the deck's default.
- **One Morph per idea.** Carry the single thing the next slide is about: the number that becomes
  the headline, the card that becomes the topic. Three things flying at once is a tangle.
- **A timed step must make sense settled.** Back, print and the overview never replay it.
- **A Backdrop on two or three slides,** the ones people look at. See [when to use it](#when-to-use-it-and-when-not).
- **Ask what the PDF shows.** Print and the overview show each slide as it stands, so no slide may
  depend on the motion to make sense.

## Tuning and overriding

While a transition runs, `<html>` carries `data-transition="<name>"` (and `data-transition-back`
going back), so one rule restyles one transition:

```css
html[data-transition="iris"]::view-transition-new(slide) {
  animation-duration: 1.2s;
}
```

A Morph's group is `::view-transition-group(morph-<id>)`, and all of them match
`::view-transition-group(.morph)`.

A file in `src/library/motion/` with the name of a built-in transition replaces it. The starter
library has a `wipe.css` as its example of writing one; delete it to get the built-in `wipe` with
its soft edge and directions. Writing your own, with the direction and origin variables the built-in
ones read, is in [extending.md](extending.md#motion).
