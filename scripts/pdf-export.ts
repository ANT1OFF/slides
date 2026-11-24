// The PDF export used by `npm run pdf` and by verify: a built deck, opened from disk in headless Chrome
// with the network blocked, printed through the deck's own print path (P: one 1920×1080 page per visible
// slide, final state, animation off) to a PDF.
import { writeFileSync } from "node:fs";
import type { Browser } from "playwright-core";

/** Open the built deck at `file` offline, print it to `out`, and return the number of pages. */
export async function exportPdf(browser: Browser, file: string, out: string): Promise<number> {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  try {
    const blocked: Array<string> = [];
    await ctx.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith("file:") || url.startsWith("data:") || url.startsWith("blob:")) {
        return route.continue();
      }
      blocked.push(url);
      return route.abort();
    });
    // Press P as a presenter would, but keep the print view: window.print does nothing here, and
    // `afterprint` (which would return to the deck) never fires.
    await ctx.addInitScript(() => {
      window.print = () => {};
    });
    const page = await ctx.newPage();
    const errors: Array<string> = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`file://${file}`);
    await page.waitForSelector("[data-deck-mode=present]");
    await page.keyboard.press("p");
    await page.waitForSelector("[data-deck-mode=print]");
    // Every font face loaded (they are embedded in the file), then every image and video frame.
    const unready = await page.evaluate(async () => {
      await document.fonts.ready;
      const faces = [...document.fonts].filter((f) => f.status !== "loaded");
      for (const f of faces) {
        await f.load().catch(() => {});
      }
      await Promise.all(
        [...document.images].map((i) =>
          i.complete
            ? null
            : new Promise((ready) => {
                i.addEventListener("load", ready);
                i.addEventListener("error", ready);
              }),
        ),
      );
      return [...document.fonts].flatMap((f) => (f.status === "loaded" ? [] : [f.family]));
    });
    if (unready.length > 0) {
      throw new Error(`fonts did not load: ${[...new Set(unready)].join(", ")}`);
    }
    await page.waitForTimeout(300);
    const slides = await page.locator(".print-page").count();
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    if (blocked.length > 0) {
      throw new Error(`the deck asked for the network: ${blocked.slice(0, 3).join(" ")}`);
    }
    if (errors.length > 0) {
      throw new Error(`page errors: ${errors.join(" | ")}`);
    }
    writeFileSync(out, pdf);
    return slides;
  } finally {
    await ctx.close();
  }
}

/** A PDF's page count and first page size, in PDF points. */
export interface PdfInfo {
  pages: number;
  width: number;
  height: number;
}

/** Page count and first page size (in PDF points) read from the file itself; no PDF library needed. */
export function inspectPdf(pdf: Buffer): PdfInfo {
  const text = pdf.toString("latin1");
  const pages = Math.max(0, ...[...text.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(?<count>\d+)/gu)].map((m) => Number(m.groups?.count)));
  const box = /\/MediaBox\s*\[\s*0\s+0\s+(?<width>[\d.]+)\s+(?<height>[\d.]+)\s*\]/u.exec(text);
  return { pages, width: Number(box?.groups?.width ?? 0), height: Number(box?.groups?.height ?? 0) };
}
