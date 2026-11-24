import { useEffect, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useStatic } from "./context.ts";

/**
 * An entrance effect by name: a built-in one, or the class of one of your own, from a file in
 * src/library/motion or any CSS the deck imports.
 */
export type Effect = "rise" | "fade" | "pop" | (string & {});

/**
 * Plays an entrance effect when the slide mounts, after `delay` ms. In a list, give each item its
 * `order` (0, 1, 2 …) to start it one `--stagger` after the item before.
 */
export function Reveal({
  children,
  delay = 0,
  order = 0,
  effect = "rise",
  as: Tag = "div",
  className = "",
  style,
}: {
  children: ReactNode;
  delay?: number;
  order?: number;
  effect?: Effect;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Tag className={`${effect} ${className}`} style={{ ...style, ...stagger(order, delay) }}>
      {children}
    </Tag>
  );
}

/** Style helper for staggering SVG elements and other animated classes. */
export function delay(ms: number): CSSProperties {
  return { "--d": `${ms}ms` } as CSSProperties;
}

/** Like `delay`, for item `i` of a list: `start` ms, then one `--stagger` (a theme token) per item. */
export function stagger(i: number, start = 0): CSSProperties {
  return { "--d": i ? `calc(${start}ms + ${i} * var(--stagger))` : `${start}ms` } as CSSProperties;
}

/** Style for a steady-state loop class: starts after `ms`, repeats every `period` seconds. */
export function loop(ms: number, period: number): CSSProperties {
  return { "--d": `${ms}ms`, "--dur": `${period}s` } as CSSProperties;
}

/** An SVG ring that pulses out from (cx, cy) on a loop, e.g. when a traveller reaches a node. */
export function Pulse({
  cx,
  cy,
  r,
  start,
  period,
  className = "stroke-accent",
}: {
  cx: number;
  cy: number;
  r: number;
  start: number;
  period: number;
  className?: string;
}) {
  return <circle cx={cx} cy={cy} r={r} className={`pulse-ring fill-none ${className}`} strokeWidth={3} style={loop(start, period)} />;
}

/** Counts from 0 to `to` with an ease-out curve. */
export function CountUp({
  to,
  duration = 1600,
  delay: startDelay = 0,
  format = (n) => Math.round(n).toLocaleString("en-US"),
}: {
  to: number;
  duration?: number;
  delay?: number;
  format?: (n: number) => string;
}) {
  const still = useStatic();
  const reduced = still || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [value, setValue] = useState(reduced ? to : 0);

  useEffect(() => {
    if (reduced) {
      return;
    }
    let frame = 0;
    const start = performance.now() + startDelay;
    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      setValue(to * (1 - Math.pow(1 - t, 4)));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration, startDelay, reduced]);

  return <span className="tabular-nums">{format(value)}</span>;
}

/**
 * A dot that travels along an SVG path forever, e.g. a request moving through a system.
 * `begin` is in seconds; set it past the slide's entrance. `linear` keeps a constant speed,
 * so pulses at evenly spaced nodes can be timed to its arrival.
 */
export function Traveller({
  path,
  dur = 3,
  begin = 0,
  r = 7,
  className = "fill-accent",
  linear = false,
}: {
  path: string;
  dur?: number;
  begin?: number;
  r?: number;
  className?: string;
  linear?: boolean;
}) {
  return (
    <circle r={r} className={className} opacity={0}>
      <animateMotion
        path={path}
        dur={`${dur}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        keyPoints="0;1"
        keyTimes="0;1"
        calcMode={linear ? "linear" : "spline"}
        keySplines={linear ? undefined : "0.45 0 0.55 1"}
      />
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.1;0.85;1"
        dur={`${dur}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
      />
    </circle>
  );
}
