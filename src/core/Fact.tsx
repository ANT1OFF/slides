import { factFormat, formatFact } from "./data.ts";
import type { FactFormat } from "./data.ts";
import { CountUp } from "./motion.tsx";

/**
 * A number read from a data file, on a slide: `<Fact of={tickets.values.total} />` reads 18,400.
 * Formats like `formatFact` (percent, compact, currency, digits, prefix, unit), and `count` counts up
 * to it like `CountUp`. It marks the number as read from data, so `npm run verify`'s facts check
 * doesn't list it as typed by hand. A headline, a chart and the notes that read the same entry can't
 * disagree.
 */
export function Fact({
  of,
  count = false,
  delay = 0,
  className,
  ...format
}: FactFormat & {
  /** The value, from an imported `*.data.json` (or computed from one). */
  of: number;
  /** Count up to it when the slide appears. */
  count?: boolean;
  /** With `count`, ms before it starts. */
  delay?: number;
  className?: string;
}) {
  if (!Number.isFinite(of)) {
    reportError(new Error(`<Fact of={${String(of)}}> has no number: check the key in the data file.`));

    return (
      <span data-fact="missing" className={className}>
        ?
      </span>
    );
  }

  const settled = factFormat(of, format);

  return (
    <span data-fact="" className={className}>
      {count ? <CountUp to={of} delay={delay} format={(n) => formatFact(n, settled)} /> : formatFact(of, settled)}
    </span>
  );
}
