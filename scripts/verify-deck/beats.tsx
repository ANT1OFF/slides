// The deck `npm run verify` checks beat timelines on: a step that is a timeline (picture, then a
// headline one --beat-gap later, the old headline leaving), SplitText, and Ambient.
import { Ambient, Beat, Build, SplitText, slide } from "@core";
import type { DeckDefinition } from "@core";
import { Frame, TitleSlide } from "@blocks";

const deck: DeckDefinition = {
  title: "Verify beats",
  // Long, so the checks can look at a timeline while it plays.
  vars: { "--beat-gap": "2s", "--beat-leave": "1200ms" },
  slides: [
    slide(<TitleSlide title="Verify beats" />, { id: "one" }),
    slide(
      <Frame title="A step is a timeline">
        <div className="grid">
          <Build at={1} until={2} className="col-start-1 row-start-1">
            <p id="old" className="type-lead">
              The old headline
            </p>
          </Build>
          <Build at={2} className="col-start-1 row-start-1">
            <Beat at={0} effect="fade">
              <div id="picture" className="h-40 w-80 bg-accent" />
            </Beat>
            <Beat>
              <p id="headline" className="type-lead mt-8">
                The headline lands later
              </p>
            </Beat>
          </Build>
        </div>
        <Build at={3}>
          <p id="after" className="type-body mt-8">
            A third step
          </p>
        </Build>
      </Frame>,
      { id: "timeline" },
    ),
    slide(
      <Frame title="Split text">
        <SplitText as="h2" effect="mask" at={0.5} className="type-title" style={{ "--stagger": "200ms" }}>
          Words rise from a clip
        </SplitText>
        <p id="letters" className="type-lead mt-8">
          <SplitText effect="type">Typed out</SplitText>
        </p>
      </Frame>,
      { id: "split" },
    ),
    slide(
      <Frame title="Ambient">
        <Ambient effect="drift" className="h-80 w-[600px]">
          <div id="drift" className="h-full w-full bg-accent" />
        </Ambient>
        <Ambient effect="parallax" className="mt-8 h-40 w-[600px]">
          <div id="parallax" className="h-full w-full bg-accent-2" />
        </Ambient>
      </Frame>,
      { id: "ambient" },
    ),
  ],
};

export default deck;
