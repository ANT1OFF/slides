// The deck `npm run verify` checks the WebGL backdrop on: one filling a slide, two sharing a slide
// (and the deck's one GL context) with a step of their own, a plain slide to come from and go to,
// and a slide with a Crowd and a picture from a shader of the deck's own.
import { slide } from "@core";
import type { DeckDefinition } from "@core";
import { Frame, TitleSlide } from "@blocks";
import { Backdrop, Crowd } from "@blocks/backdrop";

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
    slide(
      <Frame title="A crowd, and a shader of the deck's own">
        <div className="grid h-full grid-cols-2 gap-8">
          <Crowd count={900} highlight={90} build />
          <Backdrop
            shader="c=mix(c,C[2],a*(.5+.5*sin(s.x*V.x+U.x)));"
            values={[9, 0, 0, 0]}
            fallback="var(--color-accent)"
            label="Stripes"
          />
        </div>
      </Frame>,
      { id: "own" },
    ),
  ],
};

export default deck;
