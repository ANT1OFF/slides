// The engine's public API. Blocks, decks and the library import only from here.
export { Build, useBuildStep } from "./Build.tsx";

export { Ambient, Beat, SplitText, type AmbientEffect, type SplitEffect } from "./beat.tsx";

export { useDisplay, usePlaying, useStatic, type Display } from "./context.ts";

export { Deck } from "./Deck.tsx";

export { CountUp, Pulse, Reveal, Traveller, delay, loop, stagger, type Effect } from "./motion.tsx";

export { Morph } from "./morph.tsx";

export { useDeckKey, useDeckNav, type DeckNav } from "./nav.ts";

export { Presenter } from "./Presenter.tsx";

export { isPresenter } from "./sync.ts";

export { slide, type DeckDefinition, type SlideEntry, type SlideInput, type SlideOptions, type Transition } from "./types.ts";

export { useDeck, useSlideNumber } from "./theme.ts";

export { asOf, type DataFile } from "./data.ts";
