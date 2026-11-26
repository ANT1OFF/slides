// The WebGL backdrop's checks for `npm run verify`, on the fixture deck verify-deck/backdrop.tsx:
// it draws, moves, holds still at a fixed time, shares one GL context, survives a lost context, and
// falls back to one frame (print, overview, reduced motion) or to a CSS gradient (no WebGL).
import type { Browser, Page } from "playwright-core";

type Check = (name: string, ok: unknown, detail?: string) => void;

/** How the page is opened: as it is, asking for reduced motion, or with WebGL taken away. */
export const BACKDROP_MODES = ["motion", "reduced motion", "no WebGL"] as const;

/** What a page's backdrops look like right now. */
interface Look {
  /** data-backdrop of each: "live", "still" or "css". */
  states: Array<string>;
  /** A fingerprint of each canvas's pixels. */
  prints: Array<string>;
  /** How many different colours a sample of each canvas has; 1 is a blank canvas. */
  tones: Array<number>;
  /** Whether each has a gradient under its canvas. */
  gradients: Array<boolean>;
}

function look(page: Page, scope: string): Promise<Look> {
  return page.evaluate((root) => {
    const hosts = [...document.querySelectorAll<HTMLElement>(`${root} [data-backdrop]`)];
    const out: Look = { states: [], prints: [], tones: [], gradients: [] };

    for (const host of hosts) {
      const canvas = host.querySelector("canvas")!;
      const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
      const seen = new Set<number>();
      let sum = 0;

      for (let i = 0; i < data.length; i += 4 * 37) {
        const colour = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        seen.add(colour);
        sum = (sum * 31 + colour) % 2_147_483_647;
      }

      out.states.push(host.dataset.backdrop ?? "");
      out.prints.push(`${canvas.width}x${canvas.height}:${sum}`);
      out.tones.push(seen.size);
      out.gradients.push(getComputedStyle(host).backgroundImage.includes("gradient"));
    }

    return out;
  }, scope);
}

const PRESENT = "[data-deck-mode=present]";

/** A step eases the picture to its place over 1.6 s (also when its time is held), so look after that. */
const STEP_MS = 1900;

/** `count` backdrops, each with a picture on its canvas. */
const drawn = (l: Look, count: number) => l.states.length === count && l.tones.every((t) => t > 8);

export async function backdrop(browser: Browser, file: string, mode: (typeof BACKDROP_MODES)[number], check: Check) {
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    reducedMotion: mode === "reduced motion" ? "reduce" : "no-preference",
  });

  const blocked: Array<string> = [];
  await ctx.route("**/*", (route) => {
    const url = route.request().url();

    if (url.startsWith("file:") || url.startsWith("data:")) {
      return route.continue();
    }

    blocked.push(url);

    return route.abort();
  });

  // Count the GL contexts the page makes and keep them, to lose one on purpose; or refuse to make any.
  await ctx.addInitScript((none) => {
    // SAFETY: `glContexts` is this script's own list on the window, set before the page runs.
    const w = window as Window & { glContexts?: Array<WebGLRenderingContext> };
    w.glContexts = [];
    const real = HTMLCanvasElement.prototype.getContext;

    // SAFETY: a stand-in with the real method's shape, calling the real one.
    HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, kind: string, options?: unknown) {
      if (!kind.startsWith("webgl")) {
        return real.call(this, kind, options);
      }

      if (none) {
        return null;
      }

      // SAFETY: asked for a WebGL context, so that or null is what comes back.
      const made = real.call(this, kind, options) as WebGLRenderingContext | null;

      if (made) {
        w.glContexts!.push(made);
      }

      return made;
    } as typeof real;

    window.print = () => {};
  }, mode === "no WebGL");

  const page = await ctx.newPage();
  const errors: Array<string> = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") {
      errors.push(m.text());
    }
  });

  const test = (name: string, ok: unknown, detail: unknown = "") =>
    check(`${mode}: ${name}`, ok, typeof detail === "string" ? detail : JSON.stringify(detail));

  const open = async (query = "", hash = "#1") => {
    await page.goto("about:blank");
    await page.goto(`file://${file}${query}${hash}`);
    await page.waitForSelector(`${PRESENT} [data-backdrop]`);
  };

  await open();
  let first = await look(page, PRESENT);

  if (mode === "no WebGL") {
    test("without WebGL the backdrop is a CSS gradient", first.states[0] === "css" && first.gradients[0] && first.tones[0] === 1, first);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(700);
    const pair = await look(page, PRESENT);
    test("without WebGL every backdrop on a slide falls back", pair.states.join(",") === "css,css" && pair.gradients.every(Boolean), pair);
    await open("", "#4");
    const own = await look(page, PRESENT);
    const band = await page.evaluate((root) => getComputedStyle(document.querySelector(`${root} [data-backdrop] + div`)!).display, PRESENT);
    test(
      "without WebGL a Crowd is a dotted field with its share highlighted, and a shader of the deck's own its fallback",
      own.states.join(",") === "css,css" && own.gradients[0] && band === "block",
      { own, band },
    );
    await page.keyboard.press("p");
    await page.waitForSelector("[data-deck-mode=print]");
    const printed = await look(page, "[data-deck-mode=print]");
    test("without WebGL print shows the gradients", printed.states.length === 5 && printed.states.every((s) => s === "css"), printed);
    test("without WebGL nothing is reported as an error", errors.length === 0, errors);
    await ctx.close();

    return;
  }

  const moving = mode === "motion";
  test("the backdrop draws on the slide's first frame", drawn(first, 1) && first.states[0] === (moving ? "live" : "still"), first);
  test("a gradient from the theme sits under the canvas", first.gradients[0]);
  await page.waitForTimeout(1500);
  let later = await look(page, PRESENT);
  test(moving ? "the picture moves" : "the picture holds still under reduced motion", (later.prints[0] !== first.prints[0]) === moving, [
    first.prints,
    later.prints,
  ]);

  // A fixed time gives the same frame on every load, and another time another frame.
  await open("?backdrop-time=5");
  first = await look(page, PRESENT);
  await page.waitForTimeout(400);
  later = await look(page, PRESENT);
  test("at a fixed time the picture is still", first.states[0] === "still" && first.prints[0] === later.prints[0], [first, later.prints]);
  await open("?backdrop-time=5");
  later = await look(page, PRESENT);
  test("a fixed time draws the same frame on every load", drawn(later, 1) && first.prints[0] === later.prints[0], [
    first.prints,
    later.prints,
  ]);
  await open("?backdrop-time=60");
  later = await look(page, PRESENT);
  test("another time is another frame", first.prints[0] !== later.prints[0], later.prints);

  // Two backdrops on a slide, drawn by the one context, each in its own colours; a step shifts them.
  await open("?backdrop-time=5", "#2");
  const pair = await look(page, PRESENT);
  test("two backdrops on a slide both draw", drawn(pair, 2) && pair.prints[0] !== pair.prints[1], pair);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(STEP_MS);
  const stepped = await look(page, PRESENT);
  test("a build step shifts the picture", stepped.prints[0] !== pair.prints[0] && stepped.prints[1] !== pair.prints[1], [
    pair.prints,
    stepped.prints,
  ]);
  await open("?backdrop-time=5", "#2.1");
  later = await look(page, PRESENT);
  test("a step's picture is the same when jumped to", later.prints.join(",") === stepped.prints.join(","), [stepped.prints, later.prints]);

  // A Crowd and a picture from a shader of the deck's own: a second program on the same context.
  await open("?backdrop-time=5", "#4");
  const own = await look(page, PRESENT);
  const band = await page.evaluate((root) => getComputedStyle(document.querySelector(`${root} [data-backdrop] + div`)!).display, PRESENT);
  test("a Crowd and a shader of the deck's own both draw", drawn(own, 2) && own.prints[0] !== own.prints[1] && band === "none", {
    own,
    band,
  });
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(STEP_MS);
  const arrived = await look(page, PRESENT);
  test("a Crowd's highlighted dots arrive on its step", arrived.prints[0] !== own.prints[0] && arrived.prints[1] === own.prints[1], [
    own.prints,
    arrived.prints,
  ]);
  await open("?backdrop-time=5", "#4.1");
  later = await look(page, PRESENT);
  test("a Crowd's step is the same when jumped to", later.prints.join(",") === arrived.prints.join(","), [arrived.prints, later.prints]);

  // The overview and print: every backdrop as one still frame, and still one GL context for all of it.
  await page.keyboard.press("g");
  await page.waitForSelector("[data-deck-mode=overview]");
  const overview = await look(page, "[data-deck-mode=overview]");
  test("the overview shows each backdrop as one still frame", drawn(overview, 5) && overview.states.every((s) => s === "still"), overview);
  await page.keyboard.press("Escape");
  await page.keyboard.press("p");
  await page.waitForSelector("[data-deck-mode=print]");
  const printed = await look(page, "[data-deck-mode=print]");
  test("print shows each backdrop as one still frame", drawn(printed, 5) && printed.states.every((s) => s === "still"), printed);
  test(
    "print draws a step's final picture, as the overview does",
    printed.prints.length === 5 && printed.states.join(",") === overview.states.join(","),
    [overview.prints, printed.prints],
  );

  // SAFETY: the init script's own list on the window.
  const contexts = await page.evaluate(() => (window as Window & { glContexts?: Array<unknown> }).glContexts!.length);
  test("every backdrop in the deck shares one GL context", contexts === 1, `${contexts} contexts`);

  // Through a slide transition, there and back: the snapshot is taken and the picture is there on arrival.
  await open("", "#2");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(150);
  const leaving = await page.evaluate(() => document.documentElement.dataset.transition ?? "");
  await page.waitForTimeout(900);
  const gone = await page.evaluate((root) => document.querySelectorAll(`${root} [data-backdrop]`).length, PRESENT);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(150);
  const back = await look(page, PRESENT);
  test(
    "a transition carries a backdrop slide out and back, drawn on arrival",
    (moving ? leaving === "fade" : leaving === "") && gone === 0 && drawn(back, 2),
    { leaving, gone, back },
  );
  await page.waitForTimeout(900);

  if (moving) {
    // A lost context keeps the last frame; a restored one moves again.
    await page.evaluate(() => {
      // SAFETY: the init script's own list on the window, and a place to keep the extension that loses and restores a context.
      const w = window as Window & { glContexts?: Array<WebGLRenderingContext>; lose?: WEBGL_lose_context | null };
      w.lose = w.glContexts![0].getExtension("WEBGL_lose_context");
      w.lose!.loseContext();
    });
    await page.waitForTimeout(300);
    const lostA = await look(page, PRESENT);
    await page.waitForTimeout(500);
    const lostB = await look(page, PRESENT);
    test("a lost GL context leaves the last frame standing", drawn(lostA, 2) && lostA.prints.join(",") === lostB.prints.join(","), [
      lostA.prints,
      lostB.prints,
    ]);
    // SAFETY: set just above.
    await page.evaluate(() => (window as Window & { lose?: WEBGL_lose_context | null }).lose!.restoreContext());
    await page.waitForTimeout(900);
    const restored = await look(page, PRESENT);
    test("a restored GL context draws again", drawn(restored, 2) && restored.prints.join(",") !== lostB.prints.join(","), restored.prints);
  }

  test("nothing is fetched", blocked.length === 0, blocked.join(", "));
  test("no page or console errors", errors.length === 0, errors);
  await ctx.close();
}
