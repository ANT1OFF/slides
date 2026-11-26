import type { ReactNode } from "react";
import { Build, CountUp, Reveal, useDisplay } from "@core";
import { stepOf } from "./steps.ts";
import type { BuildProp } from "./steps.ts";

function formatLike(target: number) {
  const digits = Number.isInteger(target) ? 0 : (String(target).split(".")[1]?.length ?? 0);

  return (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** The number: `to` when typed in, `of` when read from a data file (the facts check in `npm run verify` trusts it). */
type StatNumber = { to: number; of?: never } | { of: number; to?: never };

export type StatValue = StatNumber & {
  label: ReactNode;
  prefix?: string;
  /** A unit after the number: "%", "×", " min". */
  suffix?: string;
};

/** The number to show, and the attribute that marks one read from data. */
const numberOf = (v: { to?: number; of?: number }) => ({ n: v.of ?? v.to ?? 0, fact: v.of === undefined ? undefined : "" });

function useValue(absolute: StatValue, relative?: StatValue) {
  const display = useDisplay();

  return { display, ...(display === "relative" && relative ? relative : absolute) };
}

/**
 * The one big number on a slide: it counts up, in the accent, with its unit beside it and a
 * caption to the right. `size="sm"` stacks a smaller number over its caption, for inside a column.
 * `relative` replaces it while the deck shows growth (press M).
 */
export function Stat({
  start = 0,
  size = "hero",
  relative,
  ...absolute
}: StatValue & { start?: number; size?: "hero" | "sm"; relative?: StatValue }) {
  const { display, label, prefix = "", suffix = "", ...value } = useValue(absolute, relative);
  const { n, fact } = numberOf(value);

  const number = (
    <span data-fact={fact}>
      {prefix}
      <CountUp key={`${display}-${n}`} to={n} delay={start + 200} format={formatLike(n)} />
    </span>
  );

  if (size === "sm") {
    return (
      <Reveal delay={start} className="rule-top-ink pt-6">
        <div className="type-stat text-[calc(var(--text-stat-sm)*1.3)] text-accent-text">
          {number}
          {suffix}
        </div>
        <div className="type-small mt-3 max-w-[22ch] text-ink-2">{label}</div>
      </Reveal>
    );
  }

  return (
    <Reveal delay={start} className="flex items-baseline">
      <span className="type-stat text-stat leading-[0.78] text-accent-text">{number}</span>
      {suffix && <span className="type-stat ml-[0.2em] text-[calc(var(--text-stat)*0.26)]">{suffix.trim()}</span>}
      <span className="type-lead ml-20 max-w-[17ch] self-center text-ink-2">{label}</span>
    </Reveal>
  );
}

/** Up to four supporting numbers in a row, each under an ink rule. They stay ink, so a hero Stat stays the only coloured one. */
export function StatRow({
  stats,
  build,
  start = 200,
}: {
  stats: Array<StatValue & { relative?: StatValue }>;
  build?: BuildProp;
  start?: number;
}) {
  const display = useDisplay();

  return (
    <div className="grid gap-(--gap-column)" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
      {stats.map((s, i) => {
        const v = display === "relative" && s.relative ? s.relative : s;
        const { n, fact } = numberOf(v);

        return (
          <Build key={i} at={stepOf(build, i)} enabled={Boolean(build)}>
            <Reveal delay={build ? 0 : start + i * 150} className="rule-top-ink pt-6">
              <div className={`type-stat ${stats.length <= 3 ? "text-[calc(var(--text-stat-sm)*1.5)]" : "text-stat-sm"}`}>
                <span data-fact={fact}>
                  {v.prefix}
                  <CountUp key={`${display}-${n}`} to={n} delay={start + i * 150 + 200} format={formatLike(n)} />
                </span>
                {v.suffix}
              </div>
              <div className="type-small mt-3 max-w-[22ch] text-ink-2">{v.label}</div>
            </Reveal>
          </Build>
        );
      })}
    </div>
  );
}
