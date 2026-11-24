/** The folder name of the deck `virtual:deck` resolves to. */
declare const __DECK__: string;

declare module "virtual:deck" {
  import type { DeckDefinition } from "./core/types.ts";

  const deck: DeckDefinition;
  export default deck;
}

declare module "virtual:library" {
  /** The entrance effects and slide transitions found in src/library/motion, by name. */
  export const motion: { effects: Array<string>; transitions: Array<string> };
}

declare module "virtual:themes" {
  /** Theme folders in src/themes and their logos (an SVG's markup, or an image URL). */
  export const themes: Record<string, { svg?: string; url?: string }>;
}
