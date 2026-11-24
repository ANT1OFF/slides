// The deck `npm run verify` presses keys on. It is not a deck of its own (it lives outside src/decks)
// so the showcase and the examples can change freely. Each slide has an id the checks look up.
import { useState } from "react";
import { slide, useDeckKey, useDeckNav } from "@core";
import type { DeckDefinition } from "@core";
import { Bullets, Code, EndSlide, Flow, Frame, Spectrum, Stat, TitleSlide, tokenize } from "@blocks";

/** A presenter extra as a team would write one: it reads the deck's position and adds two keys. */
function Extras() {
  const { index, step, count, slides, nav, goto } = useDeckNav();
  const [taken, setTaken] = useState(0);
  useDeckKey("x", "Fixture: jump to the third slide", () => goto(2));
  useDeckKey("j", "Fixture: one step on", () => nav(1));
  useDeckKey("k", "Fixture: jump to the first backup", () => {
    const backup = slides.find((s) => s.hidden);
    if (backup) {
      goto(backup.id);
    }
  });
  useDeckKey("u", "Fixture: jump to an unknown id", () => goto("missing-slide"));
  // B is a built-in key (blank the screen), which must win.
  useDeckKey("b", "Fixture: never runs", () => setTaken((n) => n + 1));
  return (
    <div id="extras" data-taken={taken} className="absolute top-2 left-2 font-mono text-xs">
      {`slide ${index + 1} of ${count}, step ${step}`}
    </div>
  );
}

const SHOUT = new Set(["select"]);

const deck: DeckDefinition = {
  title: "Verify",
  overlay: <Extras />,
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
      <Frame title="Code with a tokenizer of one's own">
        <div id="own-tokens">
          <Code tokenize={(line) => [<span className="tok-kw">{line.toUpperCase()}</span>]}>shout</Code>
        </div>
        <div id="own-keywords">
          <Code tokenize={(line) => tokenize(line, SHOUT)}>select const</Code>
        </div>
      </Frame>,
      { id: "Tokenize" },
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
    ...[0, 3].map((build) =>
      slide(
        <Frame title="A spectrum with a build offset">
          <Spectrum
            build={build}
            left="Manual"
            right="Automatic"
            tiers={[
              { name: "A", rule: "First tier" },
              { name: "B", rule: "Second tier" },
            ]}
            floor="Both tiers"
          />
        </Frame>,
        { id: `Spectrum-${build}` },
      ),
    ),
    slide(<Frame title="Before the hidden slide" />, { id: "before-hidden" }),
    slide(<Frame title="Hidden" />, { id: "hidden", hidden: true }),
    slide(<EndSlide />, { id: "EndSlide" }),
  ],
};

export default deck;
