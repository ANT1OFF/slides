// npm run new <name>  →  creates src/decks/<name>/index.tsx from a short starter deck.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";

const name = process.argv[2];
if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error("Usage: npm run new <name>   (lowercase letters, digits and dashes, e.g. my-talk)");
  process.exit(1);
}

const dir = `src/decks/${name}`;
if (existsSync(dir)) {
  console.error(`${dir} already exists`);
  process.exit(1);
}

const title = name.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

mkdirSync(dir, { recursive: true });
writeFileSync(
  `${dir}/index.tsx`,
  `import { slide, type DeckDefinition } from "@core";
import { Bullets, EndSlide, Frame, SectionSlide, StatementSlide, TitleSlide } from "@blocks";

// A deck is a title and a list of slides. Each slide is JSX; wrap it in slide() to add notes.
// Every block is in src/blocks; see them all with: npm run dev, then open the showcase deck.
const deck: DeckDefinition = {
  title: "${title}",
  // theme: "editorial",   ← a folder in src/themes; scheme: "dark" for its dark colours
  slides: [
    slide(<TitleSlide kicker="Kicker" title="${title}" subtitle="A one-line promise for the talk." byline="Your name · Event" date="Date" />, {
      notes: "Speaker notes show in the presenter window: press N.",
    }),
    <SectionSlide number={1} of={2} title="The first part" />,
    <Frame section="The first part" title="A title that states the point">
      <Bullets build items={["Each item appears on the next press of →", "Use any block from @blocks", "Or plain JSX with Tailwind classes"]} />
    </Frame>,
    <StatementSlide>
      One idea per slide. <em>Make it big.</em>
    </StatementSlide>,
    <EndSlide subtitle="Questions?" />,
  ],
};

export default deck;
`,
);
// Format it like the rest of the repo, so `npm run check` passes on a fresh deck.
const file = `${dir}/index.tsx`;
writeFileSync(file, await format(readFileSync(file, "utf8"), { ...(await resolveConfig(file)), filepath: file }));

console.log(`Created ${file}

  npm run dev               then open http://localhost:5173/?deck=${name}
  npm run build ${name}     writes dist/${name}.html`);
