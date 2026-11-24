import { useEffect, useMemo, useState } from "react";
import { DisplayContext, StepContext, type Display } from "./context.ts";
import { Stage, fitScale, useWindowSize } from "./Stage.tsx";
import { isMessage, postTarget, sameOrigin, type Message, type Position } from "./sync.ts";
import { DeckContext, deckLook } from "./theme.ts";
import { entries, slideLabel, slideNumber, slideTags, type DeckDefinition } from "./types.ts";

// The deck window that opened us; a parent page also works, e.g. when embedded for testing.
const peer = (): Window | null => window.opener ?? (window.parent !== window ? window.parent : null);
const send = (m: Message) => peer()?.postMessage(m, postTarget());

function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Speaker view opened from the deck with N: current slide, next slide, notes and timers.
 * Keys here drive the deck window too.
 */
export function Presenter({ deck, name }: { deck: DeckDefinition; name: string }) {
  const slides = useMemo(() => entries(deck), [deck]);
  const look = useMemo(() => deckLook(deck), [deck]);
  const [pos, setPos] = useState<Position | null>(null);
  const [display, setDisplay] = useState<Display>("absolute");
  const [started, setStarted] = useState(() => Date.now());
  const now = useClock();
  const { width, height } = useWindowSize();

  useEffect(() => {
    document.title = `Presenter · ${deck.title}`;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== peer() || !sameOrigin(e) || !isMessage(e.data)) {
        return;
      }
      if (e.data.type === "slides:state") {
        setPos(e.data.position);
        setDisplay(e.data.display);
      }
    };
    window.addEventListener("message", onMessage);
    send({ type: "slides:hello" });
    return () => window.removeEventListener("message", onMessage);
  }, [deck.title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        send({ type: "slides:nav", dir: 1 });
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        send({ type: "slides:nav", dir: -1 });
      } else if (e.key.toLowerCase() === "r") {
        setStarted(Date.now());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!peer()) {
    return <div className="grid h-screen place-items-center bg-ink text-2xl text-canvas">Open this from the deck with N.</div>;
  }
  if (!pos) {
    return <div className="grid h-screen place-items-center bg-ink text-2xl text-canvas">Connecting to the deck…</div>;
  }

  const current = slides[pos.index];
  let nextIndex = pos.index + 1;
  while (nextIndex < slides.length && slides[nextIndex].hidden) {
    nextIndex++;
  }
  const next = slides[nextIndex];

  const pad = 32;
  const mainScale = fitScale(width * 0.62 - pad * 1.5, height * 0.62 - pad * 1.5);
  const sideScale = fitScale(width * 0.38 - pad * 1.5, height * 0.4);

  return (
    <DeckContext.Provider value={look}>
      <DisplayContext.Provider value={display}>
        <div data-deck={name} data-deck-mode="presenter" className="flex h-screen flex-col gap-6 bg-ink p-8 font-sans text-canvas">
          <div className="flex gap-8">
            <div className="flex flex-col gap-3">
              <div className="font-mono text-sm tracking-widest text-accent-2 uppercase">Now · {slideLabel(slides, pos.index).label}</div>
              <Stage scale={mainScale} number={slideNumber(slides, pos.index)} className="rounded-lg ring-1 ring-canvas/20">
                <StepContext.Provider value={{ step: pos.step, register: () => {} }}>
                  <div key={pos.index} {...slideTags(current, pos.index)} className="absolute inset-0">
                    {current.content}
                  </div>
                </StepContext.Provider>
              </Stage>
            </div>
            <div className="flex flex-1 flex-col gap-6">
              <div className="flex flex-col gap-3">
                <div className="font-mono text-sm tracking-widest text-canvas/50 uppercase">Next</div>
                {next ? (
                  <Stage
                    scale={sideScale}
                    still
                    number={slideNumber(slides, nextIndex)}
                    className="rounded-lg opacity-80 ring-1 ring-canvas/20"
                  >
                    {next.content}
                  </Stage>
                ) : (
                  <div className="text-xl text-canvas/50">End of deck</div>
                )}
              </div>
              <div className="mt-auto flex items-end justify-between">
                <button type="button" onClick={() => setStarted(Date.now())} className="cursor-pointer text-left" title="Reset timer (R)">
                  <div className="font-mono text-sm tracking-widest text-canvas/50 uppercase">Elapsed</div>
                  <div className="font-mono text-6xl tabular-nums">{mmss(now - started)}</div>
                </button>
                <div className="text-right">
                  <div className="font-mono text-sm tracking-widest text-canvas/50 uppercase">Clock</div>
                  <div className="font-mono text-4xl text-canvas/70 tabular-nums">
                    {new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-white/5 px-8 py-6 text-3xl leading-relaxed whitespace-pre-line">
            {current.notes ?? <span className="text-canvas/40">No notes for this slide.</span>}
          </div>
        </div>
      </DisplayContext.Provider>
    </DeckContext.Provider>
  );
}
