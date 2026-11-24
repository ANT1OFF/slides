// The deck `npm run new <name>` starts from: it copies this folder and puts the new deck's title
// in place of "New deck". The folder is yours: make it open with your team's slides, theme and
// transition, and every new deck starts that way. (A folder starting with _ is not a deck itself.)
import { slide, type DeckDefinition } from "@core";
import { Bullets, EndSlide, Frame, SectionSlide, StatementSlide, TitleSlide } from "@blocks";

// A deck is a title and a list of slides. Each slide is JSX; wrap it in slide() to add notes.
// Every block is in src/blocks; see them all with: npm run dev, then open the showcase deck.
const deck: DeckDefinition = {
  title: "New deck",
  // theme: "editorial",   ← a folder in src/themes; scheme: "dark" for its dark colours
  // transition: "fade",   ← between slides: fade, push, zoom, or one from src/library/motion
  slides: [
    slide(
      <TitleSlide kicker="Kicker" title="New deck" subtitle="A one-line promise for the talk." byline="Your name · Event" date="Date" />,
      {
        notes: "Speaker notes show in the presenter window: press N.",
      },
    ),
    <SectionSlide number={1} of={2} title="The first part" />,
    <Frame section="The first part" title="A title that states the point">
      <Bullets
        build
        items={["Each item appears on the next press of →", "Use any block from @blocks", "Or plain JSX with Tailwind classes"]}
      />
    </Frame>,
    <StatementSlide>
      One idea per slide. <em>Make it big.</em>
    </StatementSlide>,
    <EndSlide subtitle="Questions?" />,
  ],
};

export default deck;
