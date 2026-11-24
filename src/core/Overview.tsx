import { useEffect, useRef, useState } from "react";
import { STAGE_WIDTH, Stage, useWindowSize } from "./Stage.tsx";
import { slideLabel, slideNumber, slideTags } from "./types.ts";
import type { DeckSlide } from "./types.ts";

const COLUMNS = 5;
const GAP = 24;
const PAD = 48;

/** Grid of every slide in its final state; click one, or move with the arrow keys and press Enter, to jump there. Hidden slides are greyed. */
export function Overview({
  slides,
  name,
  current,
  onPick,
  onClose,
}: {
  slides: Array<DeckSlide>;
  name: string;
  current: number;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  const { width } = useWindowSize();
  const scale = (width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS / STAGE_WIDTH;
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  // The slide the arrow keys have moved to; Enter jumps there. It starts on the current slide.
  const [focus, setFocus] = useState(current);

  useEffect(() => {
    buttons.current[current]?.scrollIntoView({ block: "center" });
  }, [current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      const move = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLUMNS, ArrowDown: COLUMNS } as Record<string, number>)[e.key];
      if (move) {
        e.preventDefault();
        const next = Math.min(slides.length - 1, Math.max(0, focus + move));
        setFocus(next);
        buttons.current[next]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        onPick(focus);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, slides.length, onPick]);

  return (
    <div
      data-deck={name}
      data-deck-mode="overview"
      className="fixed inset-0 overflow-y-auto bg-ink/95 backdrop-blur"
      style={{ padding: PAD }}
      onClick={onClose}
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`, gap: GAP }}>
        {slides.map((s, i) => (
          <button
            key={i}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            {...slideTags(s, i)}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPick(i);
            }}
            className={`group relative cursor-pointer rounded-lg text-left ring-offset-4 ring-offset-ink transition ${
              i === focus ? "ring-4 ring-accent-2" : "hover:ring-2 hover:ring-canvas/50"
            } ${s.hidden ? "opacity-40" : ""}`}
          >
            <Stage scale={scale} still number={slideNumber(slides, i)} className="pointer-events-none rounded-lg">
              {s.content}
            </Stage>
            <span className="mt-2 block font-mono text-sm text-canvas/70">
              {slideLabel(slides, i).label.split(" / ")[0]} · {s.id}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
