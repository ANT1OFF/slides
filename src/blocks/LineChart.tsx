import { delay } from "@core";
import { series as palette } from "./palette.ts";

export interface LineSeries {
  name: string;
  values: Array<number>;
  /** Tailwind stroke class; defaults to the theme's chart colours in order. */
  stroke?: string;
  /** Tailwind fill class for the end dot, matching the stroke. */
  fill?: string;
}

/**
 * Lines that draw on from the left over one shared y axis, each labelled at its end, with an
 * optional dashed reference line (e.g. a policy limit).
 */
export function LineChart({
  x,
  series,
  max,
  ticks,
  tickLabel = (t) => String(t),
  labelEvery = 1,
  reference,
  markers = [],
  estimateFrom,
  width = 1680,
  height = 520,
  start = 300,
}: {
  x: Array<string>;
  series: Array<LineSeries>;
  max: number;
  ticks: Array<number>;
  tickLabel?: (t: number) => string;
  labelEvery?: number;
  reference?: { value: number; label: string };
  /** Vertical markers at x positions, labelled at the top (e.g. "Today", a crossover). */
  markers?: Array<{ index: number; label: string; dot?: number }>;
  /** From this index on, lines are dashed: an estimate rather than history. */
  estimateFrom?: number;
  width?: number;
  height?: number;
  start?: number;
}) {
  const pad = { top: 30, right: 300, bottom: 50, left: 90 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const n = x.length;
  const last = n - 1;
  const xs = (i: number) => pad.left + (i / (n - 1)) * innerW;
  const ys = (v: number) => pad.top + innerH - (v / max) * innerH;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {ticks.map((t) => (
        <g key={t} transform={`translate(0 ${ys(t)})`}>
          <line x1={pad.left} x2={pad.left + innerW} className="stroke-rule" strokeWidth={t ? 1 : 2} />
          <text x={pad.left - 18} dy="0.35em" textAnchor="end" className="fill-ink-2 font-label text-label">
            {tickLabel(t)}
          </text>
        </g>
      ))}
      {reference && (
        <g className="fade" style={delay(start + 1600)}>
          <line
            x1={pad.left}
            x2={pad.left + innerW}
            y1={ys(reference.value)}
            y2={ys(reference.value)}
            className="stroke-accent-3"
            strokeWidth={2.5}
            strokeDasharray="10 8"
          />
          <line
            x1={pad.left + 12}
            x2={pad.left + 60}
            y1={pad.top + 4}
            y2={pad.top + 4}
            className="stroke-accent-3"
            strokeWidth={2.5}
            strokeDasharray="10 8"
          />
          <text x={pad.left + 72} y={pad.top + 4} dy="0.35em" className="fill-accent-3 font-label text-label">
            {reference.label}
          </text>
        </g>
      )}
      {markers.map((m, i) => (
        <g key={m.label} className="fade" style={delay(start + 1500 + i * 250)}>
          <line
            x1={xs(m.index)}
            x2={xs(m.index)}
            y1={pad.top + 30 + i * 34}
            y2={pad.top + innerH}
            className="stroke-muted"
            strokeWidth={2}
            strokeDasharray="4 6"
          />
          <text x={xs(m.index)} y={pad.top + 14 + i * 34} textAnchor="middle" className="fill-ink-2 font-label text-label">
            {m.label}
          </text>
          {m.dot !== undefined && <circle cx={xs(m.index)} cy={ys(m.dot)} r={9} className="fill-accent-3" />}
        </g>
      ))}
      {series.map((s, k) => {
        const cut = estimateFrom ?? last;
        const path = (from: number, to: number) =>
          s.values
            .slice(from, to + 1)
            .map((v, i) => `${i ? "L" : "M"} ${xs(from + i)} ${ys(v)}`)
            .join(" ");
        const end = s.values[last];
        return (
          <g key={s.name}>
            <path
              d={path(0, cut)}
              pathLength={1}
              className={`draw fill-none ${s.stroke ?? palette(k).stroke}`}
              strokeWidth={4}
              strokeLinejoin="round"
              style={delay(start + k * 300)}
            />
            {cut < last && (
              <path
                d={path(cut, last)}
                className={`fade fill-none ${s.stroke ?? palette(k).stroke}`}
                strokeWidth={4}
                strokeDasharray="2 10"
                strokeLinecap="round"
                style={delay(start + 1200 + k * 300)}
              />
            )}
            <circle cx={xs(last)} cy={ys(end)} r={8} className={`pop ${s.fill ?? palette(k).fill}`} style={delay(start + 1300 + k * 300)} />
            <g className="fade" style={delay(start + 1400 + k * 300)}>
              <text x={xs(last) + 24} y={ys(end)} dy="-0.15em" className="fill-ink text-[28px] font-semibold tabular-nums">
                {tickLabel(Math.round(end * 10) / 10)}
              </text>
              <text x={xs(last) + 24} y={ys(end)} dy="1.15em" className="fill-ink-2 font-label text-label">
                {s.name}
              </text>
            </g>
          </g>
        );
      })}
      {x.map((label, i) =>
        (i % labelEvery === 0 && last - i >= labelEvery / 2) || i === last ? (
          <text key={i} x={xs(i)} y={pad.top + innerH + 36} textAnchor="middle" className="fill-ink-2 font-label text-label">
            {label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
