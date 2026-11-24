// npm run build:examples          →  examples/html/<deck>.html for each example deck and the showcase
// npm run build:examples -- --check  →  fails if a committed file differs from a fresh build
//
// These HTML files are committed so anyone can download one and open it in a browser without
// installing anything. Builds are byte-for-byte reproducible, so `--check` (run by `npm run check`)
// catches a committed file that no longer matches its source. Re-run without `--check` and commit.
// These decks are upstream's, and vite.config.ts builds them from upstream's files only (an empty
// library, Tailwind reading only the engine, the blocks and the deck). So the check holds in a team's
// copy too: nothing in src/library, the team's decks or its themes changes these bytes.
// Team decks are not touched: they build to dist/, which stays untracked.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "vite";
import { listDecks } from "../vite.config.ts";

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(root, "examples/html");
const scratch = resolve(root, "dist/.examples");
const checking = process.argv.includes("--check");

/** The decks that ship as committed HTML: everything in examples/, plus the showcase. */
const decks = listDecks().filter((d) => d === "showcase" || existsSync(resolve(root, "examples", d, "index.tsx")));

const stale: string[] = [];
mkdirSync(outDir, { recursive: true });
for (const deck of decks) {
  process.env.DECK = deck;
  try {
    await build({ logLevel: "warn", build: { outDir: resolve(scratch, deck) } });
  } catch (e) {
    console.error(`\n${deck}: ${(e as Error).message.split("\n    at ")[0]}`);
    process.exit(1);
  }
  const fresh = resolve(scratch, deck, "index.html");
  const target = resolve(outDir, `${deck}.html`);
  if (checking) {
    if (!existsSync(target) || !readFileSync(fresh).equals(readFileSync(target))) {
      stale.push(`examples/html/${deck}.html`);
    }
  } else {
    writeFileSync(target, readFileSync(fresh));
    console.log(`examples/html/${deck}.html`);
  }
}
rmSync(scratch, { recursive: true, force: true });

// Files left from decks that no longer exist.
const orphans = readdirSync(outDir).filter((f) => f.endsWith(".html") && !decks.includes(f.slice(0, -5)));
for (const f of orphans) {
  if (checking) {
    stale.push(`examples/html/${f} (no such deck)`);
  } else {
    rmSync(resolve(outDir, f));
    console.log(`removed examples/html/${f} (no such deck)`);
  }
}

if (checking) {
  if (stale.length) {
    console.error(`Out of date with their source:\n  ${stale.join("\n  ")}\nRun \`npm run build:examples\` and commit the result.`);
    process.exit(1);
  }
  console.log(`examples/html: ${decks.length} files match their source`);
}
