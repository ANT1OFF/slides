// The deck `npm run verify` checks Morph and the built-in transitions on. Slides "a" to "dupe" share
// Morphs in every way one can (both slides, one slide only, twice on a slide); then one slide arrives
// with each built-in transition, and its id is the transition's name with dashes.
import { Morph, slide } from "@core";
import type { DeckDefinition, Transition } from "@core";
import { Frame, StatementSlide } from "@blocks";

/** Every built-in transition this deck adds a slide for, in order. */
export const TRANSITIONS: Array<Transition> = [
  "iris",
  "wipe",
  "wipe up",
  "shove",
  "shove right",
  "blur",
  "flip",
  "flip down",
  "split",
  "split down",
  "iris",
];

const deck: DeckDefinition = {
  title: "Verify morph",
  // Long, so the checks can look at a transition while it runs.
  vars: { "--duration-base": "1500ms" },
  slides: [
    slide(
      <Frame title="A small box, and one that is only here">
        <Morph id="hero" className="self-start bg-accent p-6 text-canvas">
          hero
        </Morph>
        <Morph id="only-a" className="mt-8 self-start bg-surface p-6">
          only on this slide
        </Morph>
      </Frame>,
      { id: "a" },
    ),
    // No transition named: the pair still flies, and the rest of the slide fades.
    slide(
      <Frame title="The same box, large, on the other side">
        <Morph id="only-b" className="self-start bg-surface p-6">
          only on this slide
        </Morph>
        <Morph id="hero" className="mt-8 grid h-96 w-[900px] place-items-center self-end bg-accent text-canvas">
          hero
        </Morph>
      </Frame>,
      { id: "b" },
    ),
    slide(
      <Frame title="It moves while the slide pushes" inverted>
        <Morph id="hero" className="mt-40 w-96 self-center bg-accent p-10 text-canvas">
          hero
        </Morph>
      </Frame>,
      { id: "c", transition: "push" },
    ),
    slide(
      <Frame title="The same id twice: neither morphs">
        <Morph id="hero" className="self-start bg-accent p-6 text-canvas">
          hero
        </Morph>
        <Morph id="hero" className="mt-8 self-start bg-accent p-6 text-canvas">
          hero again
        </Morph>
        <span id="origin" data-origin="" className="mt-8 self-end bg-surface p-6">
          the next slide opens from here
        </span>
      </Frame>,
      { id: "dupe", transition: "fade" },
    ),
    ...TRANSITIONS.map((transition, i) =>
      slide(
        <StatementSlide kicker={`transition: "${transition}"`} inverted={i % 2 === 0}>
          Arrives with <em>{transition}</em>
        </StatementSlide>,
        { id: `${transition.replace(" ", "-")}-${i}`, transition },
      ),
    ),
  ],
};

export default deck;
