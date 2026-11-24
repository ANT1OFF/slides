import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";

/** The motion tokens a slide transition reads. It runs on <html>, above the stage where a theme sets them. */
const TRANSITION_TOKENS = ["--duration-base", "--ease-in-out"];
const TRANSITION_STATE = ["--transition-in", "--transition-out", "--transition-direction", ...TRANSITION_TOKENS];

/** Applies a slide change directly or through the browser's view transition. */
export function useSlideTransition() {
  // The newest transition, so an older one finishing doesn't clear its state.
  const run = useRef(0);

  // True when the current slide arrived without a transition: it then plays the plain entrance.
  const plain = useRef(true);

  const changeSlide = useCallback((name: string | undefined, back: boolean, apply: () => void) => {
    // Without a transition, without browser support or with reduced motion, the slide just changes.
    plain.current =
      !name || name === "none" || !document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (plain.current) {
      apply();

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

    const mine = ++run.current;

    const reset = () => {
      if (mine !== run.current) {
        return;
      }

      delete root.dataset.transition;
      delete root.dataset.transitionBack;

      for (const p of TRANSITION_STATE) {
        root.style.removeProperty(p);
      }
    };

    const transition = document.startViewTransition(() => flushSync(apply));
    // A newer transition skips this one, which rejects `ready` and `finished`: expected, not an
    // error. The state is reset either way.
    transition.ready.catch(() => {});
    void transition.finished.catch(() => {}).then(reset);
  }, []);

  return { plain, changeSlide };
}
