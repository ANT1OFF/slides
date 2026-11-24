// The team library as one deck: the dev gallery's "Open the library", and the deck `npm run verify`
// builds to check that everything in the library renders. Found from the folders, by convention:
//   src/library/slides/*.tsx   every exported component (Capitalised name) is one slide with its
//                              default props; every exported function ending in "Slides" is a set
//   src/library/blocks/*.tsx   a file's `example` export: an element, shown inside a Frame, or a
//                              slide() for a block that fills the slide itself (a layout)
//   src/library/motion/*.css   one slide per entrance effect and per slide transition
import { Component, isValidElement } from "react";
import type { ReactNode } from "react";
import { Build, Reveal, slide } from "@core";
import type { DeckDefinition, SlideEntry, SlideInput } from "@core";
import { Frame, Lead } from "@blocks";
import { motion } from "virtual:library";

// oxlint-disable-next-line quality/no-unsafe-dictionary-type -- a slide file exports whatever the team wrote; each export is checked below
const slideFiles = import.meta.glob<Record<string, unknown>>("@library/slides/*.tsx", { eager: true });
const blockFiles = import.meta.glob<{ example?: SlideInput }>("@library/blocks/*.tsx", { eager: true });

const fileOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const isEntry = (s: SlideInput): s is SlideEntry => typeof s === "object" && s !== null && !isValidElement(s) && "content" in s;
// By the library's convention, a capitalised export is a component and an export ending in
// "Slides" returns slides. Only that it's a function is checked: Guard and the try below catch the rest.
const isComponent = (value: unknown): value is () => ReactNode => typeof value === "function";
const isSlideSet = (value: unknown): value is () => Array<SlideInput> => typeof value === "function";

function librarySlides(): Array<SlideEntry> {
  const out: Array<SlideEntry> = [];
  for (const [path, mod] of Object.entries(slideFiles)) {
    const file = fileOf(path);
    for (const [name, value] of Object.entries(mod)) {
      if (/^[A-Z]/u.test(name) && isComponent(value)) {
        const LibrarySlide = value;
        out.push(
          slide(
            <Guard name={`${file}: <${name} />`} hint={SLIDE_HINT}>
              <LibrarySlide />
            </Guard>,
            { id: `${file}/${name}`, notes: `src/library/slides/${file}: <${name} />` },
          ),
        );
      } else if (name.endsWith("Slides") && isSlideSet(value)) {
        // A set may return plain JSX or slide() entries; keep an entry's own notes and options.
        let set: Array<SlideInput>;
        try {
          set = value();
        } catch (error) {
          set = [<Broken name={`${file}: ${name}()`} hint={SLIDE_HINT} error={error} />];
        }
        set.forEach((s, i) => {
          const entry = isEntry(s) ? s : slide(s);
          out.push({ ...entry, id: `${file}/${name}[${i}]`, notes: entry.notes ?? `src/library/slides/${file}: ...${name}()` });
        });
      }
    }
  }
  return out;
}

/** One slide per block file that exports an `example`; the files that don't are listed by name. */
interface LibraryBlocks {
  slides: Array<SlideEntry>;
  without: Array<string>;
}

function libraryBlocks(): LibraryBlocks {
  const slides: Array<SlideEntry> = [];
  const without: Array<string> = [];
  for (const [path, mod] of Object.entries(blockFiles)) {
    const file = fileOf(path);
    const { example } = mod;
    if (example === undefined) {
      without.push(file);
      continue;
    }
    const name = `blocks/${file}`;
    const whole = isEntry(example);
    const own = {
      id: name,
      notes: `src/library/blocks/${file}: its \`example\``,
      content: (
        <Guard name={name} hint={BLOCK_HINT}>
          {whole ? (
            example.content
          ) : (
            <Frame section="Library block" title={file.replace(/\.tsx$/u, "")}>
              {example}
            </Frame>
          )}
        </Guard>
      ),
    };
    slides.push(whole ? { ...example, ...own } : own);
  }
  return { slides, without };
}

/** One slide per effect (it plays when the slide opens, and again on →) and per transition (the slide arrives with it). */
function libraryMotion(): Array<SlideEntry> {
  return [
    ...motion.effects.map((effect) =>
      slide(
        <Frame section="Library motion: entrance effect" title={`effect="${effect}"`}>
          <div data-effect={effect} className="flex flex-col gap-(--gap-item)">
            {["When the slide opens", "A moment later"].map((text, i) => (
              <Reveal key={text} effect={effect} delay={300} order={i * 4} className="type-strong rounded-box bg-surface p-(--pad-box)">
                {text}
              </Reveal>
            ))}
            <Build at={1} effect={effect} className="type-strong rounded-box bg-accent p-(--pad-box) text-on-accent">
              On the next press of →
            </Build>
          </div>
        </Frame>,
        { id: `motion/effect/${effect}`, notes: `src/library/motion: <Reveal effect="${effect}"> and <Build effect="${effect}">` },
      ),
    ),
    ...motion.transitions.map((transition) =>
      slide(
        <Frame section="Library motion: slide transition" title={`transition: "${transition}"`}>
          <Lead detail="Press ← then → to see it again, both ways.">This slide arrived with it.</Lead>
        </Frame>,
        { id: `motion/transition/${transition}`, transition, notes: `src/library/motion: transition: "${transition}"` },
      ),
    ),
  ];
}

const SLIDE_HINT = "Library slides need a default for every prop, so they can be shown on their own.";
const BLOCK_HINT = "A block file's `example` must render on its own: give the block every prop it needs.";

/** What a thrown value says: its `message` if it has one, else the value itself. */
function errorText(error: unknown): string {
  const message = typeof error === "object" && error !== null && "message" in error ? error.message : undefined;
  return String(message ?? error);
}

/** One broken library file shows what's wrong instead of blanking the whole view. */
function Broken({ name, hint, error }: { name: string; hint: string; error: unknown }) {
  return (
    <div data-broken={name} className="contents">
      <Frame section="Broken in the library" title={name}>
        <Lead detail={hint}>{errorText(error)}</Lead>
      </Frame>
    </div>
  );
}

class Guard extends Component<{ name: string; hint: string; children: ReactNode }, { error: unknown }> {
  constructor(props: { name: string; hint: string; children: ReactNode }) {
    super(props);
    this.state = { error: undefined };
  }
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    return this.state.error === undefined ? (
      this.props.children
    ) : (
      <Broken name={this.props.name} hint={this.props.hint} error={this.state.error} />
    );
  }
}

const blocks = libraryBlocks();
/** The view's slides by kind, for the dev gallery; the deck below shows them in this order. */
export const library = {
  slides: librarySlides(),
  blocks: blocks.slides,
  /** Block files with no `example` export: listed by name only, and not render-checked. */
  blocksWithoutExample: blocks.without,
  motion: libraryMotion(),
};

const all = [...library.slides, ...library.blocks, ...library.motion];
const deck: DeckDefinition = {
  title: "Library",
  footer: "src/library",
  slides:
    all.length > 0
      ? all
      : [
          <Frame title="Nothing in the library yet">
            <Lead>Add a component to src/library/slides/ and it shows up here.</Lead>
          </Frame>,
        ],
};
export default deck;
