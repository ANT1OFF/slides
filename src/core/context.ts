import { createContext, useContext } from "react";

/** Which build step the current slide is on. Outside the live deck every step is shown. */
export const StepContext = createContext<{ step: number; register: (at: number) => void }>({
  step: Number.POSITIVE_INFINITY,
  register: () => {},
});

/** True for thumbnails and print: slides render in their final state with no motion. */
export const StaticContext = createContext(false);

export const useStatic = () => useContext(StaticContext);

export type Display = "absolute" | "relative";

/** Whether numbers show as raw counts or as growth and shares. Toggled with M in the deck. */
export const DisplayContext = createContext<Display>("absolute");

export const useDisplay = () => useContext(DisplayContext);
