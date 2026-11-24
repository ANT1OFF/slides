// Layout blocks for inside a Frame: columns, card grids and side-by-side comparisons.
import { Children, type ReactNode } from "react";
import { Build, Reveal } from "@core";
import { stepOf, type BuildProp } from "./steps.ts";

/**
 * Two or more columns side by side, centred against each other. `ratio` sets their widths, e.g.
 * [5, 6]; `build` reveals one column per press of →.
 */
export function Columns({
  children,
  ratio,
  align = "center",
  build,
  start = 200,
}: {
  children: ReactNode;
  ratio?: number[];
  align?: "start" | "center" | "end" | "stretch";
  build?: BuildProp;
  start?: number;
}) {
  const cols = Children.toArray(children);
  const template = (ratio ?? cols.map(() => 1)).map((r) => `minmax(0, ${r}fr)`).join(" ");
  return (
    <div className="grid gap-(--gap-column)" style={{ gridTemplateColumns: template, alignItems: align }}>
      {cols.map((col, i) => (
        <Build key={i} at={stepOf(build, i)} enabled={!!build} className="min-w-0">
          <Reveal delay={build ? 0 : start + i * 140}>{col}</Reveal>
        </Build>
      ))}
    </div>
  );
}

/** A lead paragraph and quieter detail text, for the text side of a Columns. */
export function Lead({ children, detail }: { children: ReactNode; detail?: ReactNode }) {
  return (
    <div>
      <p className="type-lead max-w-[24ch]">{children}</p>
      {detail && <p className="type-small mt-8 max-w-[30ch] text-ink-2">{detail}</p>}
    </div>
  );
}

export interface CardItem {
  title: ReactNode;
  body?: ReactNode;
  /** A short label above the title: a number, initials, a category. */
  icon?: ReactNode;
  /** Small print at the bottom of the card. */
  meta?: ReactNode;
}

/** Panels side by side: features, people, options. `columns` defaults to the number of cards (max 4). */
export function Cards({ items, columns, build, start = 200 }: { items: CardItem[]; columns?: number; build?: BuildProp; start?: number }) {
  const n = columns ?? Math.min(items.length, 4);
  return (
    <div className="grid gap-(--gap-item)" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      {items.map((c, i) => (
        <Build key={i} at={stepOf(build, i)} enabled={!!build} className="h-full">
          <Reveal delay={build ? 0 : start + i * 110} className="rule-top-strong flex h-full flex-col rounded-box bg-surface p-(--pad-box)">
            {c.icon && <div className="type-label mb-8 text-[30px] text-accent-text">{c.icon}</div>}
            <div className="type-strong">{c.title}</div>
            {c.body && <div className="type-small mt-5 text-ink-2">{c.body}</div>}
            {c.meta && <div className="type-label mt-auto pt-10 text-ink-2">{c.meta}</div>}
          </Reveal>
        </Build>
      ))}
    </div>
  );
}

export interface CompareSide {
  title: ReactNode;
  items: ReactNode[];
  /** The recommended side: drawn on the inverted scheme. */
  highlight?: boolean;
}

/** Two (or more) options side by side: before/after, us/them. The recommended side is inverted. */
export function Compare({ sides, build, start = 200 }: { sides: CompareSide[]; build?: BuildProp; start?: number }) {
  return (
    <div className="grid gap-(--gap-item)" style={{ gridTemplateColumns: `repeat(${sides.length}, minmax(0, 1fr))` }}>
      {sides.map((s, i) => (
        <Build key={i} at={stepOf(build, i)} enabled={!!build} className="h-full">
          <Reveal
            delay={build ? 0 : start + i * 160}
            className={`rule-top-strong flex h-full flex-col rounded-box p-(--pad-box) ${s.highlight ? "inverted" : "bg-surface"}`}
          >
            <div className={`type-label ${s.highlight ? "text-accent-text" : "text-ink-2"}`}>{s.title}</div>
            <ul className="mt-6">
              {s.items.map((item, k) => (
                <li key={k} className="type-body rule-top grid grid-cols-[48px_1fr] items-baseline py-5 first:border-t-0">
                  <span className={`inline-block size-[14px] ${s.highlight ? "bg-accent" : "bg-muted"}`} />
                  <span className={s.highlight ? "" : "text-ink-2"}>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </Build>
      ))}
    </div>
  );
}
