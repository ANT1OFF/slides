// src/library/blocks/Funnel.tsx: a team block, promoted from a deck (see docs/making-a-block.md).
import type { ReactNode } from "react";
import { Build, Reveal } from "@core";
import { stepOf, type BuildProp } from "@blocks";

export interface FunnelStage {
  label: ReactNode;
  value: number;
}

/** A conversion funnel: one bar per stage, narrowing. `build` reveals a stage per press of →. */
export function Funnel({ stages, build, start = 200 }: { stages: FunnelStage[]; build?: BuildProp; start?: number }) {
  const top = stages[0]?.value || 1;
  return (
    <div className="flex flex-col gap-3">
      {stages.map((s, i) => (
        <Build key={i} at={stepOf(build, i)} enabled={!!build}>
          <Reveal
            delay={build ? 0 : start}
            order={build ? 0 : i}
            className={`type-strong flex h-24 items-center justify-between rounded-box px-10 ${i === stages.length - 1 ? "bg-accent text-on-accent" : "bg-surface"}`}
            style={{ width: `${(s.value / top) * 100}%` }}
          >
            <span>{s.label}</span>
            <span className="tabular-nums">{s.value.toLocaleString("en-US")}</span>
          </Reveal>
        </Build>
      ))}
    </div>
  );
}

/**
 * What the library view shows for this block (npm run dev → Library), and what `npm run verify`
 * renders. Export an `example` from every block file: an element, shown inside a Frame.
 */
export const example = (
  <Funnel
    stages={[
      { label: "Visited", value: 1200 },
      { label: "Signed up", value: 640 },
      { label: "Paid", value: 310 },
    ]}
  />
);
