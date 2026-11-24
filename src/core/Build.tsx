import { useContext, useEffect } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { StepContext } from "./context.ts";
import type { Effect } from "./motion.tsx";

/**
 * Content revealed on the `at`-th press of → on this slide (1, 2, 3 …).
 * The deck finds a slide's step count from the Builds it contains.
 */
export function Build({
  at,
  children,
  as: Tag = "div",
  className = "",
  enabled = true,
  effect,
  style,
}: {
  at: number;
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
  const { step, register } = useContext(StepContext);
  useEffect(() => {
    if (enabled) {
      register(at);
    }
  }, [at, register, enabled]);

  if (!enabled) {
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }

  if (effect) {
    return (
      <Tag className={`${step >= at ? effect : "build-wait"} ${className}`} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag className={`build ${step >= at ? "build-on" : ""} ${className}`} style={style}>
      {children}
    </Tag>
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
