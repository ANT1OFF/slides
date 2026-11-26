import { useContext, useEffect } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { BeatContext, StepContext } from "./context.ts";
import type { Effect } from "./motion.tsx";

/**
 * Content revealed on the `at`-th press of → on this slide (1, 2, 3 …), and gone again from the
 * `until`-th. The deck finds a slide's step count from the Builds it contains. A step can be a short
 * timeline: put `<Beat>`s inside, each landing some seconds after the step arrives.
 */
export function Build({
  at,
  until,
  children,
  as: Tag = "div",
  className = "",
  enabled = true,
  effect,
  style,
}: {
  at: number;
  /** The step it leaves on, within the first `--beat-leave` of that step (half a second by default). */
  until?: number;
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Inline style on the wrapper, e.g. a flex size when the step is a column of its own. */
  style?: CSSProperties;
  /** When false, renders the same wrapper always visible, so a component can make steps optional. */
  enabled?: boolean;
  /** An entrance effect to play when the step arrives ("pop", or one of your own), instead of the plain fade. */
  effect?: Effect;
}) {
  const { step, played = -1, register } = useContext(StepContext);
  useEffect(() => {
    if (enabled) {
      register(Math.max(at, until ?? 0));
    }
  }, [at, until, register, enabled]);

  if (!enabled) {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  // The entrance plays only on the way forward; Back, a jump, the overview and print show it settled.
  const arrived = step >= at;
  const entering = arrived && played === at;
  let classes = `build ${arrived ? "build-on" : ""} ${entering ? "" : "build-still"}`;

  if (effect) {
    classes = arrived ? "" : "build-wait";

    if (entering) {
      classes = effect;
    }
  }

  // Stepping forward onto `until` plays the exit; any other way there, it is simply gone.
  if (until !== undefined && step >= until) {
    classes += played === until ? " build-leave" : " build-gone";
  }

  return (
    <BeatContext.Provider value={at}>
      <Tag className={`${classes} ${className}`} style={style}>
        {children}
      </Tag>
    </BeatContext.Provider>
  );
}

/**
 * For blocks that step through states themselves (e.g. Code's line highlights): tells the deck the
 * slide has `steps` build steps and returns the current one (0 when the slide opens; Infinity in
 * thumbnails and print, meaning the final state).
 */
export function useBuildStep(steps: number): number {
  const { step, register } = useContext(StepContext);
  useEffect(() => {
    if (steps > 0) {
      register(steps);
    }
  }, [steps, register]);

  return step;
}
