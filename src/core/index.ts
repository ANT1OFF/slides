// The engine's public API. Blocks, decks and the library import only from here.
export { Build, useBuildStep } from "./Build.tsx";
export { useDisplay, useStatic, type Display } from "./context.ts";
export { Deck } from "./Deck.tsx";
export { CountUp, Pulse, Reveal, Traveller, delay, loop } from "./motion.tsx";
export { Presenter } from "./Presenter.tsx";
export { isPresenter } from "./sync.ts";
export { slide, type DeckDefinition, type SlideEntry, type SlideInput, type SlideOptions } from "./types.ts";
export { useDeck, useSlideNumber } from "./theme.ts";
export { asOf, type DataFile } from "./data.ts";
