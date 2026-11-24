import { Reveal, delay } from "@core";
import { series } from "./palette.ts";

export interface Segment {
  name: string;
  value: number;
  /** Tailwind background class; defaults to the theme's chart colours in order. */
  fill?: string;
}

/** One part-to-whole bar with 2px gaps and a legend carrying the values. */
export function StackedBar({ segments, start = 400 }: { segments: Array<Segment>; start?: number }) {
  const total = segments.reduce((s, m) => s + m.value, 0);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex h-24 w-full gap-[2px]">
        {segments.map((m, i) => (
          <div
            key={m.name}
            className={`grow-x h-full rounded ${m.fill ?? series(i).bg}`}
            style={{ width: `${(m.value / total) * 100}%`, ...delay(start + i * 120) }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-14 gap-y-5">
        {segments.map((m, i) => (
          <Reveal key={m.name} effect="fade" delay={start + 500 + i * 80} className="type-small flex items-center gap-4">
            <span className={`size-6 rounded ${m.fill ?? series(i).bg}`} />
            <span>{m.name}</span>
            <span className="font-semibold tabular-nums">{m.value}</span>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
