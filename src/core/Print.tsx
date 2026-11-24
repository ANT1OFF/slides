import { useEffect } from "react";
import { Stage } from "./Stage.tsx";
import { slideNumber, slideTags, type DeckSlide } from "./types.ts";

/**
 * Every visible slide on its own 1920×1080 page in its final state, then the print dialog.
 * Choose "Save as PDF" there; returns to the deck when the dialog closes.
 */
export function Print({ slides, name, onDone }: { slides: DeckSlide[]; name: string; onDone: () => void }) {
  useEffect(() => {
    let cancelled = false;
    const done = () => onDone();
    window.addEventListener("afterprint", done);
    void document.fonts.ready.then(() =>
      setTimeout(() => {
        if (!cancelled) window.print();
      }, 300),
    );
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", done);
    };
  }, [onDone]);

  return (
    <div data-deck={name} data-deck-mode="print" className="print-pages">
      {slides.map(
        (s, i) =>
          !s.hidden && (
            <div key={i} {...slideTags(s, i)} className="print-page">
              <Stage scale={1} still number={slideNumber(slides, i)}>
                {s.content}
              </Stage>
            </div>
          ),
      )}
    </div>
  );
}
