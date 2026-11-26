import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { land, morphs, settle } from "./morph.tsx";

/** The motion tokens a slide transition reads. It runs on <html>, above the stage where a theme sets them. */
const TRANSITION_TOKENS = ["--duration-base", "--ease-in-out"];
const ORIGIN = ["--origin-x", "--origin-y", "--origin-r"];

const TRANSITION_STATE = ["--transition-in", "--transition-out", "--transition-direction", "--dx", "--dy", ...ORIGIN, ...TRANSITION_TOKENS];

/** The way a directional transition moves ("wipe up"), as a step along x and y. */
const DIRECTIONS = new Map([
  ["left", [-1, 0]],
  ["right", [1, 0]],
  ["up", [0, -1]],
  ["down", [0, 1]],
]);

const isElement = (target: EventTarget | null): target is Element => target !== null && "closest" in target;

/** A press this recent is the click that changed the slide. */
const CLICK_MS = 500;

const presentSlide = () => document.querySelector<HTMLElement>("[data-deck-mode=present] [data-slide]");

/** Applies a slide change directly or through the browser's view transition. */
export function useSlideTransition() {
  const active = useRef<ViewTransition | null>(null);
  const updating = useRef(false);
  const queued = useRef<Array<() => void>>([]);

  // Skip the animation immediately. A skipped transition still commits its update, so
  // relative moves wait for that commit and the incoming slide's build registrations.
  const runNavigation = useCallback((move: () => void) => {
    active.current?.skipTransition();

    if (updating.current) {
      queued.current.push(move);
    } else {
      move();
    }
  }, []);

  const drain = useCallback(() => {
    updating.current = false;

    while (queued.current.length > 0 && !updating.current) {
      const move = queued.current.shift();
      move?.();
    }

    if (queued.current.length > 0) {
      active.current?.skipTransition();
    }
  }, []);

  // True when the current slide arrived without a transition: it then plays the plain entrance.
  const plain = useRef(true);

  // The Morphs that carry a view-transition-name right now. They have one only while a transition runs.
  const named = useRef<Array<HTMLElement>>([]);

  // The last thing pressed, for a transition that opens from the clicked element.
  const pressed = useRef<{ target: EventTarget | null; at: number }>({ target: null, at: 0 });

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      pressed.current = { target: e.target, at: e.timeStamp };
    };

    window.addEventListener("pointerdown", onDown, true);

    return () => window.removeEventListener("pointerdown", onDown, true);
  }, []);

  const changeSlide = useCallback(
    /** `incoming` tells which Morph ids the slide being shown has; it is asked only when the one being left has any. */
    (name: string | undefined, back: boolean, apply: () => void, incoming?: () => Set<string> | undefined) => {
      const root = document.documentElement;

      const unname = () => {
        for (const el of named.current) {
          el.style.removeProperty("view-transition-name");
        }

        named.current = [];
      };

      const tag = (id: string, el: HTMLElement) => {
        el.style.setProperty("view-transition-name", `morph-${CSS.escape(id)}`);
        named.current.push(el);
      };

      /**
       * Where the transition opens from, for keyframes that read it (iris): the element just clicked
       * if it is marked data-origin, else the slide's first data-origin, else `fallback`. Set as the
       * element's centre in the slide's own pixels, with the distance to the farthest corner.
       */
      const setOrigin = (slide: HTMLElement, fallback: Element | undefined) => {
        const { target, at } = pressed.current;
        const clicked = isElement(target) && performance.now() - at < CLICK_MS ? target.closest("[data-origin]") : null;
        const from = (clicked && slide.contains(clicked) ? clicked : slide.querySelector("[data-origin]")) ?? fallback;

        if (!from) {
          return;
        }

        const box = slide.getBoundingClientRect();
        const spot = from.getBoundingClientRect();
        const scale = box.width / slide.offsetWidth || 1;
        const x = (spot.left + spot.width / 2 - box.left) / scale;
        const y = (spot.top + spot.height / 2 - box.top) / scale;
        root.style.setProperty("--origin-x", `${x}px`);
        root.style.setProperty("--origin-y", `${y}px`);
        root.style.setProperty("--origin-r", `${Math.hypot(Math.max(x, slide.offsetWidth - x), Math.max(y, slide.offsetHeight - y))}px`);
      };

      // A transition that was still running has just been skipped; its names go with it.
      unname();

      // Without browser support or with reduced motion, the slide just changes.
      const animated =
        name !== "none" && "startViewTransition" in document && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // A Morph flies only when both slides have its id. One that is on one slide only stays part of that slide.
      const leaving = animated ? presentSlide() : null;
      const from = morphs(leaving);
      const arriving = from.size > 0 ? incoming?.() : undefined;
      const pairs = [...from].filter(([id]) => arriving?.has(id));

      // A pair of Morphs with no transition named still flies, while the rest of the slide fades.
      const transition = name ?? (pairs.length > 0 ? "fade" : "");
      plain.current = !animated || !transition;
      updating.current = true;

      if (plain.current) {
        // A deck component can navigate from a React effect. Commit outside its render cycle.
        queueMicrotask(() => {
          flushSync(apply);
          drain();
        });

        return;
      }

      // "wipe up" is the transition "wipe", moving up.
      const [kind, direction = ""] = transition.split(" ");
      const [dx, dy] = DIRECTIONS.get(direction) ?? [-1, 0];
      const stage = document.querySelector("[data-deck-mode=present] [data-stage]");
      root.dataset.transition = kind;
      root.toggleAttribute("data-transition-back", back);
      root.style.setProperty("--transition-in", back ? `${kind}-out` : `${kind}-in`);
      root.style.setProperty("--transition-out", back ? `${kind}-in` : `${kind}-out`);
      root.style.setProperty("--transition-direction", back ? "reverse" : "normal");
      root.style.setProperty("--dx", String(dx));
      root.style.setProperty("--dy", String(dy));

      for (const p of ORIGIN) {
        root.style.removeProperty(p);
      }

      if (stage) {
        for (const t of TRANSITION_TOKENS) {
          root.style.setProperty(t, getComputedStyle(stage).getPropertyValue(t));
        }
      }

      for (const [id, el] of pairs) {
        tag(id, el);
      }

      // The point belongs to the earlier slide: going forward it opens from there, going back it closes into it.
      if (leaving && !back) {
        setOrigin(leaving, pairs[0]?.[1]);
      }

      const transitionRun = document.startViewTransition(() => {
        land(
          pairs.map(([id]) => id),
          () => flushSync(apply),
        );

        const arrived = presentSlide();
        const to = morphs(arrived);

        for (const [id] of pairs) {
          const el = to.get(id);

          if (el && arrived) {
            tag(id, el);
            settle(el, arrived);
          }
        }

        if (arrived && back) {
          setOrigin(arrived, to.get(pairs[0]?.[0] ?? ""));
        }
      });

      active.current = transitionRun;

      const reset = () => {
        if (active.current !== transitionRun) {
          return;
        }

        active.current = null;
        unname();
        delete root.dataset.transition;
        delete root.dataset.transitionBack;

        for (const p of TRANSITION_STATE) {
          root.style.removeProperty(p);
        }
      };

      // Skipping rejects ready, but still runs the DOM update callback.
      void transitionRun.updateCallbackDone.catch(() => {}).then(drain);
      transitionRun.ready.catch(() => {});
      void transitionRun.finished.catch(() => {}).then(reset);
    },
    [drain],
  );

  return { plain, changeSlide, runNavigation };
}
