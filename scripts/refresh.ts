// npm run refresh [deck] [--shared]  →  refreshes the data behind the slides.
// With a deck named: the *.data.json files in its folder (add --shared for src/library's too).
// With none: every deck in src/decks and src/library (upstream's examples only when named).
//   script  runs its `how` command, which rewrites the file (values and `updated`)
//   agent   lists it with its `how`: retrieval instructions for an agent (or you) to follow
//   manual  lists it with its `how`: who or what to ask
// and flags anything older than its `staleAfter` days (default 180). Nothing here runs at deck time:
// the build bakes the values into the HTML. `how` is run as a shell command, so review it like code.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import type { DataFile } from "../src/core/data.ts";
import { deckDir, listDecks } from "../vite.config.ts";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const deck = args.find((a) => !a.startsWith("--"));
const shared = args.includes("--shared");
if (deck && !listDecks().includes(deck)) {
  console.error(`No such deck: ${deck}. Decks: ${listDecks().join(", ")}`);
  process.exit(1);
}
const dirs = deck
  ? [deckDir(deck), ...(shared ? [resolve(root, "src/library")] : [])]
  : ["src/decks", "src/library"].map((d) => resolve(root, d));

const files = dirs.flatMap((dir) =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith(".data.json"))
        .map((e) => resolve(e.parentPath, e.name))
    : [],
);
if (!files.length) {
  console.log("No *.data.json files found.");
  process.exit(0);
}

/** Reads a data file, or says what's wrong with it. */
function read(file: string): DataFile | string {
  let d: Partial<DataFile>;
  try {
    d = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return `not valid JSON (${(e as Error).message})`;
  }
  if (!["script", "agent", "manual"].includes(d.source as string)) return `"source" must be "script", "agent" or "manual"`;
  if (typeof d.how !== "string" || !d.how.trim()) return `"how" must say how to get the values`;
  if (typeof d.updated !== "string" || !/^\d{4}-\d\d-\d\d$/.test(d.updated) || Number.isNaN(Date.parse(d.updated)))
    return `"updated" must be a date like 2026-11-24`;
  return d as DataFile;
}
const lastLine = (text: string) => text.trim().split("\n").filter(Boolean).pop() ?? "";
const age = (d: DataFile) => Math.floor((Date.now() - Date.parse(`${d.updated}T00:00:00Z`)) / 86_400_000);

const todo: string[] = [];
let failed = 0;
for (const file of files) {
  const name = relative(root, file);
  const data = read(file);
  if (typeof data === "string") {
    failed++;
    console.log(`  INVALID    ${name}: ${data}`);
    continue;
  }
  if (data.source === "script") {
    const before = readFileSync(file, "utf8");
    try {
      execSync(data.how, { cwd: root, stdio: "pipe" });
      const after = read(file);
      if (typeof after === "string") throw Object.assign(new Error(`the script left the file broken: ${after}`), { restore: true });
      if (after.updated === data.updated) console.log(`  UNCHANGED  ${name}: the script ran but didn't update "updated"`);
      else console.log(`  refreshed  ${name}  (updated ${after.updated})`);
    } catch (e) {
      failed++;
      writeFileSync(file, before); // whatever the script wrote, the old values stay
      const err = e as { stderr?: Buffer; message?: string };
      console.log(
        `  FAILED     ${name}: ${data.how}\n             ${lastLine(String(err.stderr ?? "")) || err.message}\n             The old values are kept.`,
      );
    }
    continue;
  }
  const days = age(data);
  const stale = days > (data.staleAfter ?? 180);
  todo.push(
    `  ${data.source.padEnd(7)} ${name}  (updated ${data.updated}, ${days} days ago${stale ? ", STALE" : ""})\n           ${data.how}`,
  );
}

if (todo.length) console.log(`\nNeeds an agent or a person (follow "how", update the values and "updated"):\n${todo.join("\n")}`);
if (deck && !shared) console.log(`\nOnly ${deck}'s own data. Data in src/library that its slides use: npm run refresh ${deck} --shared`);
console.log(`\nThen: npm run build${deck ? ` ${deck}` : ""} && npm run verify`);
process.exit(failed ? 1 : 0);
