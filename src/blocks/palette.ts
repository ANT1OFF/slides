// Series colours for charts, in order. Literal class names so Tailwind finds them.
const FILL = ["fill-chart-1", "fill-chart-2", "fill-chart-3", "fill-chart-4", "fill-chart-5", "fill-chart-6"];
const STROKE = ["stroke-chart-1", "stroke-chart-2", "stroke-chart-3", "stroke-chart-4", "stroke-chart-5", "stroke-chart-6"];
const BG = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5", "bg-chart-6"];

/** The theme's chart colour `i` (0-based) as fill, stroke and background classes. */
export function series(i: number) {
  const k = i % FILL.length;
  return { fill: FILL[k], stroke: STROKE[k], bg: BG[k] };
}
