import { createContext, useContext, useEffect, useRef } from "react";
import { useStatic } from "./context.ts";

/** Where the deck is and how to move it. */
export interface DeckNav {
  /** The current slide, counted from 0. */
  index: number;
  /** The build step the current slide is on, from 0. */
  step: number;
  /** How many slides the deck has, hidden ones included. */
  count: number;
  /** Slide ids and backup status in deck order, including hidden slides. */
  slides: ReadonlyArray<Readonly<{ id: string; hidden: boolean }>>;
  /** One step forward (1) or back (-1): the next build step, then the next slide. What → and ← do. */
  nav: (dir: 1 | -1) => void;
  /** Jump by zero-based index or id, including to hidden slides. An unknown id leaves the deck in place. */
  goto: (slide: number | string) => void;
}

export const NavContext = createContext<DeckNav>({ index: 0, step: 0, count: 0, slides: [], nav: () => {}, goto: () => {} });

/**
 * The deck's position and its controls, for a component of your own: a progress or timer bar, a
 * remote-control listener, a "jump to the appendix" button. Use it in a deck's `overlay` or inside a
 * slide. Outside a live deck (the presenter window) it reports slide 0 and its controls do nothing.
 */
export const useDeckNav = () => useContext(NavContext);

/** A key a component added with useDeckKey: what the ? list shows, and what to run. */
export interface DeckKey {
  key: string;
  does: string;
  run: () => void;
}

/** Adds a key to the deck; returns the function that removes it. */
export const KeysContext = createContext<(key: DeckKey) => () => void>(() => () => {});

/**
 * A keyboard shortcut of your own, for as long as the component is on screen:
 * `useDeckKey("t", "Restart the timer", restart)`. The deck runs it while presenting (not in the
 * overview, the key list or on a blank screen) and lists it under ? with the built-in keys. `key`
 * is a `KeyboardEvent.key`; a letter matches with Shift or Caps Lock too. The built-in keys win, so
 * pick a free one. Thumbnails and print pages don't add keys.
 */
export function useDeckKey(key: string, does: string, run: () => void): void {
  const add = useContext(KeysContext);
  const still = useStatic();
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  }, [run]);
  useEffect(() => {
    if (still) {
      return;
    }
    return add({ key: key.length === 1 ? key.toLowerCase() : key, does, run: () => latest.current() });
  }, [add, still, key, does]);
}
