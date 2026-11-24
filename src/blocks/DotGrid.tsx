import { delay } from "@core";

/**
 * A grid of `rows × cols` dots where the first `highlight` (fractions allowed) are filled, so a
 * small share of a large whole is visible at a glance. Highlighted dots pop in, then pulse gently.
 */
export function DotGrid({
  rows,
  cols,
  highlight,
  dot = 22,
  gap = 10,
  start = 300,
}: {
  rows: number;
  cols: number;
  highlight: number;
  dot?: number;
  gap?: number;
  start?: number;
}) {
  const full = Math.floor(highlight);
  const part = highlight - full;
  const step = dot + gap;
  // All highlighted dots arrive within about 1.5 s, however many there are.
  const each = Math.min(90, 1500 / Math.max(full, 1));
  return (
    <svg width={cols * step - gap} height={rows * step - gap} className="overflow-visible">
      {Array.from({ length: rows * cols }, (_, i) => {
        const cx = (i % cols) * step + dot / 2;
        const cy = Math.floor(i / cols) * step + dot / 2;
        const on = i < full;
        const partial = i === full && part > 0;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={dot / 2} className="fade fill-rule" style={delay(start + (i % cols) * 6)} />
            {(on || partial) && (
              <g className="pop" style={delay(start + 600 + i * each)}>
                <circle cx={cx} cy={cy} r={(dot / 2) * (partial ? Math.sqrt(part) : 1)} className="fill-accent" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
