import { useId } from "react";
import type React from "react";
import { Reveal, delay } from "@core";
import { series } from "./palette.ts";

export interface Slice {
  name: string;
  value: number;
  /** Tailwind fill class for the slice; defaults to the theme's chart colours in order. */
  fill?: string;
  /** Tailwind background class for the legend swatch, matching `fill`. */
  swatch?: string;
}

/** SVG path for a wedge (or, with an inner radius, a ring segment) from angle a0 to a1 in radians. */
function sector(c: number, r: number, inner: number, a0: number, a1: number): string {
  const pt = (rad: number, a: number) => `${c + rad * Math.cos(a)} ${c + rad * Math.sin(a)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;

  if (inner <= 0) {
    return `M ${c} ${c} L ${pt(r, a0)} A ${r} ${r} 0 ${large} 1 ${pt(r, a1)} Z`;
  }

  return `M ${pt(r, a0)} A ${r} ${r} 0 ${large} 1 ${pt(r, a1)} L ${pt(inner, a1)} A ${inner} ${inner} 0 ${large} 0 ${pt(inner, a0)} Z`;
}

/**
 * A pie (or a ring, with `ring`) revealed by one clockwise sweep from twelve o'clock, with the
 * values listed beside it in large type. Values are percentages of the whole. With `highlight`,
 * that slice takes the key colour and the rest are muted, the way `BarSeries` marks its key bar.
 */
export function Pie({
  slices,
  size = 560,
  ring = false,
  start = 300,
  legend = true,
  center,
  highlight,
}: {
  slices: Array<Slice>;
  size?: number;
  ring?: boolean;
  start?: number;
  legend?: boolean;
  /** Shown in the hole of a ring. */
  center?: React.ReactNode;
  /** The slice (0-based) to show in the key colour, with every other slice muted. */
  highlight?: number;
}) {
  const mask = useId();
  const c = size / 2;
  const r = size / 2;
  const inner = ring ? r * 0.58 : 0;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const gap = slices.length > 1 ? 0.006 : 0;
  let angle = -Math.PI / 2;

  // The muted slices step down in strength, so neighbours stay apart.
  const look = (s: Slice, i: number) => {
    if (highlight === undefined) {
      return { fill: s.fill ?? series(i).fill, swatch: s.swatch ?? series(i).bg };
    }

    if (i === highlight) {
      return { fill: "fill-chart-key", swatch: "bg-chart-key" };
    }

    const rest = i < highlight ? i : i - 1;

    return { fill: "fill-muted", swatch: "bg-muted", opacity: 1 - (rest % 3) * 0.3 };
  };

  return (
    <div className="flex items-center gap-20">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          <defs>
            <mask id={mask}>
              <circle
                cx={c}
                cy={c}
                r={r / 2}
                transform={`rotate(-90 ${c} ${c})`}
                pathLength={1}
                className="draw fill-none stroke-white"
                strokeWidth={r + 4}
                style={{ ...delay(start), animationDuration: "1600ms" }}
              />
            </mask>
          </defs>
          <g mask={`url(#${mask})`}>
            {slices.map((s, i) => {
              const sweep = (s.value / total) * Math.PI * 2;
              const path = sector(c, r, inner, angle + gap, angle + sweep - gap);
              // oxlint-disable-next-line react/immutability -- map runs during render; angle is a running total, not state
              angle += sweep;
              const { fill, opacity } = look(s, i);

              return <path key={s.name} d={path} className={fill} style={{ opacity }} />;
            })}
          </g>
        </svg>
        {center && (
          <Reveal effect="fade" delay={start + 1400} className="absolute inset-0 grid place-items-center text-center">
            <div style={{ maxWidth: inner * 1.6 }}>{center}</div>
          </Reveal>
        )}
      </div>
      {legend && (
        <div className="flex flex-col gap-8">
          {slices.map((s, i) => (
            <Reveal key={s.name} delay={start + 400 + i * 220} className="flex items-start gap-5">
              <span className={`mt-5 size-5 shrink-0 ${look(s, i).swatch}`} style={{ opacity: look(s, i).opacity }} />
              <span>
                <span data-fact="chart" className="type-stat block text-stat-sm">
                  {s.value}%
                </span>
                <span className="type-small block text-ink-2">{s.name}</span>
              </span>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
