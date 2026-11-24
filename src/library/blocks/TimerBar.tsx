// src/library/blocks/TimerBar.tsx: a presenter extra of the team's own. An extra is a plain component
// put on a deck's `overlay`; it reads the deck with useDeckNav() and adds its key with useDeckKey().
//   const deck: DeckDefinition = { title: "…", overlay: <TimerBar minutes={20} />, slides: [...] };
// See docs/extending.md, "Keys and presenter extras".
import { useEffect, useState } from "react";
import { useDeckKey, useDeckNav } from "@core";
import { Lead } from "@blocks";

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * A thin bar along the top that fills over the planned `minutes`. It starts when the first slide is
 * left, and changes colour when the clock is more than a tenth of the talk ahead of the slides.
 * T starts it over (listed under ? with the other keys).
 */
export function TimerBar({ minutes = 20 }: { minutes?: number }) {
  const { index, count } = useDeckNav();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const restart = () => {
    setStartedAt(Date.now());
    setNow(Date.now());
  };
  useDeckKey("t", "Restart the talk timer", restart);
  useEffect(() => {
    if (index > 0) setStartedAt((s) => s ?? Date.now());
  }, [index]);
  useEffect(() => {
    if (startedAt === null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [startedAt]);

  const total = minutes * 60;
  const elapsed = startedAt === null ? 0 : Math.max(0, (now - startedAt) / 1000);
  const time = Math.min(elapsed / total, 1);
  const place = count > 1 ? index / (count - 1) : 1;
  const behind = time > place + 0.1;
  return (
    <div data-timer-bar={behind ? "behind" : "on-time"} className="absolute inset-x-0 top-0">
      <div className="h-1.5 bg-rule">
        <div className={`h-full ${behind ? "bg-accent-3" : "bg-accent"}`} style={{ width: `${time * 100}%` }} />
      </div>
      <div className="absolute top-3 right-4 font-mono text-xs text-ink-2 tabular-nums">
        {clock(elapsed)} / {clock(total)}
      </div>
    </div>
  );
}

/** What the library view shows for this block (npm run dev → Library). */
export const example = (
  <>
    <TimerBar minutes={2} />
    <Lead detail="Put it on a deck with overlay: <TimerBar minutes={20} />. Press ? to see its key in the list.">
      The bar along the top fills over the planned time. T starts it over.
    </Lead>
  </>
);
