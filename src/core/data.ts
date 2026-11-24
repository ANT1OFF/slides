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
