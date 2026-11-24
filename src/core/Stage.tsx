import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { StaticContext } from "./context.ts";
import { SlideNumberContext, useDeck } from "./theme.ts";

export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;

/** A 1920×1080 slide surface drawn at `scale`; its box takes the scaled size. */
export function Stage({
  scale,
  children,
  still = false,
  className = "",
  number,
}: {
  scale: number;
  children: ReactNode;
  /** Render the final state with no motion (thumbnails, print). */
  still?: boolean;
  className?: string;
  /** The slide's number, shown in footers. */
  number?: string;
}) {
  const look = useDeck();
  return (
    <div className={`relative shrink-0 overflow-hidden ${className}`} style={{ width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale }}>
      <div
        data-stage=""
        data-theme={look.theme}
        data-scheme={look.scheme}
        className={`absolute top-0 left-0 origin-top-left overflow-hidden bg-canvas text-ink ${still ? "static-motion" : ""}`}
        style={{ ...look.vars, width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
      >
        <StaticContext.Provider value={still}>
          <SlideNumberContext.Provider value={number}>{children}</SlideNumberContext.Provider>
        </StaticContext.Provider>
      </div>
    </div>
  );
}

/** Scale at which a stage fits inside `width` × `height`. */
export function fitScale(width: number, height: number): number {
  return Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT);
}

export function useWindowSize(): { width: number; height: number } {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const onResize = () => setSize(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}
