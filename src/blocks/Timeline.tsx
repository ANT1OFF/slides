import type { ReactNode } from "react";
import { Build, Reveal, delay } from "@core";
import { stepOf, type BuildProp } from "./steps.ts";

export interface Milestone {
  /** Date or label above the line, e.g. "Q3" or "2027". */
  when: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  /** Done milestones are filled with ink; the first one not done is the current one, in the accent. */
  done?: boolean;
}

/** A roadmap: an ink line with a node per milestone, its date above and its title below. `build` reveals them in turn. */
export function Timeline({ items, build, start = 300 }: { items: Milestone[]; build?: BuildProp; start?: number }) {
  const current = items.findIndex((m) => !m.done);
  return (
    <div className="relative">
      <div className="grow-x absolute inset-x-0 top-[calc(var(--text-label)*1.2+44px)] h-(--rule) bg-ink" style={delay(start)} />
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((m, i) => (
          <Build key={i} at={stepOf(build, i)} enabled={!!build} className="pr-10">
            <div className="type-label text-ink-2">{m.when}</div>
            <span
              className={`pop mt-8 block size-5 rounded-full ${
                i === current ? "bg-accent" : m.done ? "bg-ink" : "border-(length:--rule) border-ink bg-canvas"
              }`}
              style={delay(start + 300 + i * 120)}
            />
            <Reveal delay={build ? 0 : start + 400 + i * 120} className="mt-8">
              <div className="type-small weight-strong">{m.title}</div>
              {m.detail && <div className="type-small mt-2 text-ink-2">{m.detail}</div>}
            </Reveal>
          </Build>
        ))}
      </div>
    </div>
  );
}
