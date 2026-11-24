// npm run build [deck…]  →  dist/<deck>.html, one self-contained file per deck (all decks if none named).
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { build } from "vite";
import { listDecks } from "../vite.config.ts";

const named = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const known = listDecks();
if (!known.length) {
  console.error("No decks yet. Start one: npm run new my-talk");
  process.exit(1);
}
const unknown = named.filter((d) => !known.includes(d));
if (unknown.length) {
  console.error(`No such deck: ${unknown.join(", ")}. Decks: ${known.join(", ")}`);
  process.exit(1);
}

mkdirSync("dist", { recursive: true });
// Building every deck also removes files left from decks that no longer exist.
if (!named.length) {
  for (const f of readdirSync("dist")) {
    if (f.endsWith(".html") && !known.includes(f.slice(0, -5))) {
      rmSync(`dist/${f}`);
      console.log(`removed dist/${f} (no such deck)`);
    }
  }
}
for (const deck of named.length ? named : known) {
  process.env.DECK = deck;
  try {
    await build({ logLevel: "warn" });
  } catch (e) {
    console.error(`\n${deck}: ${(e as Error).message.split("\n    at ")[0]}`);
    process.exit(1);
  }
  renameSync(`dist/.${deck}/index.html`, `dist/${deck}.html`);
  rmSync(`dist/.${deck}`, { recursive: true });
  console.log(`dist/${deck}.html  ${Math.round(statSync(`dist/${deck}.html`).size / 1024)} KB`);
}
