import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";

/** The motion tokens a slide transition reads. It runs on <html>, above the stage where a theme sets them. */
const TRANSITION_TOKENS = ["--duration-base", "--ease-in-out"];
const TRANSITION_STATE = ["--transition-in", "--transition-out", "--transition-direction", ...TRANSITION_TOKENS];

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

  const changeSlide = useCallback(
    (name: string | undefined, back: boolean, apply: () => void) => {
      // Without a transition, without browser support or with reduced motion, the slide just changes.
      plain.current =
        !name || name === "none" || !document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      updating.current = true;

      if (plain.current) {
        // A deck component can navigate from a React effect. Commit outside its render cycle.
        queueMicrotask(() => {
          flushSync(apply);
          drain();
        });

        return;
      }

      const root = document.documentElement;
      const stage = document.querySelector("[data-deck-mode=present] [data-stage]");
      root.dataset.transition = name;
      root.toggleAttribute("data-transition-back", back);
      root.style.setProperty("--transition-in", back ? `${name}-out` : `${name}-in`);
      root.style.setProperty("--transition-out", back ? `${name}-in` : `${name}-out`);
      root.style.setProperty("--transition-direction", back ? "reverse" : "normal");

      if (stage) {
        for (const t of TRANSITION_TOKENS) {
          root.style.setProperty(t, getComputedStyle(stage).getPropertyValue(t));
        }
      }

      const transition = document.startViewTransition(() => flushSync(apply));
      active.current = transition;

      const reset = () => {
        if (active.current !== transition) {
          return;
        }

        active.current = null;
        delete root.dataset.transition;
        delete root.dataset.transitionBack;

        for (const p of TRANSITION_STATE) {
          root.style.removeProperty(p);
        }
      };

      // Skipping rejects ready, but still runs the DOM update callback.
      void transition.updateCallbackDone.catch(() => {}).then(drain);
      transition.ready.catch(() => {});
      void transition.finished.catch(() => {}).then(reset);
    },
    [drain],
  );

  return { plain, changeSlide, runNavigation };
}
