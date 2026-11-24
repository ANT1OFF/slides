import { Reveal, Traveller, delay, loop } from "@core";

export interface CycleNode {
  title: string;
  sub?: string;
}

/**
 * Cards spaced evenly on an ellipse that fits `width` × `height`, joined by the ring, with a dot
 * circling forever and each card glowing as the dot reaches it. Card 0 is at the top; clockwise.
 */
export function Cycle({
  nodes,
  width = 720,
  height = 620,
  cardWidth = 300,
  cardHeight = 104,
  start = 300,
  period = 10,
}: {
  nodes: CycleNode[];
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
  const ring = `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx - 0.01} ${cy - ry}`;
  const loopStart = start + n * 180 + 900;

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} className="absolute inset-0 overflow-visible">
        <path d={ring} pathLength={1} className="draw fill-none stroke-rule" strokeWidth={3} style={delay(start)} />
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
