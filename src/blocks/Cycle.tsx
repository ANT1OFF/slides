import { Reveal, Traveller, delay, loop } from "@core";

export interface CycleNode {
  title: string;
  sub?: string;
}

/**
 * Cards spaced evenly on an ellipse that fits `width` × `height`, joined by the ring, with an
 * arrowhead between each pair so the direction reads in print, and a dot circling forever with
 * each card glowing as the dot reaches it. Card 0 is at the top; clockwise.
 */
export function Cycle({
  nodes,
  width = 720,
  height = 540,
  cardWidth = 280,
  cardHeight = 96,
  start = 300,
  period = 10,
}: {
  nodes: Array<CycleNode>;
  width?: number;
  height?: number;
  cardWidth?: number;
  cardHeight?: number;
  start?: number;
  period?: number;
}) {
  const n = nodes.length;
  const cx = width / 2;
  const cy = height / 2;
  const rx = cx - cardWidth / 2;
  const ry = cy - cardHeight / 2;
  const at = (i: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  };
  // An arrowhead in the middle of the open stretch of ring between card i and card i + 1 (outside
  // both cards' boxes), pointing clockwise, so the direction reads without the moving dot.
  const under = (q: { x: number; y: number }, j: number) => {
    const c = at(j % n);
    return Math.abs(q.x - c.x) < cardWidth / 2 + 12 && Math.abs(q.y - c.y) < cardHeight / 2 + 12;
  };
  const head = (i: number) => {
    const angle = (t: number) => -Math.PI / 2 + ((i + t) / n) * Math.PI * 2;
    const point = (t: number) => ({ x: cx + rx * Math.cos(angle(t)), y: cy + ry * Math.sin(angle(t)) });
    const open = Array.from({ length: 101 }, (_, k) => k / 100).filter((t) => !under(point(t), i) && !under(point(t), i + 1));
    const a = angle(open.length ? (open[0] + open[open.length - 1]) / 2 : 0.5);
    const p = { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
    const [tx, ty] = [-rx * Math.sin(a), ry * Math.cos(a)];
    const len = Math.hypot(tx, ty);
    const [ux, uy] = [tx / len, ty / len];
    const tip = `${p.x + ux * 10} ${p.y + uy * 10}`;
    const wing = (side: number) => `${p.x - ux * 10 + side * uy * 8} ${p.y - uy * 10 - side * ux * 8}`;
    return `M ${wing(1)} L ${tip} L ${wing(-1)}`;
  };
  const ring = `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx - 0.01} ${cy - ry}`;
  const loopStart = start + n * 180 + 900;

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} className="absolute inset-0 overflow-visible">
        <path d={ring} pathLength={1} className="draw fill-none stroke-muted" strokeWidth={3} style={delay(start)} />
        {nodes.map((_, i) => (
          <path
            key={i}
            d={head(i)}
            className="fade fill-none stroke-muted"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={delay(start + 500 + i * 180)}
          />
        ))}
        <Traveller path={ring} dur={period} begin={loopStart / 1000} r={9} linear />
      </svg>
      {nodes.map((node, i) => {
        const p = at(i);
        return (
          <div
            key={node.title}
            className="absolute"
            // Centred on its point; a card grows when its text wraps instead of spilling out.
            style={{ left: p.x - cardWidth / 2, top: p.y, width: cardWidth, transform: "translateY(-50%)" }}
          >
            <Reveal effect="pop" delay={start + 250 + i * 180} className="h-full">
              <div
                className="glow flex h-full flex-col py-3 items-center justify-center rule-top-strong rounded-box bg-surface px-5 text-center"
                style={{ minHeight: cardHeight, ...loop(loopStart + (period * 1000 * i) / n + (period * 1000) / 2, period) }}
              >
                <div className="text-[30px] leading-tight weight-strong">{node.title}</div>
                {node.sub && <div className="mt-1 text-[26px] leading-snug text-ink-2">{node.sub}</div>}
              </div>
            </Reveal>
          </div>
        );
      })}
    </div>
  );
}
