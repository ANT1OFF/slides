// The deck `npm run verify` checks the WebGL backdrop on: one filling a slide, two sharing a slide
// (and the deck's one GL context) with a step of their own, and a plain slide to come from and go to.
import { slide } from "@core";
import type { DeckDefinition } from "@core";
import { Frame, TitleSlide } from "@blocks";
import { Backdrop } from "@blocks/backdrop";

const deck: DeckDefinition = {
  title: "Verify backdrop",
  transition: "fade",
  slides: [
    slide(
      <Backdrop preset="aurora" scrim="left">
        <TitleSlide title="Verify backdrop" />
      </Backdrop>,
      { id: "full" },
    ),
    slide(
      <Frame title="Two on a slide">
        <div className="grid h-full grid-cols-2 gap-8">
          <Backdrop preset="dots" steps={1} />
          <Backdrop preset="depth" steps={1} inverted />
        </div>
      </Frame>,
      { id: "pair" },
    ),
    slide(<Frame title="No backdrop here" />, { id: "plain" }),
  ],
};

export default deck;
