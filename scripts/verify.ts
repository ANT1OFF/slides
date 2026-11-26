// npm run verify  →  opens every built deck in dist/ in headless Chrome, from disk, with the network
// blocked, and checks that it is self-contained. Then it builds its own fixture deck
// (scripts/verify-deck) and checks every key and presenting feature on it, so decks can change freely.
// A second fixture (verify-deck/motion.tsx, with verify-deck/library as the team library) checks
// effects, slide transitions and team CSS in three modes: motion, reduced motion, no View Transitions.
// A third (verify-deck/morph.tsx) checks <Morph> and every built-in transition, forwards and back, in
// the same three modes, and saves a picture of each one in mid-flight to dist/qa/transitions.
// The team library itself is built as a deck (src/library-view.tsx) and must render: its slides, its
// blocks' examples and its motion. The same view of the fixture library checks that a broken block is caught.
// Run `npm run build` first. Uses your Chrome (or CHROME_PATH), else Playwright's Chromium
// (`npx playwright-core install chromium`).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { chromium } from "playwright-core";
import type { Browser, BrowserContext, Page } from "playwright-core";
import { build as viteBuild } from "vite";
import { listDecks } from "../vite.config.ts";
import { deckTheme } from "../vite/themes.ts";
import { chromePath } from "./chrome.ts";
import { errorMessage } from "./error-message.ts";
import { exportPdf, inspectPdf } from "./pdf-export.ts";

const dist = resolve(import.meta.dirname, "../dist");
const decks = listDecks();
const built = existsSync(dist) ? readdirSync(dist).filter((f) => f.endsWith(".html")) : [];
const files = built.filter((f) => decks.includes(f.slice(0, -5)));
const stale = built.filter((f) => !files.includes(f));

if (stale.length > 0) {
  console.warn(`Skipping ${stale.join(", ")}: no such deck any more.`);
}

if (files.length === 0) {
  console.error("No decks in dist/. Run npm run build first.");
  process.exit(1);
}

const executablePath = chromePath();

const results: Array<{ deck: string; name: string; ok: boolean; detail?: string }> = [];
let deckName = "";
const check = (name: string, ok: unknown, detail = "") => results.push({ deck: deckName, name, ok: Boolean(ok), detail });

/** A context that refuses every request that isn't the file itself or inline data. */
async function offline(browser: Browser, reducedMotion = false): Promise<{ ctx: BrowserContext; blocked: Array<string> }> {
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    reducedMotion: reducedMotion ? "reduce" : "no-preference",
  });

  const blocked: Array<string> = [];
  await ctx.route("**/*", (route) => {
    const url = route.request().url();

    if (url.startsWith("file:") || url.startsWith("data:") || url.startsWith("blob:")) {
      return route.continue();
    }

    blocked.push(url);

    return route.abort();
  });
  // Let P print without a dialog, and count the calls.
  await ctx.addInitScript(() => {
    // SAFETY: `printed` is this script's own counter on the window, set before the page runs.
    const w = window as Window & { printed?: number };
    w.printed = 0;
    window.print = () => {
      w.printed = (w.printed ?? 0) + 1;
      setTimeout(() => {
        dispatchEvent(new Event("afterprint"));
      }, 50);
    };
  });

  return { ctx, blocked };
}

/**
 * The slides in the open overview whose content doesn't fit, as "id (slide n)": a Frame body
 * (FrameBody, data-frame-body) taller than the space it has, which pushes into the footer or crowds
 * the title, or anything on the slide taller than the 1920×1080 stage.
 */
function tooTall(page: Page): Promise<Array<string>> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-deck-mode=overview] [data-slide]")].flatMap((s) =>
      [...s.querySelectorAll<HTMLElement>("[data-frame-body]")].some((b) => b.scrollHeight > b.clientHeight + 2) ||
      [...s.querySelectorAll<HTMLElement>("[data-stage] > *, [data-stage] section")].some((el) => el.scrollHeight > 1080 + 2)
        ? [`${s.dataset.slideId} (slide ${s.dataset.slide})`]
        : [],
    ),
  );
}

/**
 * Self-contained: no network, every font face loaded, every image and media element loaded.
 * `morphIds: false` skips the check for a Morph id used twice on a slide, for the fixture that does it on purpose.
 */
async function selfContained(browser: Browser, file: string, morphIds = true) {
  const { ctx, blocked } = await offline(browser);
  const page = await ctx.newPage();
  const errors: Array<string> = [];
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

    for (const el of document.querySelectorAll("[data-stage] *")) {
      used.add(getComputedStyle(el).fontFamily.split(",")[0].replaceAll(/["']/gu, "").trim());
    }

    const images = [...document.images].map((img) => ({ src: img.currentSrc.slice(0, 40), ok: img.complete && img.naturalWidth > 0 }));
    const media = [...document.querySelectorAll<HTMLMediaElement>("video, audio")];
    await Promise.all(
      media.map((m) =>
        m.readyState >= 2
          ? null
          : new Promise((ready) => {
              m.addEventListener("loadeddata", ready, { once: true });
              setTimeout(ready, 3000);
            }),
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
        /^(?:ui-|system-ui|-apple-system|sans-serif|serif|monospace)/u.test(fam) ||
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
  const overflowing = await tooTall(page);
  const broken = await page.$$eval("[data-deck-mode=overview] [data-broken]", (els) => els.map((e) => e.dataset.broken));
  check(
    "nothing in the library is broken (slides need a default for every prop; a block's example must render)",
    broken.length === 0,
    broken.join(", "),
  );
  check("every slide's content fits (its Frame body, and the stage)", overflowing.length === 0, `too tall: ${overflowing.join(", ")}`);

  if (morphIds) {
    const twice = await page.$$eval("[data-deck-mode=overview] [data-slide]", (slides) =>
      slides.flatMap((s) => {
        const ids = [...s.querySelectorAll<HTMLElement>("[data-morph]")].map((m) => m.dataset.morph);

        return ids.some((id, i) => ids.indexOf(id) !== i) ? [`${s.dataset.slideId} (slide ${s.dataset.slide})`] : [];
      }),
    );

    check("a Morph id is used once per slide (two can't share a name, so neither would morph)", twice.length === 0, twice.join(", "));
  }

  // React's licence and a licence for every font file the deck can embed (the build lists them).
  const notices = (await page.locator("#third-party-notices").textContent()) ?? "";
  check("React's MIT notice is in the file", /MIT License[\s\S]*Meta Platforms/u.test(notices));
  const unlicensed = [...notices.matchAll(/^.+(?=: NO LICENCE FILE$)/gmu)].map((m) => m[0]);
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
    page.evaluate((slideId) => Number(document.querySelector<HTMLElement>(`[data-slide-id="${slideId}"]`)?.dataset.slide), id);

  const blanks = async () => (await page.locator("div.fixed.inset-0.bg-black").count()) - 1;

  await page.goto(`file://${file}`);
  await page.waitForTimeout(600);
  // Slide numbers by id, from the overview, so the checks don't depend on the deck's order.
  await key("g", 400);

  const at = {
    bullets: await slideOf("Bullets"),
    code: await slideOf("Code"),
    tokenize: await slideOf("Tokenize"),
    stat: await slideOf("Stat"),
    spectrumZero: await slideOf("Spectrum-0"),
    spectrumDelayed: await slideOf("Spectrum-3"),
    hidden: await slideOf("hidden"),
    end: await slideOf("EndSlide"),
    total: await page.locator("[data-deck-mode=overview] [data-slide]").count(),
  };

  await key("Escape", 200);

  check("opens on slide 1", (await slideNo()) === 1);
  const extras = () => page.textContent("[data-deck-overlay] #extras");
  check("the deck's overlay is drawn once, over the stage", (await page.locator("#extras").count()) === 1 && Boolean(await extras()));
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

  for (const d of String(at.bullets)) {
    await key(d, 50);
  }

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

  for (const [start, slide] of [
    [0, at.spectrumZero],
    [3, at.spectrumDelayed],
  ] as const) {
    await go(slide);
    const total = await builds();
    const visible = () => page.locator(`${sel} .build-on`).count();
    const seen = [await visible()];

    for (let i = 1; i <= start + 2; i++) {
      await key("ArrowRight");
      seen.push(await visible());
    }

    // Each tier has a dot and a label on the same step, then the floor gets its own step.
    const expected = [...Array.from({ length: start }, () => 0), 2, 4, 5];
    check(
      `Spectrum build={${start}} sequences tiers and floor`,
      total === start + 2 && (await slideNo()) === slide && seen.join(",") === expected.join(","),
      `build count ${total}; revealed elements by step: ${seen.join(", ")}`,
    );
  }

  await go(at.code);
  check("the URL hash opens a slide", (await slideNo()) === at.code);
  check("the URL hash follows the slide", (await page.evaluate(() => location.hash)) === `#${at.code}`);
  check("Code's highlight steps are counted", (await builds()) === 3);
  await go(at.bullets);
  await page.evaluate((n) => (location.hash = `#${n}.2`), at.bullets);
  await page.locator(`${sel}[data-build="2"]`).waitFor();
  check("hashchange opens a build step", (await slideNo()) === at.bullets && (await build()) === 2);
  await page.reload();
  await page.locator(`${sel}[data-build="2"]`).waitFor();
  check("reloading restores the build step", (await slideNo()) === at.bullets && (await build()) === 2);
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.down("ArrowLeft");
  await page.keyboard.up("ArrowLeft");
  check("holding a navigation key moves only one step", (await slideNo()) === at.bullets && (await build()) === 1);

  await go(at.bullets);
  await key("a");
  check("A confirms autoplay is on", await page.getByText("Autoplay on").isVisible());
  await page.locator(`${sel}[data-build="1"]`).waitFor({ timeout: 4000 });
  check("autoplay advances a build step", (await slideNo()) === at.bullets && (await build()) === 1);
  await key("ArrowLeft", 800);
  check("manual navigation pauses autoplay", (await slideNo()) === at.bullets && (await build()) === 0);

  await go(at.tokenize);
  const kw = (id: string) => page.$$eval(`${sel} #${id} .tok-kw`, (els) => els.map((e) => e.textContent));
  const ownTokens = await kw("own-tokens");
  const ownKeywords = await kw("own-keywords");
  check("Code's tokenize prop replaces the highlighter", ownTokens.join(",") === "SHOUT", ownTokens.join(","));
  check("the built-in tokenizer takes other keywords", ownKeywords.join(",") === "select", ownKeywords.join(","));

  // Keys and extras of one's own: the fixture's overlay uses useDeckNav() and useDeckKey().
  await go(at.bullets);
  await key("ArrowRight");
  check(
    "useDeckNav() follows the slide and the build step",
    (await extras()) === `slide ${at.bullets} of ${at.total}, step 1`,
    String(await extras()),
  );
  await key("x", 300);
  check("a key added with useDeckKey() runs (goto)", (await slideNo()) === 3);
  await key("Shift+J", 300);
  check("its letter works with Shift too, and nav() steps on", (await slideNo()) === 4);
  await key("?", 200);
  check(
    "? lists the added keys after the built-in ones",
    (await page.getByText("Fixture: jump to the third slide").isVisible()) && (await page.getByText("Blank the screen").isVisible()),
  );
  await key("x", 200);
  check("an added key doesn't run while the list is open", (await slideNo()) === 4);
  await key("Escape", 200);
  await key("g", 300);
  await key("x", 200);
  await key("Escape", 200);
  check("nor in the overview", (await slideNo()) === 4);
  await key("b", 200);
  check(
    "a built-in key wins over an added one",
    (await blanks()) === 1 && (await page.getAttribute("#extras", "data-taken")) === "0",
    String(await page.getAttribute("#extras", "data-taken")),
  );
  await key("b", 200);

  await key("k", 200);
  check("useDeckNav() finds hidden slides and jumps to their ids", (await slideNo()) === at.hidden);
  await key("u", 200);
  check("goto() ignores an unknown id", (await slideNo()) === at.hidden);

  await go(at.hidden - 1);

  for (let k = 0; k < 6 && (await slideNo()) === at.hidden - 1; k++) {
    await key("ArrowRight");
  }

  check("a hidden slide is skipped when presenting", (await slideNo()) === at.end, `at ${await slideNo()}`);
  await go(at.bullets);
  const footer = await page.textContent(`${sel} footer`);
  check("the footer shows the slide number", footer?.includes(String(at.bullets).padStart(2, "0")));

  await key("Home");
  await page.mouse.click(1400, 450);
  await page.waitForTimeout(200);
  check("tap advances", (await slideNo()) === 2);
  await page.mouse.click(100, 450, { button: "right" });
  await page.waitForTimeout(200);
  check("right-click goes back", (await slideNo()) === 1);
  const touch = await ctx.newCDPSession(page);

  const swipe = async (from: number, to: number) => {
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: from, y: 450 }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: to, y: 454 }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };

  await swipe(1000, 800);
  check("touch swipe left advances", (await slideNo()) === 2);
  await swipe(800, 1000);
  check("touch swipe right goes back", (await slideNo()) === 1);
  await touch.detach();

  await key("f", 500);
  check("F → fullscreen", await page.evaluate(() => Boolean(document.fullscreenElement)));
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
  await key("g", 300);
  await key("ArrowRight", 100);
  await key("ArrowRight", 100);
  await key("Enter", 300);
  check(
    "in the overview, the arrow keys move and Enter jumps there and closes",
    (await page.locator("[data-deck-mode=overview]").count()) === 0 && (await slideNo()) === 7,
    String(await slideNo()),
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
  const title = await popup.title();
  check("N opens the presenter window", title.startsWith("Presenter"));
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
  const reset = await popup.textContent("[data-deck-mode=presenter]");
  check("R resets the timer", reset?.includes("00:00"));
  // A message from any other window is ignored.
  await page.evaluate(() => window.postMessage({ type: "slides:nav", dir: 1 }, "*"));
  await page.waitForTimeout(200);
  check("messages from other windows are ignored", (await slideNo()) === 1);

  await key("p", 100);
  const pages = await page.locator(".print-page").count();
  check("P puts every visible slide on its own page", pages === at.total - 1, `${pages} pages`);
  check("the overlay is not printed", (await page.locator("[data-deck-overlay]").count()) === 0);
  await page.waitForTimeout(1500);
  // SAFETY: offline() sets the counter on every page before it runs.
  const printed = await page.evaluate(() => (window as Window & { printed?: number }).printed);
  check("P opens the print dialog", printed === 1);
  check("back to the deck after printing", (await page.locator("[data-deck-mode=present]").count()) === 1);

  await page.goto(`file://${file}?display=relative#${at.stat}`);
  await page.waitForTimeout(2600);
  const growth = await page.textContent(sel);
  check("?display=relative opens in growth mode", growth?.includes("81"));

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

const MODES = ["motion", "reduced motion", "no View Transitions API"] as const;

/**
 * Effects, slide transitions and team CSS on the motion fixture. With motion, a transition runs as
 * a view transition; with reduced motion, or in a browser without the API, the slide just changes.
 */
async function motion(browser: Browser, file: string, mode: (typeof MODES)[number]) {
  const animated = mode === "motion";
  const { ctx } = await offline(browser, mode === "reduced motion");
  const page = await ctx.newPage();

  if (mode === "no View Transitions API") {
    await page.addInitScript(() => Reflect.deleteProperty(Document.prototype, "startViewTransition"));
  }

  const errors: Array<string> = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  const test = (name: string, ok: unknown, detail: unknown = "") =>
    check(`${mode}: ${name}`, ok, typeof detail === "string" ? detail : JSON.stringify(detail));

  /** Where the deck is, and the view transition running right now, if any. */
  const state = () =>
    page.evaluate(() => {
      const current = document.querySelector<HTMLElement>("[data-deck-mode=present] [data-slide]");
      const root = document.documentElement;

      return {
        slide: current?.dataset.slideId,
        build: current?.dataset.build,
        transition: root.dataset.transition ?? null,
        back: Object.hasOwn(root.dataset, "transitionBack"),
        leftover: root.getAttribute("style") ?? "",
        // An element with the same view-transition-name on both slides gets a group of its own.
        carried: document.getAnimations().some(
          // SAFETY: every animation on the page is a CSS animation or transition, so its effect is a KeyframeEffect.
          (a) => (a.effect as KeyframeEffect).pseudoElement === "::view-transition-group(hero)",
        ),
        // "fade-in new reverse 1500": the keyframes on each of the slide's two snapshots.
        running: document.getAnimations().flatMap((a) => {
          // SAFETY: every animation on the page is a CSS animation (view transitions are too), with a KeyframeEffect.
          const effect = a.effect as KeyframeEffect;
          const part = /^::view-transition-(?<part>old|new)\(slide\)$/u.exec(effect.pseudoElement ?? "")?.groups?.part;
          const timing = effect.getComputedTiming();

          // SAFETY: as above.
          const { animationName } = a as CSSAnimation;

          return part ? [`${animationName} ${part} ${timing.direction} ${String(timing.duration)}`] : [];
        }),
      };
    });

  /** A computed style of the element that wraps `#id` (the Reveal or Build around it), or of `#id` itself. */
  const style = (selector: string, prop: string, parent = true) =>
    page.evaluate(
      ([query, name, ofParent]) => {
        const el = document.querySelector(query)!;

        return getComputedStyle(ofParent ? el.parentElement! : el).getPropertyValue(name);
      },
      [selector, prop, parent] as const,
    );

  const key = async (k: string, wait: number) => {
    await page.keyboard.press(k);
    await page.waitForTimeout(wait);
  };

  /** Several keys in the same frame: faster than a transition can apply its move. */
  const burst = (keys: Array<string>) =>
    page.evaluate((list) => {
      for (const name of list) {
        dispatchEvent(new KeyboardEvent("keydown", { key: name }));
      }
    }, keys);

  const go = async (n: number) => {
    await page.evaluate((slideNumber) => (location.hash = `#${slideNumber}`), n);
    await page.waitForTimeout(settle);
  };

  // Into a transition (the fixture's last 1500 ms), and after it.
  const DURING = 250;
  const settle = animated ? 1900 : 250;

  await page.goto(`file://${file}`);
  await page.waitForTimeout(600);
  const subtitle = (await page.textContent("[data-deck-mode=present] [data-slide]")) ?? "";
  test(
    "motion files in the team library are found by name",
    subtitle.includes("effects: verify-swoop · transitions: verify-wipe"),
    subtitle,
  );

  await key("ArrowRight", DURING);
  let s = await state();

  if (animated) {
    test(
      "the deck's transition runs the team's keyframes on the two slides",
      s.transition === "verify-wipe" &&
        s.running.some((r) => r.startsWith("verify-wipe-in new normal")) &&
        s.running.some((r) => r.startsWith("verify-wipe-out old normal")),
      s,
    );
    test(
      "the deck's motion tokens set the transition's duration",
      s.running.length === 2 && s.running.every((r) => r.endsWith(" 1500")),
      s.running,
    );
  } else {
    test("no view transition starts; the slide just changes", s.slide === "two" && s.transition === null && s.running.length === 0, s);
  }

  test("<Reveal effect> uses the team's effect", (await style("#revealed", "animation-name")) === "verify-swoop");
  await page.waitForTimeout(settle);
  s = await state();
  test("on the next slide, with nothing left on <html>", s.slide === "two" && s.transition === null && !s.back && !s.leftover, s);

  test("<Build effect> is hidden before its step", (await style("#built", "visibility")) === "hidden");
  await key("ArrowRight", 200);
  test(
    "<Build effect> plays the team's effect on its step",
    (await style("#built", "visibility")) === "visible" && (await style("#built", "animation-name")) === "verify-swoop",
  );
  const brand = "rgb(122, 60, 255)";
  test("a token in the team's styles.css becomes a utility", (await style("#token", "background-color", false)) === brand);
  test(
    "a utility in the team's styles.css applies, built from the kit's",
    (await style("#badge", "outline-color", false)) === brand && (await style("#badge", "font-size", false)) === "26px",
  );

  await key("ArrowRight", DURING);
  s = await state();

  if (animated) {
    test(
      "a slide's own transition replaces the deck's",
      s.transition === "fade" && s.running.some((r) => r.startsWith("fade-in new normal")),
      s,
    );
    test("an element with the same viewTransitionName on both slides moves between them", s.carried, s);
  }

  await page.waitForTimeout(settle);
  await key("ArrowLeft", DURING);
  s = await state();

  if (animated) {
    test(
      "going back plays the same transition the other way round",
      s.transition === "fade" &&
        s.back &&
        s.running.some((r) => r.startsWith("fade-out new reverse")) &&
        s.running.some((r) => r.startsWith("fade-in old reverse")),
      s,
    );
  }

  await page.waitForTimeout(settle);
  const before = await state();
  test("← lands on the slide before, every step shown", before.slide === "two" && before.build === "1", before);

  await go(3);
  await key("ArrowRight", 150);
  s = await state();
  test('transition: "none" changes the slide at once', s.slide === "four" && s.transition === null && s.running.length === 0, s);

  // Rapid keys: a move made while a transition is still waiting to apply must win.
  await burst(["End", "Home", "End"]);
  await page.waitForTimeout(settle);
  s = await state();
  test("End, Home, End in one frame lands on the last slide", s.slide === "five" && s.transition === null, s);
  await burst(["Home", "4", "Enter"]);
  await page.waitForTimeout(settle);
  s = await state();
  test("a jump without a transition, made during one, is where the deck ends up", s.slide === "four" && s.transition === null, s);

  if (animated) {
    await go(1);
    await key("ArrowRight", DURING);
    await page.mouse.click(1400, 450);
    await page.waitForFunction(() => !document.documentElement.dataset.transition, undefined, { timeout: 1000 });
    s = await state();
    test("a click skips the running transition and advances a build", s.slide === "two" && s.build === "1", s);

    await go(1);
    await page.evaluate(() => {
      dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));

      // Two taps before the incoming slide has even registered its build.
      for (let i = 0; i < 2; i++) {
        for (const type of ["pointerdown", "pointerup"]) {
          document.documentElement.dispatchEvent(
            new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId: 1, clientX: 1400, clientY: 450 }),
          );
        }
      }
    });
    await page.waitForTimeout(settle);
    s = await state();
    test("rapid taps during a transition apply every advance in order", s.slide === "three" && s.build === "0" && s.transition === null, s);
  }

  await go(2);
  await key("g", 500);

  const overview = await page.evaluate(() => {
    const view = document.querySelector("[data-deck-mode=overview]")!;

    return {
      // SAFETY: every animation on the page is a CSS animation or transition, so its effect is a KeyframeEffect.
      running: document.getAnimations().filter((a) => view.contains((a.effect as KeyframeEffect).target)).length,
      built: getComputedStyle(view.querySelector("#built")!.parentElement!).visibility,
    };
  });

  test("the overview shows the final state, nothing moving", overview.running === 0 && overview.built === "visible", overview);
  await key("Escape", 200);
  await key("p", 200);

  const print = await page.evaluate(() => {
    // oxlint-disable-next-line unicorn/consistent-function-scoping -- runs in the page, which gets only this callback
    const of = (id: string) => getComputedStyle(document.querySelector(`.print-page ${id}`)!.parentElement!);

    return { built: of("#built").visibility, opacity: of("#revealed").opacity, transform: of("#revealed").transform };
  });

  test("print shows the final state", print.built === "visible" && print.opacity === "1" && print.transform === "none", print);
  test("no page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/** Mid-flight pictures of every transition, for a person to look at: dist/qa/transitions/<slide>-<forward|back>.png. */
const shots = resolve(dist, "qa/transitions");

/** Where a page is, the transition running on it, and every element that carries a Morph's name right now. */
function morphState(view: Page) {
  return view.evaluate(() => {
    const root = document.documentElement;

    const effects = document.getAnimations().map((a) => ({
      // SAFETY: every animation on the page is a CSS animation (view transitions are too).
      name: (a as CSSAnimation).animationName,
      // SAFETY: and so its effect is a KeyframeEffect.
      effect: a.effect as KeyframeEffect,
    }));

    return {
      slide: document.querySelector<HTMLElement>("[data-deck-mode=present] [data-slide]")?.dataset.slideId,
      transition: root.dataset.transition ?? null,
      back: Object.hasOwn(root.dataset, "transitionBack"),
      leftover: root.getAttribute("style") ?? "",
      morphs: document.querySelectorAll("[data-morph]").length,
      named: [...document.querySelectorAll<HTMLElement>("*")].flatMap((el) => {
        const name = getComputedStyle(el).getPropertyValue("view-transition-name");

        return name.startsWith("morph-") ? [`${name}${el.closest("[data-deck-mode=present] [data-slide]") ? "" : " (off stage)"}`] : [];
      }),
      landed: [...document.querySelectorAll("[data-morph].static-motion")].length,
      groups: [
        ...new Set(
          effects.flatMap(
            ({ effect }) => /^::view-transition-group\((?<name>morph-.+)\)$/u.exec(effect.pseudoElement ?? "")?.groups?.name ?? [],
          ),
        ),
      ],
      // "wipe-in new normal 1500": the keyframes on each of the slide's two snapshots.
      running: effects.flatMap(({ name, effect }) => {
        const part = /^::view-transition-(?<part>old|new)\(slide\)$/u.exec(effect.pseudoElement ?? "")?.groups?.part;
        const timing = effect.getComputedTiming();

        return part ? [`${name} ${part} ${timing.direction} ${Math.round(Number(timing.duration))}`] : [];
      }),
    };
  });
}

/**
 * <Morph> and the built-in transitions on the morph fixture. A Morph has a view-transition-name only
 * on the live stage and only while a transition runs; every transition lands on the right slide,
 * forwards and back. With reduced motion, or without the API, every slide just changes.
 */
async function morph(browser: Browser, file: string, mode: (typeof MODES)[number]) {
  const animated = mode === "motion";
  const { ctx } = await offline(browser, mode === "reduced motion");
  const page = await ctx.newPage();

  if (mode === "no View Transitions API") {
    await page.addInitScript(() => Reflect.deleteProperty(Document.prototype, "startViewTransition"));
  }

  const errors: Array<string> = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  const test = (name: string, ok: unknown, detail: unknown = "") =>
    check(`${mode}: ${name}`, ok, typeof detail === "string" ? detail : JSON.stringify(detail));

  const state = () => morphState(page);

  /** Holds the running transition 35% in (a flip is edge-on half-way), takes its picture, then ends it at once. */
  const shoot = async (name?: string) => {
    await page.evaluate(() => {
      for (const a of document.getAnimations()) {
        // SAFETY: every animation on the page has a KeyframeEffect, as above.
        const effect = a.effect as KeyframeEffect;

        if (effect.pseudoElement?.startsWith("::view-transition")) {
          a.pause();
          a.currentTime = Number(effect.getComputedTiming().duration) * 0.35;
        }
      }
    });

    if (name) {
      await page.screenshot({ path: resolve(shots, `${name}.png`) });
    }

    await page.evaluate(() => {
      for (const a of document.getAnimations()) {
        // SAFETY: as above.
        if ((a.effect as KeyframeEffect).pseudoElement?.startsWith("::view-transition")) {
          a.finish();
        }
      }
    });
    await page.waitForTimeout(250);
  };

  // Into a transition (the fixture's last 1500 ms), and after it.
  const DURING = 250;
  const settle = animated ? 1900 : 250;

  const key = async (k: string, wait: number) => {
    await page.keyboard.press(k);
    await page.waitForTimeout(wait);
  };

  const go = async (n: number) => {
    await page.evaluate((slideNumber) => (location.hash = `#${slideNumber}`), n);
    await page.waitForTimeout(settle);
  };

  await page.goto(`file://${file}`);
  await page.waitForTimeout(600);
  await key("g", 400);
  const ids = await page.$$eval("[data-deck-mode=overview] [data-slide]", (els) => els.map((e) => e.dataset.slideId!));
  let s = await state();
  test("the overview shows Morphs as plain elements, none named", s.morphs > 4 && s.named.length === 0, s);
  await key("Escape", 200);
  s = await state();
  test("no Morph is named while nothing moves", s.slide === "a" && s.named.length === 0, s);

  if (!animated) {
    await key("ArrowRight", settle);
    s = await state();
    test("a Morph just changes with its slide", s.slide === "b" && s.transition === null && s.named.length === 0 && s.landed === 0, s);

    for (const id of ids.slice(2)) {
      await key("ArrowRight", settle);
      s = await state();

      if (s.slide !== id || s.transition !== null) {
        break;
      }
    }

    test("every slide after it just changes too", s.slide === ids.at(-1) && s.transition === null && s.named.length === 0, s);
    await key("ArrowLeft", settle);
    s = await state();
    test("and going back", s.slide === ids.at(-2) && s.transition === null, s);
    test("no page errors", errors.length === 0, errors.join(" | "));
    await ctx.close();

    return;
  }

  mkdirSync(shots, { recursive: true });
  await key("ArrowRight", DURING);
  s = await state();
  test(
    "a Morph on both slides is named on the stage while the slide changes, and only it",
    s.named.join(",") === "morph-hero" && s.groups.join(",") === "morph-hero",
    s,
  );
  test(
    "with no transition named, the rest of the slide fades",
    s.transition === "fade" && s.running.some((r) => r.startsWith("fade-in new")),
    s,
  );
  test("what lands is shown in its final state", s.landed === 1, s);
  await shoot("morph-forward");
  s = await state();
  test(
    "after it, nothing is named and nothing is left on <html>",
    s.slide === "b" && s.named.length === 0 && !s.leftover && s.transition === null,
    s,
  );

  await key("ArrowLeft", DURING);
  s = await state();
  test("going back, the Morph returns", s.back && s.named.join(",") === "morph-hero" && s.groups.join(",") === "morph-hero", s);
  test("going back runs a fifth shorter", s.running.length === 2 && s.running.every((r) => r.endsWith(" 1200")), s.running);
  await shoot("morph-back");
  s = await state();
  test("and lands on the slide before", s.slide === "a" && s.named.length === 0 && !s.leftover, s);

  // An impatient second press: the running transition is skipped and the next one starts.
  await key("ArrowRight", DURING);
  await key("ArrowRight", DURING);
  s = await state();
  test(
    "a second → during a Morph skips it and morphs on, while the slide pushes",
    s.slide === "c" && s.transition === "push" && s.named.join(",") === "morph-hero" && s.running.some((r) => r.startsWith("push-in new")),
    s,
  );
  await shoot("morph-with-push");
  s = await state();
  test("nothing is left named after the skipped one", s.slide === "c" && s.named.length === 0 && !s.leftover, s);

  await key("ArrowRight", DURING);
  s = await state();
  test(
    "an id twice on a slide: reported once, nothing named, and the transition still runs",
    errors.length === 1 &&
      errors[0].includes('<Morph id="hero"> is on one slide more than once') &&
      s.named.length === 0 &&
      s.transition === "fade",
    { errors, s },
  );
  errors.length = 0;
  await page.waitForTimeout(settle);
  s = await state();
  test("and lands", s.slide === "dupe" && s.transition === null, s);

  // The spot the first iris opens from: the centre of the data-origin element, in the slide's own pixels.
  const origin = await page.evaluate(() => {
    const slide = document.querySelector<HTMLElement>("[data-deck-mode=present] [data-slide]")!;
    const box = slide.getBoundingClientRect();
    const spot = document.querySelector("#origin")!.getBoundingClientRect();
    const scale = box.width / slide.offsetWidth;

    return { x: (spot.left + spot.width / 2 - box.left) / scale, y: (spot.top + spot.height / 2 - box.top) / scale };
  });

  const steps = { left: "-1 0", right: "1 0", up: "0 -1", down: "0 1" };
  const failed: Array<string> = [];
  const fail = (id: string, what: string, detail: unknown) => failed.push(`${id} ${what}: ${JSON.stringify(detail)}`);

  for (const [i, id] of ids.entries()) {
    if (i < 4) {
      continue;
    }

    const [kind, direction = "left"] = id.replace(/-\d+$/u, "").split("-");
    await key("ArrowRight", DURING);
    s = await state();

    if (
      s.transition !== kind ||
      !s.running.includes(`${kind}-in new normal 1500`) ||
      !s.running.includes(`${kind}-out old normal 1500`) ||
      // SAFETY: the fixture's directions are these four.
      !s.leftover.includes(`--dx: ${steps[direction as keyof typeof steps].replace(" ", "; --dy: ")};`)
    ) {
      fail(id, "forwards", s);
    }

    if (i === 4) {
      const at = /--origin-x: (?<x>[\d.]+)px; --origin-y: (?<y>[\d.]+)px/u.exec(s.leftover)?.groups;
      test(
        "iris opens from the slide's data-origin element",
        Math.abs(Number(at?.x) - origin.x) < 1 && Math.abs(Number(at?.y) - origin.y) < 1,
        { origin, s },
      );
    } else if (kind === "iris") {
      test("and from the centre when there is none", !s.leftover.includes("--origin"), s);
    }

    await shoot(`${id}-forward`);
    s = await state();

    if (s.slide !== id || s.transition !== null || s.leftover) {
      fail(id, "lands", s);
    }

    await key("ArrowLeft", DURING);
    s = await state();

    if (!s.back || !s.running.includes(`${kind}-in old reverse 1200`) || !s.running.includes(`${kind}-out new reverse 1200`)) {
      fail(id, "back", s);
    }

    await shoot(`${id}-back`);
    s = await state();

    if (s.slide !== ids[i - 1] || s.transition !== null) {
      fail(id, "lands back", s);
    }

    await key("ArrowRight", DURING);
    await shoot();
  }

  s = await state();
  test(
    "iris, wipe, shove, blur, flip and split each run their keyframes in their direction and land, forwards and back",
    failed.length === 0 && s.slide === ids.at(-1),
    failed.join(" | "),
  );

  // The presenter window and print render the same Morphs; neither may carry a name.
  await go(1);
  const [popup] = await Promise.all([page.waitForEvent("popup"), key("n", 100)]);
  await popup.waitForTimeout(1000);
  await key("ArrowRight", DURING);
  s = await state();
  const presenter = await morphState(popup);
  test(
    "the presenter window shows the Morphs unnamed while the deck's one flies",
    s.named.join(",") === "morph-hero" && presenter.morphs > 0 && presenter.named.length === 0,
    { deck: s.named, presenter },
  );
  await popup.close();
  await page.waitForTimeout(settle);
  await key("p", 300);
  s = await state();
  test("print shows the Morphs unnamed", s.morphs > 4 && s.named.length === 0, s);
  await page.waitForTimeout(1500);
  test("no page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/**
 * The library view of the fixture library: block examples and motion get a slide each, and a block
 * whose example can't render is reported by name.
 */
async function libraryView(browser: Browser, file: string) {
  const { ctx } = await offline(browser);
  const page = await ctx.newPage();
  await page.goto(`file://${file}`);
  await page.waitForTimeout(600);
  await page.keyboard.press("g");
  await page.waitForTimeout(600);

  const view = await page.evaluate(() => {
    const overview = document.querySelector("[data-deck-mode=overview]")!;
    const slide = (id: string) => overview.querySelector(`[data-slide-id="${id}"]`);

    return {
      ids: [...overview.querySelectorAll<HTMLElement>("[data-slide-id]")].map((s) => s.dataset.slideId!),
      broken: [...overview.querySelectorAll<HTMLElement>("[data-broken]")].map((b) => b.dataset.broken),
      good: Boolean(slide("blocks/Good.tsx")?.querySelector("[data-frame-body] #good-block")),
      whole:
        Boolean(slide("blocks/Whole.tsx")?.querySelector("#whole-block")) && !slide("blocks/Whole.tsx")?.querySelector("[data-frame-body]"),
    };
  });

  const numberOf = (id: string) => view.ids.indexOf(id) + 1;
  check("a block's `example` is a slide in the library view, inside a Frame", view.good, view.ids.join(" "));
  check("an `example` made with slide() (a layout) is shown as it is", view.whole);
  check("a block file without an `example` is left out", !view.ids.some((id) => id.includes("NoExample")), view.ids.join(" "));
  check(
    "a block whose example can't render is reported by name (and fails the check above on a real library)",
    view.broken.join(",") === "blocks/Throws.tsx",
    view.broken.join(","),
  );
  check(
    "every effect and transition in the library's motion folder has a slide",
    numberOf("motion/effect/verify-swoop") > 0 && numberOf("motion/transition/verify-wipe") > 0,
    view.ids.join(" "),
  );
  await page.keyboard.press("Escape");
  await page.evaluate((n) => (location.hash = `#${n}`), numberOf("motion/effect/verify-swoop"));
  await page.waitForTimeout(300);
  const present = "[data-deck-mode=present] [data-effect]";

  const names = () =>
    page.$$eval(`${present} > *`, (els) => els.map((e) => `${getComputedStyle(e).animationName} ${getComputedStyle(e).visibility}`));

  const before = await names();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  const after = await names();
  check(
    "an effect's slide plays it when it opens, and again on →",
    before.join(",") === "verify-swoop visible,verify-swoop visible,none hidden" && after[2] === "verify-swoop visible",
    `${before.join(",")} | ${after.join(",")}`,
  );
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(150);
  const running = await page.evaluate(() => document.documentElement.dataset.transition ?? null);
  check("a transition's slide arrives with it", running === "verify-wipe", String(running));
  await ctx.close();
}

/** The overflow check itself, on a deck made to overflow: exactly its three slides that don't fit. */
async function overflow(browser: Browser, file: string) {
  const { ctx } = await offline(browser);
  const page = await ctx.newPage();
  await page.goto(`file://${file}#1`);
  await page.waitForTimeout(400);
  await page.keyboard.press("g");
  await page.waitForTimeout(800);
  const tall = await tooTall(page);
  const found = tall.join(", ");
  check(
    "overflow is reported for a Frame body, a layout's FrameBody and a slide taller than the stage, by id and slide number",
    found === "slide-2 (slide 2), layout-too-tall (slide 3), slide-too-tall (slide 4)",
    found,
  );

  const sizes = await page.evaluate(() =>
    [".normal-small", ".compact-small", ".compact-plain"].map(
      (s) => getComputedStyle(document.querySelector(`[data-deck-mode=overview] ${s}`)!).fontSize,
    ),
  );

  check(
    'density="compact" steps text down a notch (default theme: small 38 → 32 px, body 44 → 38 px)',
    sizes.join(",") === "38px,32px,38px",
    sizes.join(","),
  );
  await ctx.close();
}

/** The theme the build reads off a deck file: only the deck object's own `theme` key counts. */
function themeDetection() {
  const dir = mkdtempSync(resolve(tmpdir(), "slides-theme-"));

  const themeOf = (source: string) => {
    writeFileSync(resolve(dir, "index.tsx"), source);

    try {
      return deckTheme(resolve(dir, "index.tsx"), resolve(import.meta.dirname, "../examples/_library"));
    } catch (error) {
      return `error: ${errorMessage(error)}`;
    }
  };

  const cases: Array<[string, string, string]> = [
    [
      "the deck's own theme",
      `const deck: DeckDefinition = { title: "a", theme: "editorial", slides: [] };\nexport default deck;`,
      "editorial",
    ],
    [
      "a theme field in the deck's data, before the deck",
      `const topics = [{ theme: "Culture" }, { theme: pick() }];\nconst deck: DeckDefinition = { title: "a", slides: [] };\nexport default deck;`,
      "default",
    ],
    [
      "a theme field in a slide's props or options, inside the deck",
      `const deck: DeckDefinition = {\n  title: "a",\n  slides: [<X data={{ theme: "Culture" }} />, slide(<Y />, { theme: x })],\n  theme: "signal",\n};\nexport default deck;`,
      "signal",
    ],
    ["export default of an object literal", `export default { title: "{", theme: "acme", slides: [] } satisfies DeckDefinition;`, "acme"],
    [
      "a theme in a comment or a template literal",
      `// theme: "acme"\nconst deck = { notes: \`theme: "acme"\`, slides: [] };\nexport default deck;`,
      "default",
    ],
  ];

  for (const [name, source, want] of cases) {
    const got = themeOf(source);
    check(`theme detection: ${name}`, got === want, got);
  }

  rmSync(dir, { recursive: true, force: true });
}

/**
 * Upstream's decks (examples/ and the showcase) are committed as built HTML, and `npm run check`
 * compares them in every copy of the repo. So nothing a team adds may change their bytes: build
 * the showcase (it names no theme) as it is, then again next to a team library with a default theme,
 * motion, styles.css rules and blocks with classes of their own. The two builds must be identical.
 */
async function upstreamDecksAlone() {
  const leak = resolve(import.meta.dirname, "verify-deck/leak-library");
  const showcase = resolve(import.meta.dirname, "../src/decks/showcase/index.tsx");

  const once = async (out: string) => {
    process.env.DECK = "showcase";
    process.env.DECK_FILE = showcase;
    await viteBuild({
      logLevel: "warn",
      configFile: resolve(import.meta.dirname, "../vite.config.ts"),
      build: { outDir: resolve(dist, out) },
    });

    return readFileSync(resolve(dist, out, "index.html"));
  };

  const libraryFiles = {
    "settings.json": `{ "defaultTheme": "editorial" }`,
    "styles.css": `@theme { --color-leak: #123456; }\n@utility leak-row { display: flex; color: var(--color-leak); }\n`,
    "motion/leak.css": `.leak { animation: leak 1s; }\n@keyframes leak { from { opacity: 0; } }\n@keyframes leak-in { from { opacity: 0; } }\n@keyframes leak-out { to { opacity: 0; } }\n`,
    "blocks/Leak.tsx": `export const Leak = () => <div className="leak-row bg-[#654321] text-[123px] mt-[77px]" />;\n`,
  };

  try {
    const before = await once(".alone-a");

    for (const [name, text] of Object.entries(libraryFiles)) {
      mkdirSync(resolve(leak, name, ".."), { recursive: true });
      writeFileSync(resolve(leak, name), text);
    }

    process.env.LIBRARY_DIR = leak;
    const after = await once(".alone-b");
    check(
      "upstream's decks build the same whatever the team's library holds (default theme, motion, styles.css, classes)",
      before.equals(after),
      `the showcase differs: ${before.length} vs ${after.length} bytes`,
    );
  } finally {
    delete process.env.LIBRARY_DIR;
    rmSync(leak, { recursive: true, force: true });

    for (const out of [".alone-a", ".alone-b"]) {
      rmSync(resolve(dist, out), { recursive: true, force: true });
    }
  }
}

/** Each invalid deck must reach the self-contained check and fail on its own asset. */
async function rejectsExternalAssets() {
  const cases = [
    ["remote-image", "src/poster/srcset points at https://example.invalid/verify.png"],
    ["missing-font", "CSS url() to a file that wasn't found points at ./verify-missing.woff2"],
  ] as const;

  process.env.LIBRARY_DIR = resolve(import.meta.dirname, "../examples/_library");

  try {
    for (const [fixture, reason] of cases) {
      const deck = `verify-${fixture}`;
      process.env.DECK = deck;
      process.env.DECK_FILE = resolve(import.meta.dirname, `verify-deck/${fixture}.tsx`);
      let message = "build succeeded";

      try {
        await viteBuild({ logLevel: "silent", configFile: resolve(import.meta.dirname, "../vite.config.ts") });
      } catch (error) {
        message = String(error);
      } finally {
        rmSync(resolve(dist, `.${deck}`), { recursive: true, force: true });
      }

      check(
        `self-contained build rejects ${fixture}`,
        message.includes("The deck would not be self-contained:") && message.includes(reason),
        message,
      );
    }
  } finally {
    delete process.env.LIBRARY_DIR;
  }
}

/** npm run pdf's export: one page per visible slide, at the deck's 1920×1080 aspect (1440×810 pt). */
async function pdf(browser: Browser, file: string) {
  const dir = mkdtempSync(resolve(tmpdir(), "slides-pdf-"));
  const out = resolve(dir, "verify.pdf");

  try {
    const slides = await exportPdf(browser, file, out);
    const bytes = readFileSync(out);
    const { pages, width, height } = inspectPdf(bytes);
    check("PDF export: a PDF is produced", bytes.subarray(0, 5).toString() === "%PDF-" && slides > 1, `${slides} slides`);
    check("PDF export: one page per visible slide", pages === slides, `${pages} pages, ${slides} slides`);
    check("PDF export: pages are 16:9 (1920×1080 px)", width === 1440 && height === 810, `${width}×${height} pt`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

deckName = "build (no browser)";

themeDetection();

await upstreamDecksAlone();

await rejectsExternalAssets();

const browser = await chromium.launch(executablePath ? { executablePath } : {});

for (const file of files) {
  deckName = file;
  await selfContained(browser, file);
}

// The team library, as one deck: every library slide must render offline without errors or overflow.
process.env.DECK = "library";

process.env.DECK_FILE = resolve(import.meta.dirname, "../src/library-view.tsx");

await viteBuild({ logLevel: "warn", configFile: resolve(import.meta.dirname, "../vite.config.ts") });

deckName = "library view (src/library: slides, block examples, motion)";

await selfContained(browser, resolve(dist, ".library/index.html"));

rmSync(resolve(dist, ".library"), { recursive: true, force: true });

// The fixture deck: built here, checked, removed.
process.env.DECK = "verify";

process.env.DECK_FILE = resolve(import.meta.dirname, "verify-deck/index.tsx");

await viteBuild({ logLevel: "warn", configFile: resolve(import.meta.dirname, "../vite.config.ts") });

const fixture = resolve(dist, ".verify/index.html");

deckName = "verify-deck (fixture)";

await selfContained(browser, fixture);

await features(browser, fixture);

await pdf(browser, fixture);

rmSync(resolve(dist, ".verify"), { recursive: true, force: true });

// The overflow check, on a deck made to overflow.
process.env.DECK = "verify-overflow";

process.env.DECK_FILE = resolve(import.meta.dirname, "verify-deck/overflow.tsx");

await viteBuild({ logLevel: "warn", configFile: resolve(import.meta.dirname, "../vite.config.ts") });

deckName = "verify-deck/overflow (fixture: slides too tall in three ways)";

await overflow(browser, resolve(dist, ".verify-overflow/index.html"));

rmSync(resolve(dist, ".verify-overflow"), { recursive: true, force: true });

// The fixture library standing in for src/library: first its library view, then the motion fixture.
process.env.LIBRARY_DIR = resolve(import.meta.dirname, "verify-deck/library");

process.env.DECK = "verify-library";

process.env.DECK_FILE = resolve(import.meta.dirname, "../src/library-view.tsx");

await viteBuild({ logLevel: "warn", configFile: resolve(import.meta.dirname, "../vite.config.ts") });

deckName = "library view of the fixture library (verify-deck/library)";

await libraryView(browser, resolve(dist, ".verify-library/index.html"));

rmSync(resolve(dist, ".verify-library"), { recursive: true, force: true });

process.env.DECK = "verify-motion";

process.env.DECK_FILE = resolve(import.meta.dirname, "verify-deck/motion.tsx");

await viteBuild({ logLevel: "warn", configFile: resolve(import.meta.dirname, "../vite.config.ts") });

const motionFixture = resolve(dist, ".verify-motion/index.html");

deckName = "verify-deck/motion (fixture: effects, transitions and team CSS by name)";

await selfContained(browser, motionFixture);

for (const mode of MODES) {
  await motion(browser, motionFixture, mode);
}

rmSync(resolve(dist, ".verify-motion"), { recursive: true, force: true });

// Morph and the built-in transitions, with the empty library so no team file stands in for a built-in.
process.env.LIBRARY_DIR = resolve(import.meta.dirname, "../examples/_library");

process.env.DECK = "verify-morph";

process.env.DECK_FILE = resolve(import.meta.dirname, "verify-deck/morph.tsx");

await viteBuild({ logLevel: "warn", configFile: resolve(import.meta.dirname, "../vite.config.ts") });

const morphFixture = resolve(dist, ".verify-morph/index.html");

deckName = "verify-deck/morph (fixture: Morph and every built-in transition)";

await selfContained(browser, morphFixture, false);

for (const mode of MODES) {
  await morph(browser, morphFixture, mode);
}

rmSync(resolve(dist, ".verify-morph"), { recursive: true, force: true });

delete process.env.LIBRARY_DIR;

await browser.close();

let deck = "";

for (const r of results) {
  if (r.deck !== deck) {
    ({ deck } = r);
    console.log(`\n${deck}`);
  }

  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.name}${!r.ok && r.detail ? `  (${r.detail})` : ""}`);
}

const failed = results.filter((r) => !r.ok).length;

console.log(`\n${results.length - failed}/${results.length} passed`);

process.exit(failed ? 1 : 0);
