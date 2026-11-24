// The dev server's front page: every deck, every theme, the blocks and the team library, found
// from the folders so it never goes stale. Only `npm run dev` loads this file; builds don't.
//   /                       the gallery
//   ?deck=<name>            a deck; add &theme=<name>&scheme=dark to preview it in another theme
//   ?library                the team library as a deck: its slides, block examples and motion
import type { ReactNode } from "react";
import type { DeckDefinition, SlideEntry } from "@core";
import libraryDeck, { library } from "./library-view.tsx";
import * as blocks from "@blocks";
import { themes } from "virtual:themes";
import { Stage } from "./core/Stage.tsx";
import { DeckContext } from "./core/theme.ts";
import settings from "@library/settings.json";

const decks = import.meta.glob<{ default: DeckDefinition }>(["./decks/*/index.tsx", "!./decks/_*/index.tsx"]);
const examples = import.meta.glob<{ default: DeckDefinition }>("../examples/*/index.tsx");

const deckNames = Object.keys(decks)
  .map((path) => path.split("/")[2])
  .filter((n) => n !== "showcase");
// The showcase lives in src/decks (it's the visual test) but is upstream's, so it's listed with the examples.
const exampleNames = ["showcase", ...Object.keys(examples).map((path) => path.split("/")[2])];

export async function devPick(params: URLSearchParams): Promise<{ deck: DeckDefinition; name: string } | null> {
  let deck: DeckDefinition;
  let name: string;
  if (params.has("library")) {
    name = "library";
    deck = libraryDeck;
  } else {
    name = params.get("deck") ?? "";
    const load = decks[`./decks/${name}/index.tsx`] ?? examples[`../examples/${name}/index.tsx`];
    if (!load) {
      return null;
    }
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
const name = "rounded-lg px-3 py-2 font-mono text-sm text-ink-2";

/** Library slides drawn small, in their final state; each opens that slide in the library view. */
function Previews({ entries, from }: { entries: SlideEntry[]; from: number }) {
  return (
    <DeckContext.Provider value={{ title: "Library", theme: settings.defaultTheme, scheme: "light", footer: "src/library" }}>
      {entries.map((entry, i) => (
        <a key={entry.id} href={`?library#${from + i + 1}`} data-preview={entry.id} className="group w-96">
          <div className="overflow-hidden rounded-xl ring-1 ring-rule group-hover:ring-accent">
            <Stage scale={0.2} still>
              {entry.content}
            </Stage>
          </div>
          <div className="mt-2 truncate font-mono text-sm text-ink-2">{entry.id}</div>
        </a>
      ))}
    </DeckContext.Provider>
  );
}

export function Gallery() {
  const builtIn = Object.keys(blocks).filter((k) => /^[A-Z]/.test(k));
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
        title={`Library slides (${library.slides.length})`}
        hint={
          <>
            Your team's reusable slides and slide sets, <code className="font-mono">src/library/slides/</code>, with their default props
          </>
        }
      >
        <a href="?library" className={`${pill} self-start`}>
          Open the library
        </a>
        <div className="flex basis-full flex-wrap gap-5">
          <Previews entries={library.slides} from={0} />
        </div>
      </Section>
      <Section
        title={`Library blocks (${library.blocks.length + library.blocksWithoutExample.length})`}
        hint={
          <>
            Your own blocks and layouts, <code className="font-mono">src/library/blocks/</code>: each file's{" "}
            <code className="font-mono">example</code> export
          </>
        }
      >
        <div className="flex basis-full flex-wrap gap-5">
          <Previews entries={library.blocks} from={library.slides.length} />
        </div>
        {library.blocksWithoutExample.map((f) => (
          <span key={f} className={name}>
            {f}: no <code>example</code> export, so no preview
          </span>
        ))}
      </Section>
      <Section
        title={`Library motion (${library.motion.length})`}
        hint={
          <>
            Your own entrance effects and slide transitions, <code className="font-mono">src/library/motion/</code>, used by name. Open one
            to see it play. Built in: effects <code className="font-mono">rise fade pop</code>, transitions{" "}
            <code className="font-mono">fade push zoom</code>
          </>
        }
      >
        <div className="flex basis-full flex-wrap gap-5">
          <Previews entries={library.motion} from={library.slides.length + library.blocks.length} />
        </div>
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
        title={`Built-in blocks (${builtIn.length})`}
        hint={
          <>
            <code className="font-mono">@blocks</code> (src/blocks): every one is in the showcase
          </>
        }
      >
        <a href="?deck=showcase" className={pill}>
          Open the showcase
        </a>
        {builtIn.map((b) => (
          <span key={b} className={name}>
            {b}
          </span>
        ))}
      </Section>
    </main>
  );
}
