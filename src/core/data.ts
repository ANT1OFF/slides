/**
 * Data with its provenance: where the numbers on a slide came from, so they can be refreshed later
 * by a script, an agent or a person. Keep it in a `*.data.json` file next to the deck or library
 * slide that uses it, and import it: the build bakes the values in; nothing is fetched at runtime.
 * `npm run refresh` runs the script sources and lists the rest.
 */
export interface DataFile<T = unknown> {
  /** script: `how` is a command that rewrites this file. agent: `how` says how to look the values up.
   *  manual: `how` says who or what to ask. */
  source: "script" | "agent" | "manual";
  how: string;
  /** When the values were last refreshed, as an ISO date (2026-11-24). */
  updated: string;
  /** Days after which `npm run refresh` reports the file as stale. Default 180. */
  staleAfter?: number;
  values: T;
}

/** "As of 24 Nov 2026", optionally with a source note, for a slide footer or caption. */
export function asOf(data: Pick<DataFile, "updated">, note?: string): string {
  const date = new Date(`${data.updated}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return note ? `As of ${date} · ${note}` : `As of ${date}`;
}

/**
 * How a fact reads on screen. `number` (the default) prints 18,400. `percent` prints a ratio as a
 * percentage (0.94 is 94%); for a value that is already in percent, use `unit: "%"`. `compact`
 * prints 18.4K, 3.3M. `currency` (an ISO code, "USD") adds the currency sign and works with each.
 */
export interface FactFormat {
  format?: "number" | "percent" | "compact";
  currency?: string;
  /** Digits after the decimal point. Default: as many as the value has (none for percent; up to one for compact). */
  digits?: number;
  /** Text before the number: "~", "+". */
  prefix?: string;
  /** Text after the number: "%", "h", " min", "×". */
  unit?: string;
}

/** The digits after the point that `value` has, as written. */
const digitsOf = (value: number) => (Number.isInteger(value) ? 0 : (String(value).split(".")[1]?.length ?? 0));

/** The default digits: none for percent, up to one for compact (-1), else as many as the value has. */
function defaultDigits(value: number, format: FactFormat["format"]): number {
  if (format === "percent") {
    return 0;
  }

  if (format === "compact") {
    return -1;
  }

  return digitsOf(value);
}

/**
 * The number options for `value`, with digits settled, so a count up to it keeps the same width.
 * Exported for `<Fact count>`.
 */
export function factFormat(value: number, f: FactFormat = {}): FactFormat & { digits: number } {
  return { ...f, digits: f.digits ?? defaultDigits(value, f.format) };
}

/**
 * A number from a data file as text, for notes and string props: `formatFact(0.94, { format: "percent" })`
 * is "94%". On a slide, use `<Fact of={…}>`, which formats the same way and marks the number as read
 * from data for `npm run verify`'s facts check.
 */
export function formatFact(value: number, f: FactFormat = {}): string {
  const { digits, format, currency, prefix = "", unit = "" } = factFormat(value, f);

  const options: Intl.NumberFormatOptions =
    digits < 0 ? { maximumFractionDigits: 1 } : { minimumFractionDigits: digits, maximumFractionDigits: digits };

  if (format === "percent") {
    options.style = "percent";
  } else if (currency) {
    options.style = "currency";
    options.currency = currency;
  }

  if (format === "compact") {
    options.notation = "compact";
  }

  return `${prefix}${value.toLocaleString("en-US", options)}${unit}`;
}
