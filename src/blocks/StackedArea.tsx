import { useId } from "react";
import { delay, useDisplay } from "@core";
import { series as palette } from "./palette.ts";

export interface AreaSeries {
  name: string;
  values: number[];
  /** Tailwind fill class; defaults to the theme's chart colours in order. */
  fill?: string;
}

/**
 * Stacked areas over a shared x axis, revealed left to right, with each band labelled at its
 * right-hand end. While the deck shows growth (M) and `shares` is set, each x is drawn as 100%.
 */
export function StackedArea({
  x,
  series,
  max,
  ticks,
  tickLabel = (t) => t.toLocaleString("en-US"),
  labelEvery = 1,
  labelFor = (i) => x[i],
  shares = false,
  width = 1680,
  height = 560,
  start = 300,
}: {
  x: string[];
  series: AreaSeries[];
  max: number;
  ticks: number[];
  tickLabel?: (t: number) => string;
  /** Label every nth x position on the axis, plus the last. */
  labelEvery?: number;
  labelFor?: (i: number) => string;
  /** Allow the growth display to redraw as shares of the total. */
  shares?: boolean;
  width?: number;
  height?: number;
  start?: number;
}) {
  const clip = useId();
  const asShares = useDisplay() === "relative" && shares;
  const pad = { top: 30, right: 330, bottom: 50, left: 90 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const n = x.length;
  const totals = x.map((_, i) => series.reduce((s, ser) => s + ser.values[i], 0));
  const value = (s: number, i: number) => (asShares ? (100 * series[s].values[i]) / (totals[i] || 1) : series[s].values[i]);
  const top = asShares ? 100 : max;
  const yTicks = asShares ? [0, 25, 50, 75, 100] : ticks;
  const xs = (i: number) => pad.left + (i / (n - 1)) * innerW;
  const ys = (v: number) => pad.top + innerH - (Math.max(v, 0) / top) * innerH;

  const cumulative = series.map((_, s) =>
    x.map((__, i) => Array.from({ length: s + 1 }, (_x, k) => value(k, i)).reduce((a, b) => a + b, 0)),
  );
  const band = (s: number) => {
    const upper = cumulative[s].map((v, i) => `${xs(i)},${ys(v)}`);
    const lower = (s === 0 ? x.map(() => 0) : cumulative[s - 1]).map((v, i) => `${xs(i)},${ys(v)}`).reverse();
    return `M ${upper.join(" L ")} L ${lower.join(" L ")} Z`;
  };
  const last = n - 1;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <clipPath id={clip}>
          <rect x={pad.left} y={0} width={innerW + 2} height={height} className="grow-x" style={delay(start)} />
        </clipPath>
      </defs>
      {yTicks.map((t) => (
        <g key={t} transform={`translate(0 ${ys(t)})`}>
          <line x1={pad.left} x2={pad.left + innerW} className="stroke-rule" strokeWidth={t ? 1 : 2} />
          <text x={pad.left - 18} dy="0.35em" textAnchor="end" className="fill-ink-2 font-label text-label">
            {asShares ? `${t}%` : tickLabel(t)}
          </text>
        </g>
      ))}
      <g clipPath={`url(#${clip})`}>
        {series.map((ser, s) => (
          <path key={ser.name} d={band(s)} className={ser.fill ?? palette(s).fill} />
        ))}
      </g>
      {x.map((_, i) =>
        (i % labelEvery === 0 && last - i >= labelEvery / 2) || i === last ? (
          <text key={i} x={xs(i)} y={pad.top + innerH + 36} textAnchor="middle" className="fill-ink-2 font-label text-label">
            {labelFor(i)}
          </text>
        ) : null,
      )}
      {series.map((ser, s) => {
        const lo = s === 0 ? 0 : cumulative[s - 1][last];
        const mid = (lo + cumulative[s][last]) / 2;
        const v = value(s, last);
        return (
          <g key={ser.name} className="fade" style={delay(start + 1200 + s * 150)}>
            <line x1={xs(last) + 8} x2={xs(last) + 30} y1={ys(mid)} y2={ys(mid)} className="stroke-muted" strokeWidth={2} />
            <text x={xs(last) + 40} y={ys(mid)} dy="-0.2em" className="fill-ink text-[26px] font-semibold tabular-nums">
              {asShares ? `${Math.round(v)}%` : tickLabel(Math.round(v))}
            </text>
            <text x={xs(last) + 40} y={ys(mid)} dy="1.1em" className="fill-ink-2 font-label text-label">
              {ser.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
