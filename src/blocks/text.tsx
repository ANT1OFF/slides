// Text blocks for inside a Frame.
import type { ReactNode } from "react";
import { Build, Reveal } from "@core";
import { stepOf } from "./steps.ts";
import type { BuildProp } from "./steps.ts";

type Item = ReactNode | { title: ReactNode; detail?: ReactNode };

const isRich = (item: Item): item is { title: ReactNode; detail?: ReactNode } =>
  typeof item === "object" && item !== null && "title" in item;

/**
 * A list as rows between hairlines, numbered 01, 02 … (or `marker="square"` for an unnumbered list).
 * Items are text or `{ title, detail }`. `build` reveals one row per press of →.
 */
export function Bullets({
  items,
  build,
  marker = "number",
  start = 200,
}: {
  items: Array<Item>;
  build?: BuildProp;
  marker?: "number" | "square";
  start?: number;
}) {
  return (
    <ul className="rule-bottom flex max-h-[620px] flex-1 flex-col">
      {items.map((item, i) => (
        <Build key={i} at={stepOf(build, i)} enabled={Boolean(build)} as="li" className="rule-top flex flex-1 flex-col justify-center">
          <Reveal delay={build ? 0 : start} order={build ? 0 : i} className="grid grid-cols-[140px_1fr] items-baseline py-6">
            {marker === "number" ? (
              <span data-not-fact="" className="type-label text-[30px] tracking-[0.06em] text-accent-text">
                {String(i + 1).padStart(2, "0")}
              </span>
            ) : (
              <span className="inline-block size-[18px] translate-y-[-0.1em] bg-accent" />
            )}
            <span>
              <span className="type-strong block">{isRich(item) ? item.title : item}</span>
              {isRich(item) && item.detail && <span className="type-small mt-(--gap-tight) block text-ink-2">{item.detail}</span>}
            </span>
          </Reveal>
        </Build>
      ))}
    </ul>
  );
}

/** The same rows as Bullets, for an agenda; `active` (0-based) keeps full ink and the rest drop to ink-2. */
export function Agenda({ items, active, start = 200 }: { items: Array<ReactNode>; active?: number; start?: number }) {
  return (
    <ol className="rule-bottom flex max-h-[620px] flex-1 flex-col">
      {items.map((item, i) => {
        const dim = active !== undefined && active !== i;

        return (
          <Reveal key={i} as="li" delay={start} order={i} className="rule-top grid flex-1 grid-cols-[140px_1fr] items-center">
            <span data-not-fact="" className={`type-label text-[30px] tracking-[0.06em] ${dim ? "text-ink-2" : "text-accent-text"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={`type-strong ${dim ? "font-normal text-ink-2" : ""}`}>{item}</span>
          </Reveal>
        );
      })}
    </ol>
  );
}

/** A note to remember: a panel with an accent rule on its left, a label title and body text. */
export function Callout({
  children,
  title,
  tone = "accent",
  start = 300,
}: {
  children: ReactNode;
  title?: ReactNode;
  tone?: "accent" | "accent-2" | "accent-3";
  start?: number;
}) {
  const bar = { accent: "bg-accent", "accent-2": "bg-accent-2", "accent-3": "bg-accent-3" }[tone];

  return (
    <Reveal delay={start} className="relative rounded-box bg-surface py-10 pr-12 pl-16">
      <span className={`absolute inset-y-0 left-0 w-(--rule-strong) ${bar}`} />
      {title && <div className="type-label mb-4 text-ink-2">{title}</div>}
      <div className="type-body">{children}</div>
    </Reveal>
  );
}

/** A quote inside a Frame, with a source line. For a whole-slide quote use QuoteSlide. */
export function Quote({ children, source, start = 0 }: { children: ReactNode; source: ReactNode; start?: number }) {
  return (
    <Reveal delay={start} className="flex flex-col gap-6">
      <p className="type-lead relative max-w-[30ch] font-display">
        <span className="absolute -translate-x-full pr-[0.06em] text-accent-text">“</span>
        {children}”
      </p>
      <p className="type-small flex items-center gap-5 text-ink-2">
        <span className="h-(--rule-strong) w-12 bg-accent" />
        {source}
      </p>
    </Reveal>
  );
}
