// Finding Chrome, shared by verify.ts and pdf.ts. CHROME_PATH wins; else the usual install paths.
import { existsSync } from "node:fs";

const CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

/** The Chrome to drive, or undefined to let Playwright use its own Chromium (`npx playwright-core install chromium`). */
export function chromePath(): string | undefined {
  const own = process.env.CHROME_PATH;
  if (own) {
    if (!existsSync(own)) throw new Error(`CHROME_PATH is set to ${own}, but nothing is there.`);
    return own;
  }
  return CHROMES.find((p) => existsSync(p));
}
