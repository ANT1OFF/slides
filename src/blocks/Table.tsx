import type { ReactNode } from "react";
import { Build, Reveal } from "@core";
import { stepOf, type BuildProp } from "./steps.ts";

/**
 * A clean data table. Numeric columns are right-aligned; `highlight` emphasises a row (0-based);
 * `build` reveals the rows one press at a time.
 */
export function Table({
  columns,
  rows,
  highlight,
  strong,
  numeric,
  build,
  start = 200,
}: {
  columns: ReactNode[];
  rows: ReactNode[][];
  highlight?: number;
  /** The column to read (0-based): set in the strong weight, the others in ink-2. */
  strong?: number;
  /** Indexes of columns to right-align with tabular figures; defaults to those whose cells are all numbers. */
  numeric?: number[];
  build?: BuildProp;
  start?: number;
}) {
  const isNum = (c: number) =>
    numeric
      ? numeric.includes(c)
      : rows.every(
          (r) => typeof r[c] === "number" || (typeof r[c] === "string" && /^[\s$€£+\-−]*[\d.,]+\s*[%×kKmMbB]?$/.test(r[c] as string)),
        );
  const align = columns.map((_, c) => (isNum(c) ? "text-right tabular-nums" : "text-left"));
  const cellTone = (c: number) => (strong === undefined || c === 0 ? "" : c === strong ? "weight-strong" : "text-ink-2");
  return (
    <Reveal delay={start} className="rule-top-strong w-full rounded-box bg-surface px-(--pad-box) pt-3 pb-5">
      <table className="type-small w-full border-collapse">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={`type-label py-5 pr-6 text-ink-2 last:pr-0 ${align[i]}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <Build key={i} as="tr" at={stepOf(build, i)} enabled={!!build} className={`rule-top ${highlight === i ? "bg-highlight" : ""}`}>
              {r.map((cell, c) => (
                <td
                  key={c}
                  className={`py-6 pr-6 whitespace-nowrap last:pr-0 ${align[c]} ${cellTone(c)} ${highlight === i ? "weight-strong" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </Build>
          ))}
        </tbody>
      </table>
    </Reveal>
  );
}
