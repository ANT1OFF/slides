// The deck `npm run verify` presses keys on. It is not a deck of its own (it lives outside src/decks)
// so the showcase and the examples can change freely. Each slide has an id the checks look up.
import { slide, type DeckDefinition } from "@core";
import { Bullets, Code, EndSlide, Flow, Frame, Stat, TitleSlide } from "@blocks";

const deck: DeckDefinition = {
  title: "Verify",
  slides: [
    slide(<TitleSlide title="Verify" subtitle="Fixture for npm run verify" />, { id: "TitleSlide", notes: "Notes are plain strings." }),
    slide(<Frame title="A plain slide" />, { id: "plain" }),
    slide(<Frame title="Plain again" />, { id: "plain-2" }),
    slide(
      <Frame title="Three builds">
        <Bullets build items={["One", "Two", "Three"]} />
      </Frame>,
      { id: "Bullets" },
    ),
    slide(<Frame title="After the builds" />, { id: "after" }),
    slide(
      <Frame title="Code">
        <Code highlight="1|2|1-2|all">{`
          const a = 1;
          const b = 2;
        `}</Code>
      </Frame>,
      { id: "Code" },
    ),
    slide(
      <Frame title="A number">
        <Stat to={11} suffix=" min" label="raw" relative={{ to: 81, suffix: "%", label: "growth" }} />
      </Frame>,
      { id: "Stat" },
    ),
    slide(
      <Frame title="A diagram">
        <Flow nodes={[{ title: "A" }, { title: "B" }, { title: "C" }]} />
      </Frame>,
      { id: "Flow" },
    ),
    slide(<Frame title="Before the hidden slide" />, { id: "before-hidden" }),
    slide(<Frame title="Hidden" />, { id: "hidden", hidden: true }),
    slide(<EndSlide />, { id: "EndSlide" }),
  ],
};

export default deck;
