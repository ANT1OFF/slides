// npm run verify  →  opens every built deck in dist/ in headless Chrome, from disk, with the network
// blocked, and checks that it is self-contained. Then it builds its own fixture deck
// (scripts/verify-deck) and checks every key and presenting feature on it, so decks can change freely.
// Run `npm run build` first. Uses your Chrome (or CHROME_PATH), else Playwright's Chromium
// (`npx playwright-core install chromium`).
import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { build } from "vite";
import { listDecks } from "../vite.config.ts";

const dist = resolve(import.meta.dirname, "../dist");
const decks = listDecks();
const built = existsSync(dist) ? readdirSync(dist).filter((f) => f.endsWith(".html")) : [];
const files = built.filter((f) => decks.includes(f.slice(0, -5)));
const stale = built.filter((f) => !files.includes(f));
if (stale.length) console.warn(`Skipping ${stale.join(", ")}: no such deck any more.`);
if (!files.length) {
  console.error("No decks in dist/. Run npm run build first.");
  process.exit(1);
}

const CHROMES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean) as string[];
const executablePath = CHROMES.find((p) => existsSync(p));

const results: { deck: string; name: string; ok: boolean; detail?: string }[] = [];
let deckName = "";
const check = (name: string, ok: unknown, detail = "") => results.push({ deck: deckName, name, ok: !!ok, detail });

/** A context that refuses every request that isn't the file itself or inline data. */
async function offline(browser: Browser): Promise<{ ctx: BrowserContext; blocked: string[] }> {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const blocked: string[] = [];
  await ctx.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("file:") || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    blocked.push(url);
    return route.abort();
  });
  // Let P print without a dialog, and count the calls.
  await ctx.addInitScript(() => {
    const w = window as unknown as { __printed: number };
    w.__printed = 0;
    window.print = () => {
      w.__printed++;
      setTimeout(() => dispatchEvent(new Event("afterprint")), 50);
    };
  });
  return { ctx, blocked };
}

/** Self-contained: no network, every font face loaded, every image and media element loaded. */
async function selfContained(browser: Browser, file: string) {
  const { ctx, blocked } = await offline(browser);
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(`file://${file.startsWith("/") ? file : resolve(dist, file)}#1`);
  await page.waitForTimeout(400);
  // Open the overview: every slide renders at once, so every font, image and video is requested.
  await page.keyboard.press("g");
  await page.waitForTimeout(1500);
  const report = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [...document.fonts].map((f) => ({ family: f.family, status: f.status }));
    const used = new Set<string>();
    for (const el of document.querySelectorAll("[data-stage] *"))
      used.add(getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim());
    const images = [...document.images].map((img) => ({ src: img.currentSrc.slice(0, 40), ok: img.complete && img.naturalWidth > 0 }));
    const media = [...document.querySelectorAll<HTMLMediaElement>("video, audio")];
    await Promise.all(
      media.map((m) =>
        m.readyState >= 2 ? null : new Promise((r) => (m.addEventListener("loadeddata", r, { once: true }), setTimeout(r, 3000))),
      ),
    );
    return {
      faces,
      used: [...used],
      images,
      media: media.map((m) => ({ tag: m.tagName, ok: m.readyState >= 2 && !m.error, inline: m.currentSrc.startsWith("data:") })),
    };
  });
  check("no network requests", blocked.length === 0, blocked.slice(0, 3).join(" "));
  const embedded = report.faces.filter((f) => report.used.includes(f.family));
  check(
    "every font the slides use is embedded and loaded",
    report.used.every(
      (fam) =>
        /^(ui-|system-ui|-apple-system|sans-serif|serif|monospace)/.test(fam) ||
        embedded.some((f) => f.family === fam && f.status === "loaded"),
    ),
    `${report.used.join(", ")} | ${report.faces.map((f) => `${f.family}:${f.status}`).join(", ")}`,
  );
  check(
    "every image loads",
    report.images.every((i) => i.ok),
    `${report.images.filter((i) => !i.ok).length} of ${report.images.length} failed`,
  );
  check(
    "every video and audio loads from inline data",
    report.media.every((m) => m.ok && m.inline),
    JSON.stringify(report.media),
  );
  // No slide's content is taller than its Frame body (it would push the footer off or crowd the title).
  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-deck-mode=overview] [data-frame-body]")]
      .filter((b) => b.scrollHeight > b.clientHeight + 2)
      .map((b) => b.closest("[data-slide]")?.getAttribute("data-slide-id") ?? "?"),
  );
  const broken = await page.locator("[data-deck-mode=overview] [data-broken]").count();
  check("no broken library slides (every prop needs a default)", broken === 0, `${broken} broken`);
  check("every slide's content fits its Frame", overflowing.length === 0, `too tall: ${overflowing.join(", ")}`);
  // React's licence and a licence for every font file the deck can embed (the build lists them).
  const notices = (await page.locator("#third-party-notices").textContent()) ?? "";
  check("React's MIT notice is in the file", /MIT License[\s\S]*Meta Platforms/.test(notices));
  const unlicensed = [...notices.matchAll(/^(.+): NO LICENCE FILE$/gm)].map((m) => m[1]);
  check(
    "every embedded font file has a licence in the file",
    notices.includes("Embedded font files and their licences:") && unlicensed.length === 0,
    unlicensed.map((f) => `${f} has no licence file next to it`).join("; "),
  );
  check("no page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Every key and feature, against the fixture deck (an absolute path). */
async function features(browser: Browser, file: string) {
  const { ctx } = await offline(browser);
  const page: Page = await ctx.newPage();
  const sel = "[data-deck-mode=present] [data-slide]";
  const slideNo = () => page.getAttribute(sel, "data-slide").then(Number);
  const build = () => page.getAttribute(sel, "data-build").then(Number);
  const builds = () => page.getAttribute(sel, "data-build-count").then(Number);
  const key = async (k: string, wait = 150) => {
    await page.keyboard.press(k);
    await page.waitForTimeout(wait);
  };
  const go = async (n: number, wait = 300) => {
    await page.evaluate((i) => (location.hash = `#${i}`), n);
    await page.waitForTimeout(wait);
  };
  const slideOf = (id: string) =>
    page.evaluate((id) => Number(document.querySelector(`[data-slide-id="${id}"]`)?.getAttribute("data-slide")), id);
  const blanks = async () => (await page.locator("div.fixed.inset-0.bg-black").count()) - 1;

  await page.goto(`file://${file}`);
  await page.waitForTimeout(600);
  // Slide numbers by id, from the overview, so the checks don't depend on the deck's order.
  await key("g", 400);
  const at = {
    bullets: await slideOf("Bullets"),
    code: await slideOf("Code"),
    stat: await slideOf("Stat"),
    hidden: await slideOf("hidden"),
    end: await slideOf("EndSlide"),
    total: await page.locator("[data-deck-mode=overview] [data-slide]").count(),
  };
  await key("Escape", 200);

  check("opens on slide 1", (await slideNo()) === 1);
  await key("ArrowRight");
  check("→ next slide", (await slideNo()) === 2);
  await key("ArrowLeft");
  check("← previous slide", (await slideNo()) === 1);
  await key("Space");
  check("Space next", (await slideNo()) === 2);
  await key("PageDown");
  check("PageDown next", (await slideNo()) === 3);
  await key("PageUp");
  await key("ArrowUp");
  check("PageUp and ↑ previous", (await slideNo()) === 1);
  await key("ArrowDown");
  check("↓ next", (await slideNo()) === 2);
  await key("End");
  check("End → last slide", (await slideNo()) === at.end);
  await key("Home");
  check("Home → first slide", (await slideNo()) === 1);
  for (const d of String(at.bullets)) await key(d, 50);
  await key("Enter");
  check("a number then Enter jumps there", (await slideNo()) === at.bullets);

  check("build steps are counted (Bullets build)", (await builds()) === 3, String(await builds()));
  await key("ArrowRight");
  check("→ shows the next build step before moving on", (await slideNo()) === at.bullets && (await build()) === 1);
  await key("ArrowRight");
  await key("ArrowRight", 800);
  const opacities = await page.$$eval(`${sel} .build`, (els) => els.map((e) => getComputedStyle(e).opacity));
  check(
    "every build step visible after 3 presses",
    opacities.every((o) => Number(o) > 0.9),
    opacities.join(","),
  );
  await key("ArrowRight");
  check("after the last step → next slide", (await slideNo()) === at.bullets + 1);
  await key("ArrowLeft");
  check("← back lands with every step shown", (await slideNo()) === at.bullets && (await build()) === 3);

  await go(at.code);
  check("the URL hash opens a slide", (await slideNo()) === at.code);
  check("the URL hash follows the slide", (await page.evaluate(() => location.hash)) === `#${at.code}`);
  check("Code's highlight steps are counted", (await builds()) === 3);

  await go(at.hidden - 1);
  for (let k = 0; k < 6 && (await slideNo()) === at.hidden - 1; k++) await key("ArrowRight");
  check("a hidden slide is skipped when presenting", (await slideNo()) === at.end, `at ${await slideNo()}`);
  await go(at.bullets);
  check("the footer shows the slide number", (await page.textContent(`${sel} footer`))?.includes(String(at.bullets).padStart(2, "0")));

  await key("Home");
  await page.mouse.click(1400, 450);
  await page.waitForTimeout(200);
  check("click on the right → next", (await slideNo()) === 2);
  await page.mouse.click(100, 450);
  await page.waitForTimeout(200);
  check("click on the left → back", (await slideNo()) === 1);

  await key("f", 500);
  check("F → fullscreen", await page.evaluate(() => !!document.fullscreenElement));
  await key("f", 500);
  check("F again leaves fullscreen", await page.evaluate(() => !document.fullscreenElement));

  await key("g", 300);
  check("G opens the overview", (await page.locator("[data-deck-mode=overview]").count()) === 1);
  const greyed = await page.locator("[data-deck-mode=overview] button.opacity-40").count();
  check("the overview shows every slide, the hidden one greyed", at.total > 5 && greyed === 1, `${at.total} slides, ${greyed} greyed`);
  await page.locator("[data-deck-mode=overview] [data-slide]").nth(4).click();
  await page.waitForTimeout(300);
  check(
    "clicking a thumbnail jumps there and closes",
    (await page.locator("[data-deck-mode=overview]").count()) === 0 && (await slideNo()) === 5,
  );
  await key("g", 200);
  await key("Escape", 200);
  check("Esc closes the overview", (await page.locator("[data-deck-mode=overview]").count()) === 0);

  await key("Shift+G", 300);
  check("capital G (Shift or Caps Lock) opens the overview too", (await page.locator("[data-deck-mode=overview]").count()) === 1);
  await key("Escape", 200);

  await key("?", 200);
  check("? lists the keys", await page.getByText("Blank the screen").isVisible());
  await key("Escape", 200);
  check("Esc closes the list", (await page.getByText("Blank the screen").count()) === 0);

  await key("b", 200);
  check("B blanks the screen", (await blanks()) === 1);
  const before = await slideNo();
  await key("ArrowRight", 200);
  check("any key unblanks without moving", (await blanks()) === 0 && (await slideNo()) === before);
  await key(".", 200);
  check(". blanks too", (await blanks()) === 1);
  await key(".", 200);

  await go(at.stat, 2600);
  const abs = (await page.textContent(sel)) ?? "";
  await key("m", 2600);
  const rel = (await page.textContent(sel)) ?? "";
  check("M switches numbers to growth", abs !== rel && rel.includes("81"), `${abs.slice(0, 50)} | ${rel.slice(0, 50)}`);
  await key("m", 300);

  const [popup] = await Promise.all([page.waitForEvent("popup"), key("n", 100)]);
  await popup.waitForTimeout(1000);
  check("N opens the presenter window", (await popup.title()).startsWith("Presenter"));
  const from = await slideNo();
  await popup.keyboard.press("ArrowRight");
  await popup.waitForTimeout(300);
  check("presenter keys drive the deck", (await slideNo()) === from + 1);
  await go(1, 500);
  const pres = (await popup.textContent("[data-deck-mode=presenter]")) ?? "";
  check("the presenter follows the deck and shows notes", pres.includes("Now · 1 /") && pres.includes("Notes are plain strings"));
  check("the presenter shows the next slide and timers", pres.includes("Next") && pres.includes("Elapsed") && pres.includes("Clock"));
  await popup.waitForTimeout(1500);
  await popup.keyboard.press("r");
  await popup.waitForTimeout(200);
  check("R resets the timer", (await popup.textContent("[data-deck-mode=presenter]"))?.includes("00:00"));
  // A message from any other window is ignored.
  await page.evaluate(() => window.postMessage({ type: "slides:nav", dir: 1 }, "*"));
  await page.waitForTimeout(200);
  check("messages from other windows are ignored", (await slideNo()) === 1);

  await key("p", 100);
  const pages = await page.locator(".print-page").count();
  check("P puts every visible slide on its own page", pages === at.total - 1, `${pages} pages`);
  await page.waitForTimeout(1500);
  check("P opens the print dialog", (await page.evaluate(() => (window as unknown as { __printed: number }).__printed)) === 1);
  check("back to the deck after printing", (await page.locator("[data-deck-mode=present]").count()) === 1);

  await page.goto(`file://${file}?display=relative#${at.stat}`);
  await page.waitForTimeout(2600);
  check("?display=relative opens in growth mode", (await page.textContent(sel))?.includes("81"));

  const reduced = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1600, height: 900 } });
  const rp = await reduced.newPage();
  await rp.goto(`file://${file}#${await slideOf("Flow")}`);
  await rp.waitForTimeout(400);
  const travellers = await rp.evaluate(
    () =>
      [...document.querySelectorAll("[data-deck-mode=present] animateMotion")].filter(
        (a) => getComputedStyle(a.parentElement!).display !== "none",
      ).length,
  );
  check("reduced motion hides looping travellers", travellers === 0, `${travellers} visible`);
  await reduced.close();
  await ctx.close();
}

const browser = await chromium.launch(executablePath ? { executablePath } : {});
for (const file of files) {
  deckName = file;
  await selfContained(browser, file);
}
// The team library, as one deck: every library slide must render offline without errors or overflow.
process.env.DECK = "library";
process.env.DECK_FILE = resolve(import.meta.dirname, "../src/library-view.tsx");
await build({ logLevel: "warn", configFile: resolve(import.meta.dirname, "../vite.config.ts") });
deckName = "library view (src/library/slides)";
await selfContained(browser, resolve(dist, ".library/index.html"));
rmSync(resolve(dist, ".library"), { recursive: true, force: true });

// The fixture deck: built here, checked, removed.
process.env.DECK = "verify";
process.env.DECK_FILE = resolve(import.meta.dirname, "verify-deck/index.tsx");
await build({ logLevel: "warn", configFile: resolve(import.meta.dirname, "../vite.config.ts") });
const fixture = resolve(dist, ".verify/index.html");
deckName = "verify-deck (fixture)";
await selfContained(browser, fixture);
await features(browser, fixture);
rmSync(resolve(dist, ".verify"), { recursive: true, force: true });
await browser.close();

let deck = "";
for (const r of results) {
  if (r.deck !== deck) console.log(`\n${(deck = r.deck)}`);
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${!r.ok && r.detail ? `  (${r.detail})` : ""}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
