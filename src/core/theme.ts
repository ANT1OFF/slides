import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { DeckDefinition } from "./types.ts";

/** How a deck looks: its theme folder, scheme and the per-deck overrides. Read by Stage and the blocks. */
export interface DeckLook {
  title: string;
  /** A folder in src/themes. */
  theme: string;
  scheme: "light" | "dark";
  logo?: ReactNode | null;
  footer?: ReactNode | false;
  vars?: Record<string, string>;
}

export const DeckContext = createContext<DeckLook>({ title: "", theme: "default", scheme: "light" });

/** The current deck's look, for blocks that show the logo or footer. */
export const useDeck = () => useContext(DeckContext);

export function deckLook(deck: DeckDefinition): DeckLook {
  return {
    title: deck.title,
    theme: deck.theme ?? "default",
    scheme: deck.scheme ?? "light",
    logo: deck.logo,
    footer: deck.footer,
    vars: deck.vars,
  };
}

/** The number of the slide being drawn ("07"), for footers. Undefined outside a deck. */
export const SlideNumberContext = createContext<string | undefined>(undefined);

export const useSlideNumber = () => useContext(SlideNumberContext);
