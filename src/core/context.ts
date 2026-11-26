import { createContext, useContext } from "react";

/**
 * Which build step the current slide is on. Outside the live deck every step is shown.
 * `played` is the step the presenter just stepped forward to (0 when the slide was advanced to),
 * whose timeline plays; any other step shows settled. It is -1 after Back, a jump, a reload, and
 * in thumbnails and print.
 */
export const StepContext = createContext<{ step: number; played?: number; register: (at: number) => void }>({
  step: Number.POSITIVE_INFINITY,
  register: () => {},
});

/** True for thumbnails and print: slides render in their final state with no motion. */
export const StaticContext = createContext(false);

export const useStatic = () => useContext(StaticContext);

/** The build step that the content around it belongs to: a Build's `at`, else 0 (the slide's entrance). */
export const BeatContext = createContext(0);

/** True while the timeline of the step around it plays: the presenter has just stepped forward to it. */
export function usePlaying(): boolean {
  const { played = -1 } = useContext(StepContext);
  const at = useContext(BeatContext);
  const still = useStatic();

  return played === at && !still;
}

export type Display = "absolute" | "relative";

/** Whether numbers show as raw counts or as growth and shares. Toggled with M in the deck. */
export const DisplayContext = createContext<Display>("absolute");

export const useDisplay = () => useContext(DisplayContext);
