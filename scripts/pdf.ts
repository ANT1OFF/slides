// npm run pdf [deck…]  →  dist/<deck>.pdf, one 1920×1080 page per visible slide, in its final state
// (builds, animation and loops off: the same as pressing P and saving as PDF). Builds the deck first
// if dist/<deck>.html is missing or older than the source; runs offline. Uses your Chrome (or
// CHROME_PATH), else Playwright's Chromium (`npx playwright-core install chromium`).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import { listDecks } from "../vite.config.ts";
import { chromePath } from "./chrome.ts";
import { exportPdf, inspectPdf } from "./pdf-export.ts";

const root = resolve(import.meta.dirname, "..");
const known = listDecks();
const named = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const unknown = named.filter((d) => !known.includes(d));
if (known.length === 0 || unknown.length > 0) {
  console.error(
    unknown.length > 0 ? `No such deck: ${unknown.join(", ")}. Decks: ${known.join(", ")}` : "No decks yet. Start one: npm run new my-talk",
  );
  process.exit(1);
}
const decks = named.length > 0 ? named : known;

// Build what is missing or stale (older than anything under src/), so the PDF is never of old slides.
const newest = (dir: string) =>
  Math.max(
    0,
    ...readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => statSync(resolve(f.parentPath, f.name)).mtimeMs),
  );
const sourceTime = Math.max(newest(resolve(root, "src")), statSync(resolve(root, "index.html")).mtimeMs);
const stale = decks.filter((d) => {
  const html = resolve(root, "dist", `${d}.html`);
  return !existsSync(html) || statSync(html).mtimeMs < sourceTime;
});
if (stale.length > 0) {
  console.log(`Building ${stale.join(", ")}…`);
  const built = spawnSync("npm", ["run", "build", "--silent", "--", ...stale], { cwd: root, stdio: "inherit" });
  if (built.status !== 0) {
    process.exit(built.status ?? 1);
  }
}

let executablePath: string | undefined;
try {
  executablePath = chromePath();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
let browser;
try {
  browser = await chromium.launch(executablePath ? { executablePath } : {});
} catch {
  console.error(
    "Chrome not found. Install Google Chrome or Chromium, or point CHROME_PATH at it\n" +
      "(e.g. CHROME_PATH=/path/to/chrome npm run pdf), or run: npx playwright-core install chromium",
  );
  process.exit(1);
}

let failed = false;
for (const deck of decks) {
  const out = resolve(root, "dist", `${deck}.pdf`);
  try {
    const slides = await exportPdf(browser, resolve(root, "dist", `${deck}.html`), out);
    const { pages } = inspectPdf(readFileSync(out));
    if (pages !== slides) {
      throw new Error(`${slides} slides but ${pages} pages in the PDF`);
    }
    console.log(`dist/${deck}.pdf  (${pages} page${pages === 1 ? "" : "s"})`);
  } catch (error) {
    failed = true;
    console.error(`${deck}: ${(error as Error).message}`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
