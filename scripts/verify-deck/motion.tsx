// The deck `npm run verify` checks motion on, built with scripts/verify-deck/library as the team
// library: its effect, its transition and its styles.css must be picked up by name.
import { Build, Reveal, slide } from "@core";
import type { DeckDefinition } from "@core";
import { Frame, TitleSlide } from "@blocks";
import { motion } from "virtual:library";

const deck: DeckDefinition = {
  title: "Verify motion",
  transition: "verify-wipe",
  // Long, so the checks can look at a transition while it runs; also proves a deck's tokens reach it.
  vars: { "--duration-base": "1500ms" },
  slides: [
    slide(
      <TitleSlide title="Verify motion" subtitle={`effects: ${motion.effects.join(" ")} · transitions: ${motion.transitions.join(" ")}`} />,
      {
        id: "one",
      },
    ),
    slide(
      <Frame title="A team effect, by name">
        <Reveal effect="verify-swoop" delay={100} className="type-lead">
          <span id="revealed">Swoops in</span>
        </Reveal>
        <Build at={1} effect="verify-swoop" className="type-lead mt-8">
          <span id="built">Built with the same effect</span>
        </Build>
        <span id="badge" className="verify-badge mt-8 self-start">
          team utility
        </span>
        <span id="token" className="mt-8 self-start bg-verify-brand p-4" style={{ viewTransitionName: "hero" }}>
          team token
        </span>
      </Frame>,
      { id: "two" },
    ),
    slide(
      <Frame title="Fades in instead">
        <span className="self-end bg-verify-brand p-12" style={{ viewTransitionName: "hero" }}>
          the same element, moved
        </span>
      </Frame>,
      { id: "three", transition: "fade" },
    ),
    slide(<Frame title="No transition" />, { id: "four", transition: "none" }),
    slide(<Frame title="The deck's transition again" />, { id: "five" }),
  ],
};

export default deck;
