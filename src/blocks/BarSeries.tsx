import { useState } from "react";
import { delay, useDisplay } from "@core";

export interface Bar {
  label: string;
  value: number;
}

/**
 * Single-series vertical bars, drawn the design's way: every bar muted except the key one (the last,
 * or the one under the pointer), values on the bars instead of a value axis, a strong baseline, and
 * the key value as a headline number in the chart's emptier top corner. Up to 12 bars get a value
 * each; longer series label only the key bar.
 */
export function BarSeries({
  data,
  max,
  format = (v) => v.toLocaleString("en-US"),
  axisLabelEvery = 1,
  unit,
  width = 1680,
  height = 560,
  start = 300,
  stagger = 45,
  relativeTo,
}: {
  data: Bar[];
  /** The value at the top of the chart; defaults to the largest bar. */
  max?: number;
  /** How a value is written on a bar and in the headline. */
  format?: (v: number) => string;
  /** Label every nth bar on the axis, plus the last. */
  axisLabelEvery?: number;
  /** What the values count, shown under the headline, e.g. "signups". */
  unit: string;
  width?: number;
  height?: number;
  start?: number;
  /** ms between bars; total entrance time is capped at about 1.2 s. */
  stagger?: number;
  /**
   * While the deck shows growth (M), bars become multiples of this base: "first" for the first
   * bar, or a number such as a yearly average, with the label it is measured against. `format`
   * "growth" shows percent growth over the base instead, and `always` uses it in both modes.
   */
  relativeTo?: { base: "first" | number; label: string; format?: "multiple" | "growth"; always?: boolean };
  /** Kept for older decks; values are written on the bars instead of a value axis. */
  ticks?: number[];
  tickLabel?: (t: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = useDisplay();
  const scaledMode = !!relativeTo && (display === "relative" || !!relativeTo.always);
  const asGrowth = scaledMode && relativeTo?.format === "growth";
  let shownUnit = unit;
  let write = format;
  if (scaledMode && relativeTo) {
    const base = relativeTo.base === "first" ? data[0].value : relativeTo.base;
    data = data.map((d) => ({
      ...d,
      value: asGrowth ? Math.max(0, Math.round((d.value / base - 1) * 100)) : Math.round((d.value / base) * 10) / 10,
    }));
    max = undefined;
    write = asGrowth ? (v) => (v ? `+${v.toLocaleString("en-US")}%` : "0") : (v) => `${v}×`;
    shownUnit = asGrowth ? `since ${relativeTo.label}` : `vs ${relativeTo.label}`;
  }
  const top = Math.max(max ?? 0, ...data.map((d) => d.value)) || 1;
  const n = data.length;
  const labelAll = n <= 12;
  const pad = { top: 70, bottom: 64 };
  const innerH = height - pad.top - pad.bottom;
  const step = width / n;
  const gap = Math.min(28, step * 0.25);
  const barW = Math.max(step - gap, 2);
  const base = pad.top + innerH;
  const y = (v: number) => (v / top) * innerH;
  const last = n - 1;
  const key = hover ?? last;
  const each = Math.min(stagger, 1200 / n);
  const valueSize = step > 120 ? "text-[40px]" : step > 70 ? "text-[30px]" : "text-label";
  // The headline goes in whichever top corner the bars leave emptier.
  const third = Math.max(1, Math.floor(n / 3));
  const leftTall = Math.max(...data.slice(0, third).map((d) => d.value));
  const rightTall = Math.max(...data.slice(-third).map((d) => d.value));
  const corner = leftTall <= rightTall ? "left" : "right";

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} className="overflow-visible">
        {data.map((d, i) => {
          const x = i * step + gap / 2;
          const h = y(d.value);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * step} y={pad.top} width={step} height={innerH} fill="transparent" />
              <path
                d={`M ${x} ${base} V ${base - h + 2} q 0 -2 2 -2 H ${x + barW - 2} q 2 0 2 2 V ${base} Z`}
                className={`grow ${i === key ? "fill-chart-key" : "fill-muted"}`}
                style={delay(start + i * each)}
              />
              {(labelAll || i === key) && (
                <text
                  x={x + barW / 2}
                  y={base - h - 16}
                  textAnchor="middle"
                  className={`fade weight-strong fill-ink tabular-nums ${valueSize}`}
                  style={delay(start + 500 + i * each)}
                >
                  {write(d.value)}
                </text>
              )}
              {((i % axisLabelEvery === 0 && last - i >= axisLabelEvery / 2) || i === last) && (
                <text x={x + barW / 2} y={base + 48} textAnchor="middle" className="fill-ink-2 font-label text-label">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={width} y1={base} y2={base} className="stroke-ink" style={{ strokeWidth: "var(--rule-strong)" }} />
      </svg>
      <div
        className={`fade pointer-events-none absolute top-0 ${corner === "left" ? "left-0" : "right-0 text-right"}`}
        style={delay(start + 600)}
      >
        <div className="type-stat text-stat-sm text-accent-text">{write(data[key].value)}</div>
        <div className="type-small mt-2 text-ink-2">
          {shownUnit} · {data[key].label}
        </div>
      </div>
    </div>
  );
}
