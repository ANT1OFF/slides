import { createContext, useContext, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { useStatic } from "./context.ts";
import type { Position } from "./sync.ts";

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

/** Slide numbers start at 1 and build steps at 0. #5 is shorthand for #5.0. */
export function positionFromHash(count: number): Position {
  const match = /^#(?<slide>\d+)(?:\.(?<step>\d+))?$/u.exec(location.hash)?.groups;
  const index = Math.min(Math.max(Number(match?.slide ?? 1) - 1, 0), count - 1);

  return { index, step: Number(match?.step ?? 0) };
}

const INTERACTIVE =
  "a, button, input, select, textarea, label, summary, audio[controls], video[controls], [contenteditable], [tabindex], [role=button], [role=link]";

/** Pointer navigation and cursor idle state for the live stage. */
export function useStagePointer(stage: RefObject<HTMLDivElement | null>, presenting: boolean, nav: DeckNav["nav"]): void {
  useEffect(() => {
    const element = stage.current?.querySelector("[data-stage]");

    if (!presenting || !element) {
      return;
    }

    let start: PointerEvent | null = null;
    let distance = 0;
    let idle: ReturnType<typeof setTimeout>;

    // While a view transition runs, the browser can retarget stage input to <html>.
    const onStage = (e: MouseEvent) => {
      if (e.composedPath().includes(element)) {
        return true;
      }

      if (e.target !== document.documentElement || !document.documentElement.dataset.transition) {
        return false;
      }

      const { left, top, right, bottom } = element.getBoundingClientRect();

      return e.clientX >= left && e.clientX <= right && e.clientY >= top && e.clientY <= bottom;
    };

    const isElement = (target: EventTarget): target is Element => Object.prototype.isPrototypeOf.call(Element.prototype, target);
    const interactive = (e: Event) => e.composedPath().some((target) => isElement(target) && target.matches(INTERACTIVE));

    const wake = () => {
      element.classList.remove("cursor-none");
      clearTimeout(idle);
      idle = setTimeout(() => element.classList.add("cursor-none"), 2200);
    };

    const down = (e: PointerEvent) => {
      start = e.isPrimary && e.button === 0 && onStage(e) && !interactive(e) ? e : null;
      distance = 0;
      wake();
    };

    const move = (e: PointerEvent) => {
      wake();

      if (start?.pointerId === e.pointerId) {
        distance = Math.max(distance, Math.hypot(e.clientX - start.clientX, e.clientY - start.clientY));
      }
    };

    const cancel = () => {
      start = null;
    };

    const up = (e: PointerEvent) => {
      const origin = start;
      cancel();

      if (!origin || origin.pointerId !== e.pointerId || !onStage(e) || interactive(e)) {
        return;
      }

      const dx = e.clientX - origin.clientX;
      const dy = e.clientY - origin.clientY;

      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        nav(dx < 0 ? 1 : -1);
      } else if (Math.max(distance, Math.hypot(dx, dy)) < 12 && e.timeStamp - origin.timeStamp < 600) {
        nav(1);
      }
    };

    const menu = (e: MouseEvent) => {
      if (onStage(e)) {
        e.preventDefault();
        nav(-1);
      }
    };

    wake();
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("contextmenu", menu);

    return () => {
      clearTimeout(idle);
      element.classList.remove("cursor-none");
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("contextmenu", menu);
    };
  }, [stage, presenting, nav]);
}
