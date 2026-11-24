import type { DeckKey } from "./nav.ts";

/** Every built-in key of the deck window. The ? overlay and the README both list these. */
export const KEYS: [keys: string, does: string][] = [
  ["→  Space  ↓  PgDn  click right", "Next build step, then next slide"],
  ["←  ↑  PgUp  click left", "Previous build step, then previous slide"],
  ["Home  End", "First / last slide"],
  ["3  Enter", "Jump to slide 3"],
  ["F", "Fullscreen"],
  ["N", "Presenter window: notes, next slide, timer (R resets)"],
  ["G", "Overview grid; click a slide to jump, Esc closes"],
  ["P", "Print every slide to a page (Save as PDF)"],
  ["B  .", "Blank the screen"],
  ["M", "Switch numbers between raw counts and growth"],
  ["?", "This list"],
];

/** The list of keys: the built-in ones, then the ones components added with useDeckKey(). */
export function Help({ onClose, extra = [] }: { onClose: () => void; extra?: DeckKey[] }) {
  // A key added twice (the same component on screen twice) is listed once.
  const added = [...new Map(extra.map((k) => [k.key, k])).values()].map((k): [string, string] => [
    k.key.length === 1 ? k.key.toUpperCase() : k.key,
    k.does,
  ]);
  return (
    <div className="fixed inset-0 grid place-items-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[min(640px,90vw)] rounded-2xl bg-neutral-900 p-8 font-sans text-neutral-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 font-mono text-xs tracking-[0.2em] text-neutral-400 uppercase">Keyboard</div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 text-base">
          {[...KEYS, ...added].map(([keys, does]) => (
            <div key={keys} className="contents">
              <dt className="font-mono whitespace-pre text-neutral-300">{keys}</dt>
              <dd className="text-neutral-100">{does}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 text-sm text-neutral-400">Esc or ? to close</div>
      </div>
    </div>
  );
}
