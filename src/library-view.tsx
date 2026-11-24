// Every slide in src/library/slides as one deck: the dev gallery's "Open the library", and the deck
// `npm run verify` builds to check the library renders. By convention every exported component
// (Capitalised name) is one slide with its default props, and every exported function whose name
// ends in "Slides" is a slide set.
import { Component, isValidElement, type ReactNode } from "react";
import { slide, type DeckDefinition, type SlideEntry, type SlideInput } from "@core";
import { Frame, Lead } from "@blocks";

const library = import.meta.glob<Record<string, unknown>>("./library/slides/*.tsx", { eager: true });

export const libraryFiles = Object.keys(library).map((path) => path.split("/").pop()!);

const isEntry = (s: SlideInput): s is SlideEntry => typeof s === "object" && s !== null && !isValidElement(s) && "content" in s;

export function librarySlides(): SlideEntry[] {
  const out: SlideEntry[] = [];
  for (const [path, mod] of Object.entries(library)) {
    const file = path.split("/").pop()!;
    for (const [name, value] of Object.entries(mod)) {
      if (typeof value !== "function") continue;
      if (/^[A-Z]/.test(name)) {
        const LibrarySlide = value as () => ReactNode;
        out.push(
          slide(
            <Guard name={`${file}: <${name} />`}>
              <LibrarySlide />
            </Guard>,
            { id: `${file}/${name}`, notes: `src/library/slides/${file}: <${name} />` },
          ),
        );
      } else if (/Slides$/.test(name)) {
        // A set may return plain JSX or slide() entries; keep an entry's own notes and options.
        let set: SlideInput[];
        try {
          set = (value as () => SlideInput[])();
        } catch (e) {
          set = [<Broken name={`${file}: ${name}()`} error={e} />];
        }
        set.forEach((s, i) => {
          const entry = isEntry(s) ? s : slide(s as ReactNode);
          out.push({ ...entry, id: `${file}/${name}[${i}]`, notes: entry.notes ?? `src/library/slides/${file}: ...${name}()` });
        });
      }
    }
  }
  return out;
}

/** One broken library slide shows what's wrong instead of blanking the whole view. */
function Broken({ name, error }: { name: string; error: unknown }) {
  return (
    <div data-broken="" className="contents">
      <Frame section="Broken library slide" title={name}>
        <Lead detail="Library slides need a default for every prop, so they can be shown on their own.">
          {String((error as Error)?.message ?? error)}
        </Lead>
      </Frame>
    </div>
  );
}

class Guard extends Component<{ name: string; children: ReactNode }, { error: unknown }> {
  state = { error: undefined as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  render() {
    return this.state.error !== undefined ? <Broken name={this.props.name} error={this.state.error} /> : this.props.children;
  }
}

const slides = librarySlides();
const deck: DeckDefinition = {
  title: "Library",
  footer: "src/library/slides",
  slides: slides.length
    ? slides
    : [
        <Frame title="No library slides yet">
          <Lead>Add a component to src/library/slides/ and it shows up here.</Lead>
        </Frame>,
      ],
};
export default deck;
