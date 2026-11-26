import { Reveal, delay } from "@core";
import { series } from "./palette.ts";

export interface Segment {
  name: string;
  value: number;
  /** Tailwind background class; defaults to the theme's chart colours in order. */
  fill?: string;
}

/**
 * One part-to-whole bar with 2px gaps and a legend carrying the values, with an optional `unit`.
 * With `highlight`, that segment takes the key colour and the rest are muted, like `Pie`.
 */
export function StackedBar({
  segments,
  highlight,
  unit = "",
  start = 400,
}: {
  segments: Array<Segment>;
  /** The segment (0-based) the slide is about. */
  highlight?: number;
  /** Written after each value: "%", " min". */
  unit?: string;
  start?: number;
}) {
  const total = segments.reduce((s, m) => s + m.value, 0);

  // The muted segments step down in strength, so neighbours stay apart.
  const look = (m: Segment, i: number) => {
    if (highlight === undefined) {
      return { bg: m.fill ?? series(i).bg };
    }

    if (i === highlight) {
      return { bg: "bg-chart-key" };
    }

    return { bg: "bg-muted", opacity: 1 - ((i < highlight ? i : i - 1) % 3) * 0.3 };
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex h-24 w-full gap-[2px]">
        {segments.map((m, i) => {
          const { bg, opacity } = look(m, i);

          return (
            <div
              key={m.name}
              className={`grow-x h-full rounded ${bg}`}
              style={{ width: `${(m.value / total) * 100}%`, opacity, ...delay(start + i * 120) }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-14 gap-y-5">
        {segments.map((m, i) => {
          const { bg, opacity } = look(m, i);

          return (
            <Reveal key={m.name} effect="fade" delay={start + 500 + i * 80} className="type-small flex items-center gap-4">
              <span className={`size-6 rounded ${bg}`} style={{ opacity }} />
              <span>{m.name}</span>
              <span data-fact="chart" className="font-semibold tabular-nums">
                {m.value}
                {unit}
              </span>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
