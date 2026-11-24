// The dev server's front page: every deck, every theme, the blocks and the team library, found
// from the folders so it never goes stale. Only `npm run dev` loads this file; builds don't.
//   /                       the gallery
//   ?deck=<name>            a deck; add &theme=<name>&scheme=dark to preview it in another theme
//   ?library                every slide in src/library/slides, with its default props
import type { ReactNode } from "react";
import type { DeckDefinition } from "@core";
import libraryDeck, { libraryFiles } from "./library-view.tsx";
import * as blocks from "@blocks";
import { motion } from "virtual:library";
import { themes } from "virtual:themes";

const decks = import.meta.glob<{ default: DeckDefinition }>(["./decks/*/index.tsx", "!./decks/_*/index.tsx"]);
const examples = import.meta.glob<{ default: DeckDefinition }>("../examples/*/index.tsx");
const libraryBlocks = import.meta.glob("./library/blocks/*.tsx");

const deckNames = Object.keys(decks)
  .map((path) => path.split("/")[2])
  .filter((n) => n !== "showcase");
// The showcase lives in src/decks (it's the visual test) but is upstream's, so it's listed with the examples.
const exampleNames = ["showcase", ...Object.keys(examples).map((path) => path.split("/")[2])];
const fileName = (path: string) =>
  path
    .split("/")
    .pop()!
    .replace(/\.tsx$/, "");
const blockNames = Object.keys(blocks).filter((k) => /^[A-Z]/.test(k));

export async function devPick(params: URLSearchParams): Promise<{ deck: DeckDefinition; name: string } | null> {
  let deck: DeckDefinition;
  let name: string;
  if (params.has("library")) {
    name = "library";
    deck = libraryDeck;
  } else {
    name = params.get("deck") ?? "";
    const load = decks[`./decks/${name}/index.tsx`] ?? examples[`../examples/${name}/index.tsx`];
    if (!load) return null;
    deck = (await load()).default;
  }
  const theme = params.get("theme") ?? deck.theme;
  const scheme = (params.get("scheme") as DeckDefinition["scheme"]) ?? deck.scheme;
  return { deck: { ...deck, theme, scheme }, name };
}

function Section({ title, hint, children }: { title: string; hint: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-base text-ink-2">{hint}</p>
      <div className="mt-5 flex flex-wrap gap-3">{children}</div>
    </section>
  );
}

const pill = "rounded-xl bg-surface px-5 py-3 text-lg ring-1 ring-rule hover:ring-accent";

export function Gallery() {
  const slides = libraryDeck.slides;
  return (
    <main className="min-h-screen bg-canvas px-16 py-16 font-sans text-ink">
      <h1 className="text-5xl font-semibold tracking-tight">Slides</h1>
      <p className="mt-3 text-lg text-ink-2">
        Everything in this repo, found from its folders. New deck: <code className="font-mono">npm run new my-talk</code>.
      </p>
      <Section
        title="Decks"
        hint={
          <>
            Yours, in <code className="font-mono">src/decks/</code>
          </>
        }
      >
        {deckNames.map((n) => (
          <a key={n} href={`?deck=${n}`} className={pill}>
            {n}
          </a>
        ))}
      </Section>
      <Section
        title="Examples"
        hint={
          <>
            The showcase and upstream's example decks (<code className="font-mono">examples/</code>): read them, don't edit them
          </>
        }
      >
        {exampleNames.map((n) => (
          <a key={n} href={`?deck=${n}`} className={pill}>
            {n}
          </a>
        ))}
      </Section>
      <Section
        title={`Library slides (${slides.length})`}
        hint={
          <>
            Your team's reusable slides and slide sets, <code className="font-mono">src/library/slides/</code>
          </>
        }
      >
        <a href="?library" className={pill}>
          Open the library
        </a>
        {libraryFiles.map((f) => (
          <span key={f} className="rounded-xl px-5 py-3 font-mono text-base text-ink-2">
            {f}
          </span>
        ))}
      </Section>
      <Section
        title="Themes"
        hint={
          <>
            <code className="font-mono">src/themes/</code>: opens the showcase in each, light and dark
          </>
        }
      >
        {Object.keys(themes).map((t) => (
          <span key={t} className="flex gap-1">
            <a href={`?deck=showcase&theme=${t}`} className={pill}>
              {t}
            </a>
            <a href={`?deck=showcase&theme=${t}&scheme=dark`} className={pill}>
              dark
            </a>
          </span>
        ))}
      </Section>
      <Section
        title={`Blocks (${blockNames.length + Object.keys(libraryBlocks).length})`}
        hint={
          <>
            <code className="font-mono">@blocks</code> (src/blocks, every one in the showcase) and your own in{" "}
            <code className="font-mono">@library/blocks</code>
          </>
        }
      >
        <a href="?deck=showcase" className={pill}>
          Open the showcase
        </a>
        {[...blockNames, ...Object.keys(libraryBlocks).map((p) => `library/${fileName(p)}`)].map((b) => (
          <span key={b} className="rounded-lg px-3 py-2 font-mono text-sm text-ink-2">
            {b}
          </span>
        ))}
      </Section>
      <Section
        title={`Motion (${motion.effects.length + motion.transitions.length})`}
        hint={
          <>
            Your own entrance effects and slide transitions, <code className="font-mono">src/library/motion/</code>, used by name. Built in:
            effects <code className="font-mono">rise fade pop</code>, transitions <code className="font-mono">fade push zoom</code>
          </>
        }
      >
        {[...motion.effects.map((e) => `effect="${e}"`), ...motion.transitions.map((t) => `transition: "${t}"`)].map((m) => (
          <span key={m} className="rounded-lg px-3 py-2 font-mono text-sm text-ink-2">
            {m}
          </span>
        ))}
      </Section>
    </main>
  );
}
