// The deck `npm run verify` checks its overflow check on: some slides fit, three don't, in the three
// ways a slide can be too tall. It must report exactly those three, by id and slide number.
import { slide } from "@core";
import type { DeckDefinition } from "@core";
import { Footer, Frame, FrameBody, Slide, SlideHeader } from "@blocks";

/** Too much for one slide: a block taller than any body. */
const Tall = ({ height }: { height: number }) => <div className="shrink-0 bg-accent" style={{ height }} />;

// A `theme` field in the deck's own data: the build must not read it as the deck's theme.
const topics = [{ theme: "Not a theme folder", height: 200 }];

const deck: DeckDefinition = {
  title: "Verify overflow",
  slides: [
    // 1 fits.
    <Frame title="Fits">
      <Tall height={topics[0].height} />
      <p className="type-small normal-small">Small text</p>
    </Frame>,
    // 2 is an inline Frame with no id: reported by its generated id and its number.
    <Frame title="Too tall for its body">
      <Tall height={760} />
    </Frame>,
    // 3 is a layout of one's own: its FrameBody is checked like a Frame's.
    slide(
      <Slide>
        <SlideHeader kicker="A layout" />
        <FrameBody>
          <Tall height={900} />
        </FrameBody>
        <Footer />
      </Slide>,
      { id: "layout-too-tall" },
    ),
    // 4 has no FrameBody at all, but is taller than the stage.
    slide(
      <Slide>
        <Tall height={1200} />
      </Slide>,
      { id: "slide-too-tall" },
    ),
    // 5 fits, in compact density.
    <Frame title="Fits, compact" density="compact">
      <Tall height={200} />
      <p className="type-small compact-small">Small text, a notch smaller</p>
      <p className="compact-plain">Plain text, at the small size</p>
    </Frame>,
  ],
};

export default deck;
