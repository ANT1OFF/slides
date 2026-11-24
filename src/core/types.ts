import { isValidElement } from "react";
import type { ReactNode } from "react";

export interface SlideOptions {
  /** Stable name for the slide, kept when slides move; defaults to its component's name. */
  id?: string;
  /** Speaker notes, shown in the presenter window (N). */
  notes?: string;
  /** Backup slide: skipped when presenting and printing, shown greyed in the overview (G). */
  hidden?: boolean;
  /**
   * How this slide arrives, instead of the deck's `transition`: "fade", "push", "zoom", "none", or
   * the name of one of your own (src/library/motion).
   */
  transition?: string;
}

export interface SlideEntry extends SlideOptions {
  content: ReactNode;
}

/** A slide as the deck shows it, its id settled. */
export interface DeckSlide extends SlideEntry {
  id: string;
}

/** A slide is plain JSX, or JSX with options via `slide()`. */
export type SlideInput = ReactNode | SlideEntry;

export interface DeckDefinition {
  title: string;
  slides: Array<SlideInput>;
  /** A theme folder in src/themes, e.g. "editorial". Leave out for the default theme. Must be a string literal. */
  theme?: string;
  /** "dark" for the theme's dark colours. */
  scheme?: "light" | "dark";
  /** Replaces the theme's logo in slide headers; `null` hides it. */
  logo?: ReactNode | null;
  /** The small print at the bottom left of every Frame; defaults to the deck title, `false` hides it. */
  footer?: ReactNode | false;
  /** Token overrides for this deck only, e.g. `{ "--color-accent": "#0a7d5a" }`. */
  vars?: Record<string, string>;
  /** How numbers show by default: raw counts, or growth and shares. M switches while presenting. */
  display?: "absolute" | "relative";
  /**
   * The transition between slides: "fade", "push", "zoom", or the name of one of your own
   * (src/library/motion). A slide can name another with `slide(…, { transition })`. Leave out for none.
   */
  transition?: string;
  /**
   * Drawn over the window for the whole deck while presenting: a timer bar, a laser pointer, a
   * watermark. A plain component; it reads the deck with `useDeckNav()` and adds keys with
   * `useDeckKey()`. Not shown in print, the overview's thumbnails or the presenter window.
   */
  overlay?: ReactNode;
}

/** A slide with options (`slide(<A />, { notes })`), as opposed to a bare element. */
export function isEntry(s: SlideInput): s is SlideEntry {
  return s !== null && typeof s === "object" && !isValidElement(s) && "content" in s;
}

export function slide(content: ReactNode, options: SlideOptions = {}): SlideEntry {
  return { content, ...options };
}

// displayName, not name, which a release build minifies; vite/page-review.ts sets it for a deck's tags.
function nameOf(content: ReactNode): string | undefined {
  if (!isValidElement(content) || typeof content.type === "string") {
    return undefined;
  }
  const { type } = content;
  return "displayName" in type && typeof type.displayName === "string" ? type.displayName : undefined;
}

/** What page review reads off a slide's wrapper: its 1-based number, id and whether it has notes. */
export const slideTags = (entry: DeckSlide, index: number) => ({
  "data-slide": index + 1,
  "data-slide-id": entry.id,
  "data-notes": entry.notes ? "true" : undefined,
});

/** The deck's slides with their options, each with an id unique in the deck. */
export function entries(deck: DeckDefinition): Array<DeckSlide> {
  const taken = new Map<string, number>();
  return deck.slides.map((s, i) => {
    const entry = isEntry(s) ? s : { content: s };
    const base = entry.id ?? nameOf(entry.content) ?? `slide-${i + 1}`;
    const seen = (taken.get(base) ?? 0) + 1;
    taken.set(base, seen);
    return { ...entry, id: seen === 1 ? base : `${base}-${seen}` };
  });
}

/** The counter's text for a slide, and how far through the deck it is (0 to 1). */
export interface SlideLabel {
  label: string;
  progress: number;
}

/** What the counter shows for slide `index`: its place among the visible slides, or among the backups if it is hidden. */
export function slideLabel(slides: Array<DeckSlide>, index: number): SlideLabel {
  const visible = slides.filter((s) => !s.hidden).length;
  const before = slides.slice(0, index + 1);
  if (slides[index]?.hidden) {
    const backups = slides.length - visible;
    return { label: `backup ${before.filter((s) => s.hidden).length} / ${backups}`, progress: 1 };
  }
  const n = before.filter((s) => !s.hidden).length;
  return { label: `${n} / ${visible}`, progress: visible ? n / visible : 0 };
}

/** The number a footer shows for slide `index`: "07", or "B1" for the first hidden backup slide. */
export function slideNumber(slides: Array<DeckSlide>, index: number): string {
  const { label } = slideLabel(slides, index);
  return label.startsWith("backup") ? `B${label.split(" ")[1]}` : label.split(" / ")[0].padStart(2, "0");
}
