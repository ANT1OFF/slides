import type { ReactNode } from "react";
import { Build, Pulse, Reveal, Traveller, delay } from "@core";
import { stepOf, type BuildProp } from "./steps.ts";

export interface Step {
  title: ReactNode;
  detail?: ReactNode;
  /** Short label drawn on the track between this step and the next. */
  edge?: string;
}

/**
 * Horizontal process: a track with numbered nodes, a dot travelling along it,
 * and a card under each node. Fits the 1680px content width.
 */
/** `build` reveals one step's card per press of →. */
export function Pipeline({ steps, build, start = 300 }: { steps: Step[]; build?: BuildProp; start?: number }) {
  const width = 1680;
  const n = steps.length;
  const col = width / n;
  const cx = (i: number) => col * i + col / 2;
  const y = 40;
  const track = `M ${cx(0)} ${y} L ${cx(n - 1)} ${y}`;
  const ink = "stroke-rule";
  // Steady state begins once the last card has risen; the dot then crosses the track every `period`.
  const loopStart = start + 320 + n * 140 + 900;
  const period = Math.max(n * 0.9, 4);

  return (
    <div className="relative my-auto" style={{ width }}>
      <svg width={width} height={80} className="overflow-visible">
        <path d={track} pathLength={1} className={`draw fill-none ${ink}`} strokeWidth={3} style={delay(start)} />
        {steps.map((s, i) =>
          s.edge && i < n - 1 ? (
            <text
              key={`e${i}`}
              x={(cx(i) + cx(i + 1)) / 2}
              y={y - 22}
              textAnchor="middle"
              className={"fade font-label text-label fill-accent-text"}
              style={delay(start + 600 + i * 140)}
            >
              {s.edge}
            </text>
          ) : null,
        )}
        {steps.map((_, i) => (
          <g key={i} className="pop" style={delay(start + 200 + i * 140)}>
            <circle cx={cx(i)} cy={y} r={30} className="fill-canvas stroke-accent" strokeWidth={3} />
            <text x={cx(i)} y={y} dy="0.36em" textAnchor="middle" className="font-label text-label fill-ink">
              {i + 1}
            </text>
          </g>
        ))}
        {steps.map((_, i) => (
          <Pulse
            key={`p${i}`}
            cx={cx(i)}
            cy={y}
            r={30}
            start={loopStart + (period * 1000 * i) / (n - 1)}
            period={period}
            className="stroke-accent"
          />
        ))}
        <Traveller path={track} dur={period} begin={loopStart / 1000} r={9} className="fill-accent" linear />
      </svg>
      <div className="mt-6 grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {steps.map((s, i) => (
          <Build key={i} at={stepOf(build, i)} enabled={!!build}>
            <Reveal delay={build ? 0 : start + 320 + i * 140} className="px-4 text-center">
              <div className="type-small weight-strong leading-tight">{s.title}</div>
              {s.detail && <div className={`mt-3 text-[28px] leading-snug text-ink-2`}>{s.detail}</div>}
            </Reveal>
          </Build>
        ))}
      </div>
    </div>
  );
}
