import type { ReactNode } from "react";
import { Traveller, delay } from "@core";

export interface FlowNode {
  title: string;
  sub?: string;
  /** Draw it filled with the ink colour, to mark the start, the end or the important step. */
  strong?: boolean;
}

/**
 * Boxes joined by arrows, left to right, with dots travelling along the arrows once the slide
 * has settled. For anything more custom, draw your own SVG with `Node` and `Arrow`.
 */
export function Flow({
  nodes,
  width = 1680,
  height = 400,
  start = 300,
}: {
  nodes: Array<FlowNode>;
  width?: number;
  height?: number;
  start?: number;
}) {
  const n = nodes.length;
  const gap = 90;
  const w = (width - gap * (n - 1)) / n;
  const y = height / 2;
  const x = (i: number) => i * (w + gap) + w / 2;

  return (
    <svg width={width} height={height} className="my-auto overflow-visible">
      {nodes.slice(1).map((_, i) => (
        <Arrow
          key={i}
          from={[x(i) + w / 2 + 8, y]}
          to={[x(i + 1) - w / 2 - 8, y]}
          start={start + 300 + i * 160}
          travel={{ begin: (start + 1600) / 1000 + i * 0.6, dur: 2.4 }}
        />
      ))}
      {nodes.map((node, i) => (
        <Node
          key={i}
          x={x(i)}
          y={y}
          w={w}
          h={Math.min(height, 260)}
          title={node.title}
          sub={node.sub}
          strong={node.strong}
          start={start + i * 160}
        />
      ))}
    </svg>
  );
}

/** An SVG box with a title and an optional subtitle, centred on (x, y). For use inside your own <svg>. */
export function Node({
  x,
  y,
  w,
  h = 120,
  title,
  sub,
  strong = false,
  start = 0,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  title: ReactNode;
  sub?: ReactNode;
  strong?: boolean;
  start?: number;
}) {
  return (
    <g className="pop" style={delay(start)}>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        className={strong ? "fill-ink" : "fill-surface"}
        style={{ rx: "var(--radius-box)" }}
      />
      <text
        x={x}
        y={sub ? y - 20 : y}
        dy="0.35em"
        textAnchor="middle"
        className={`weight-strong text-[38px] ${strong ? "fill-canvas" : "fill-ink"}`}
      >
        {title}
      </text>
      {sub && (
        <text x={x} y={y + 30} dy="0.35em" textAnchor="middle" className={`text-[26px] ${strong ? "fill-canvas" : "fill-ink-2"}`}>
          {sub}
        </text>
      )}
    </g>
  );
}

/** A straight SVG arrow that draws itself on; `travel` adds a looping dot along it. */
export function Arrow({
  from,
  to,
  start = 0,
  travel,
  className = "stroke-muted",
}: {
  from: [number, number];
  to: [number, number];
  start?: number;
  travel?: { begin: number; dur: number };
  className?: string;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = (s: number) => `${x2 - 18 * Math.cos(a - s)} ${y2 - 18 * Math.sin(a - s)}`;
  const d = `M ${x1} ${y1} L ${x2} ${y2}`;

  return (
    <g>
      <path d={d} pathLength={1} className={`draw fill-none ${className}`} strokeWidth={3} style={delay(start)} />
      <path
        d={`M ${head(0.5)} L ${x2} ${y2} L ${head(-0.5)}`}
        className={`fade fill-none ${className}`}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={delay(start + 500)}
      />
      {travel && <Traveller path={d} begin={travel.begin} dur={travel.dur} r={8} className="fill-accent" />}
    </g>
  );
}
