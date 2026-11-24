import { delay } from "@core";

/** Sorted horizontal bars, one series, direct value labels. Every bar is muted except `highlight`. */
export function HBars({
  rows,
  max,
  start = 300,
  barClass = "fill-muted",
  highlight = 0,
  width = 1680,
}: {
  rows: Array<{ label: string; value: number }>;
  max?: number;
  start?: number;
  barClass?: string;
  /** The row that matters (0-based), drawn in the chart-key colour; -1 for none. */
  highlight?: number;
  /** Total width in px, labels included; the default is the full content width. */
  width?: number;
}) {
  const top = max ?? Math.max(...rows.map((r) => r.value));

  // The label column is as wide as the longest label (about 0.55em a character at 30px), so the bars start close to it.
  const longest = Math.max(...rows.map((r) => r.label.length));
  const labelW = Math.min(Math.round(width * 0.32), Math.round(longest * 17) + 48);
  const barMax = width - labelW - 140;
  const rowH = 80;

  return (
    <svg width={width} height={rows.length * rowH} className="overflow-visible">
      {rows.map((r, i) => {
        const w = Math.max((r.value / top) * barMax, 6);
        const yy = i * rowH;

        return (
          <g key={r.label}>
            <text
              x={labelW - 24}
              y={yy + rowH / 2}
              dy="0.35em"
              textAnchor="end"
              className="fade fill-ink-2 text-[30px]"
              style={delay(start + i * 60)}
            >
              {r.label}
            </text>
            <rect
              x={labelW}
              y={yy + 12}
              width={w}
              height={rowH - 24}
              rx={4}
              className={`grow-x ${i === highlight ? "fill-chart-key" : barClass}`}
              style={delay(start + 100 + i * 60)}
            />
            <text
              x={labelW + w + 16}
              y={yy + rowH / 2}
              dy="0.35em"
              className="fade fill-ink text-[30px] font-semibold tabular-nums"
              style={delay(start + 500 + i * 60)}
            >
              {r.value.toLocaleString("en-US")}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
