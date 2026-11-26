// The navigation and motion checks npm run verify runs over every built deck (scripts/verify.ts calls
// walkDeck once per deck). Nothing here knows any deck: it walks whatever the deck holds.
//
// 1. Walk: → from the first step to the last, one step at a time. Every move must go to the next step.
//    Each step is paused at its first and last frame and compared with the still picture before and
//    after it (a pop: something that jumps in one frame where nothing should move). The first time a
//    kind of move shows up (a transition with its direction, a cut, a kind of build), every frame of it
//    is shot and checked for pops inside it and for flashes. A move is held and stepped by setting the
//    current time of its paused animations, so the frames are exact, whatever the machine's speed.
// 2. Back: ← from the last step to the first. It must retrace the walk step by step, picture by
//    picture, and leave nothing behind on <html> or on a Morph.
// 3. Jump: every step by its URL hash (#5.2), in a shuffled order, plus a fresh load of two; each must
//    look like the walk got there.
// 4. Burst: the whole deck, forwards then back, with presses and right-clicks faster than the
//    transitions run. It must land on the exact step.
// 5. Final states: with reduced motion nothing may animate, and each slide's last step must look like
//    the walk's. The overview (G) and print (P, the same view `npm run pdf` prints) must show each
//    slide like the walk's last step.
//
// Pictures go to dist/qa/<deck>/ (see docs/checklist.md, "Reading the QA pictures").
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BrowserContext, CDPSession, Page } from "playwright-core";
import { changedBox, decodePng, gridDiff, luminanceGrid, tiles } from "./png.ts";
import type { Grid } from "./png.ts";

export type Check = (name: string, ok: unknown, detail?: string) => void;

/** An offline context like verify's own, with or without reduced motion, at a size. */
export type OpenContext = (reducedMotion: boolean, viewport: { width: number; height: number }) => Promise<BrowserContext>;

/** Where the deck is: the 1-based slide number, its id, the build step and the slide's step count. */
interface At {
  slide: number;
  id: string;
  step: number;
  count: number;
}

/** What the page helper reports when it holds a move: how long it runs and what moves. */
interface Hold {
  end: number;
  what: Array<string>;
  transition: string | null;
  direction: string;
}

/** The helpers verify installs on each page it walks (installQa, below). */
interface Qa {
  frames: (n: number) => Promise<void>;
  at: () => At | null;
  started: () => Promise<void>;
  hold: () => Hold;
  seek: (t: number) => Promise<void>;
  scripted: () => boolean;
  settle: () => Promise<void>;
  moving: () => Array<string>;
  leftovers: () => Array<string>;
  signature: () => string;
  box: (selector: string, n: number) => { x: number; y: number; width: number; height: number } | null;
}

declare global {
  interface Window {
    qa: Qa;
  }
}

/**
 * Runs in the page before the deck. A test clock: performance.now() and the time requestAnimationFrame
 * passes on can be moved forward, so a count-up driven by script ends at once like the CSS motion
 * around it. Loops have no end: they are stopped (CSS) or held at their start (SVG), so every still
 * picture of a step is the same picture.
 */
function installQa() {
  const realNow = performance.now.bind(performance);
  const realFrame = window.requestAnimationFrame.bind(window);
  let offset = 0;

  // While a move is held, the clock stands at the frame being shot.
  let frozen: number | null = null;
  let waiting = 0;
  performance.now = () => frozen ?? realNow() + offset;
  // oxlint-disable-next-line promise/prefer-await-to-callbacks -- it stands in for requestAnimationFrame, a callback API
  window.requestAnimationFrame = (callback) => {
    waiting++;

    return realFrame((t) => {
      waiting--;
      // oxlint-disable-next-line promise/prefer-await-to-callbacks -- as above
      callback(frozen ?? t + offset);
    });
  };

  const frames = (n: number) =>
    new Promise<void>((ready) => {
      const tick = (left: number) => {
        if (left <= 0) {
          ready();
        } else {
          realFrame(() => tick(left - 1));
        }
      };

      tick(n);
    });

  // oxlint-disable-next-line unicorn/consistent-function-scoping -- runs in the page, which gets only installQa
  const root = () => document.documentElement;

  // oxlint-disable-next-line unicorn/consistent-function-scoping -- runs in the page, which gets only installQa
  const present = () => document.querySelector<HTMLElement>("[data-deck-mode=present] [data-slide]");

  // oxlint-disable-next-line unicorn/consistent-function-scoping -- runs in the page, which gets only installQa
  const pseudo = (a: Animation) => {
    const { effect } = a;

    return effect && "pseudoElement" in effect && typeof effect.pseudoElement === "string" ? effect.pseudoElement : "";
  };

  // oxlint-disable-next-line unicorn/consistent-function-scoping -- runs in the page, which gets only installQa
  const isElement = (x: unknown): x is Element =>
    typeof x === "object" && x !== null && Object.prototype.isPrototypeOf.call(Element.prototype, x);

  const isView = (a: Animation) => pseudo(a).startsWith("::view-transition");

  // oxlint-disable-next-line unicorn/consistent-function-scoping -- runs in the page, which gets only installQa
  const endOf = (a: Animation) => Number(a.effect?.getComputedTiming().endTime);

  const label = (a: Animation) => {
    if ("transitionProperty" in a) {
      return `transition ${String(a.transitionProperty)}`;
    }

    const name = "animationName" in a ? String(a.animationName) : "script animation";

    return isView(a) ? `${name} ${pseudo(a).replace("::view-transition-", "")}` : name;
  };

  const describe = (a: Animation) => {
    const { effect } = a;
    const found: unknown = effect && "target" in effect ? effect.target : null;
    const target = isElement(found) ? found : null;
    const classes = target?.getAttribute("class")?.trim().split(/\s+/u).slice(0, 3).join(".");

    return `${label(a)} on ${target ? `${target.tagName.toLowerCase()}${classes ? `.${classes}` : ""}` : "?"}`;
  };

  /** Loops have no end to show: stopped, like `settle` stops them, so they are never part of a picture. */
  const stopLoops = () => {
    for (const a of document.getAnimations()) {
      if (!Number.isFinite(endOf(a))) {
        a.cancel();
      }
    }

    for (const svg of document.querySelectorAll("svg")) {
      svg.pauseAnimations();
      svg.setCurrentTime(0);
    }
  };

  let held: Array<Animation> = [];

  // The clock's time when the held move started.
  let zero = 0;

  window.qa = {
    frames,
    at() {
      const s = present();

      return s
        ? {
            slide: Number(s.dataset.slide),
            id: s.dataset.slideId ?? "",
            step: Number(s.dataset.build),
            count: Number(s.dataset.buildCount),
          }
        : null;
    },
    /** After a move: until its view transition's animations exist, if it has one. */
    async started() {
      await frames(2);

      for (let i = 0; i < 40 && root().dataset.transition && !document.getAnimations().some((a) => isView(a)); i++) {
        await frames(1);
      }
    },
    /** Pauses everything that is moving, and stops the loops. */
    hold() {
      stopLoops();
      held = document.getAnimations().filter((a) => a.playState !== "finished" && Number.isFinite(endOf(a)));
      let end = 0;
      let elapsed = 0;

      for (const a of held) {
        a.pause();
        elapsed = Math.max(elapsed, Number(a.currentTime ?? 0));
        end = Math.max(end, endOf(a));
      }

      const { style } = root();
      zero = performance.now() - elapsed;
      frozen = zero;
      const dx = style.getPropertyValue("--dx");

      return {
        end: Math.min(end, 4000),
        what: [...new Set(held.map((a) => label(a)))].toSorted(),
        transition: root().dataset.transition ?? null,
        direction: dx ? `${dx} ${style.getPropertyValue("--dy")}` : "",
      };
    },
    /** Every held animation, and the clock, to `t` ms into the move; then a frame for script that runs on the clock. */
    async seek(t: number) {
      for (const a of held) {
        a.currentTime = Math.min(t, endOf(a));
      }

      frozen = zero + t;

      if (waiting > 0) {
        await frames(2);
      }
    },
    /** Whether script still asks for frames (a count-up running on the clock). */
    scripted() {
      return waiting > 0;
    },
    /** Ends every move, stops every loop and moves the test clock on, until nothing is left to end. */
    async settle() {
      frozen = null;

      for (let round = 0; round < 40; round++) {
        let busy = Boolean(root().dataset.transition);

        stopLoops();

        for (const a of document.getAnimations()) {
          if (a.playState !== "finished") {
            busy = true;

            try {
              a.finish();
            } catch {
              a.cancel();
            }
          }
        }

        for (const media of document.querySelectorAll<HTMLMediaElement>("video, audio")) {
          media.pause();
        }

        offset += 10_000;
        await frames(2);

        if (!busy && !root().dataset.transition) {
          return;
        }
      }
    },
    /** What is animating right now, each as "name on element". */
    moving() {
      return document
        .getAnimations()
        .filter((a) => {
          const timing = a.effect?.getComputedTiming();

          return a.playState !== "finished" && (Number(timing?.duration) > 1 || Number(timing?.delay) > 0 || isView(a));
        })
        .map((a) => describe(a));
    },
    /** Whatever a finished transition must not leave behind. */
    leftovers() {
      const out: Array<string> = [];
      const html = root();

      if (html.dataset.transition) {
        out.push(`<html data-transition="${html.dataset.transition}">`);
      }

      if (Object.hasOwn(html.dataset, "transitionBack")) {
        out.push("<html data-transition-back>");
      }

      if (html.getAttribute("style")) {
        out.push(`<html style="${html.getAttribute("style")}">`);
      }

      for (const el of document.querySelectorAll<HTMLElement>('[style*="view-transition-name"]')) {
        if (!el.matches("[data-deck-mode=present] [data-slide]")) {
          out.push(
            `view-transition-name ${el.style.viewTransitionName} on <${el.tagName.toLowerCase()}${el.dataset.morph ? ` data-morph="${el.dataset.morph}"` : ""}>`,
          );
        }
      }

      if (document.getAnimations().some((a) => isView(a))) {
        out.push("a view transition still running");
      }

      return out;
    },
    /**
     * A hash of what the slide shows: its text, and which of its elements can be seen. A step that has
     * just played and the same step settled carry other classes, but must show the same.
     */
    signature() {
      const s = present();
      let text = s?.textContent ?? "";

      for (const el of s?.querySelectorAll("*") ?? []) {
        text += el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) ? "1" : "0";
      }

      let h1 = 3_735_928_559;
      let h2 = 1_103_547_991;

      for (let i = 0; i < text.length; i++) {
        const c = text.codePointAt(i) ?? 0;
        h1 = Math.imul(h1 ^ c, 2_654_435_761);
        h2 = Math.imul(h2 ^ c, 1_597_334_677);
      }

      return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
    },
    box(selector: string, n: number) {
      const el = document.querySelectorAll(selector)[n];

      if (!el) {
        return null;
      }

      el.scrollIntoView({ block: "nearest" });
      const r = el.getBoundingClientRect();

      return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height };
    },
  };

  // Video plays on its own clock; a slide's picture is compared without it. The overlay is the deck's, not the slide's.
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = "[data-deck-overlay], [data-stage] video { visibility: hidden !important; }";
    document.head.append(style);
  });
}

/** The built-in transitions that take a direction, and the names of the directions (--dx --dy). */
const DIRECTIONAL = new Set(["wipe", "shove", "flip", "split"]);

const DIRECTION_NAMES = new Map([
  ["-1 0", "left"],
  ["1 0", "right"],
  ["0 -1", "up"],
  ["0 1", "down"],
]);

const VIEWPORT = { width: 960, height: 540 };
const PRESENT = "[data-deck-mode=present] [data-stage]";

/** Pictures are shot this wide; the bottom of the stage (the progress bar) is left off. */
const SHOT_WIDTH = 480;
const KEEP_HEIGHT = 1068 / 1080;

/** Comparisons are on a grid of cells of 5×5 shot pixels. */
const COLS = 96;
const ROWS = 53;

/** Two still pictures of the same step: fewer cells than this changed by more than a tenth of the luminance range. */
const SAME = 0.004;

/** A thumbnail or a print page against the live stage: rendered at another size, so a little looser. */
const SAME_ELSEWHERE = 0.02;

/** The overview's thumbnails are compared on cells of 20×20 shot pixels. */
const COARSE_COLS = 24;
const COARSE_ROWS = 13;

/** A pop: this share of cells changes by more than a tenth in one frame where nothing should move. */
const POP = 0.01;

/** Where a move meets the still picture: a cell that changes this much has popped. */
const EDGE = 0.2;

/** One frame on a 60 Hz display, in ms. */
const DISPLAY_FRAME = 1000 / 60;

/** In a move, a cell that changes this much in one frame has jumped. */
const JUMP = 0.3;

/** Half a flash: a change in a tile's luminance this large, the darker side below 0.8 (WCAG 2.3.1's general flash). */
const SWING = 0.1;
const MAX_FLASHES_PER_SECOND = 3;

/** Frames per second when a whole move is shot: enough to count three swings a second many times over. */
const FPS = 20;

/** A long move is shot at fewer frames a second, down to MAX_FRAMES in all (still ten a second for a 3 s entrance). */
const MAX_FRAMES = 30;

/** Slides walked on one page; a longer deck is walked on several at once. */
const SEGMENT = 12;

/** The longest a move is followed, in ms. */
const MAX_MOVE = 4000;

interface Shot {
  png: Buffer;
  grid: Grid;
}

/** The page helpers, through one page and its CDP session. */
function driver(page: Page, cdp: CDPSession) {
  const qa = {
    at: () => page.evaluate(() => window.qa.at()),
    started: () => page.evaluate(() => window.qa.started()),
    hold: () => page.evaluate(() => window.qa.hold()),
    seek: (t: number) => page.evaluate((time) => window.qa.seek(time), t),
    scripted: () => page.evaluate(() => window.qa.scripted()),
    settle: () => page.evaluate(() => window.qa.settle()),
    moving: () => page.evaluate(() => window.qa.moving()),
    leftovers: () => page.evaluate(() => window.qa.leftovers()),
    signature: () => page.evaluate(() => window.qa.signature()),
  };

  /** A picture of the `n`th element matching `selector` (the live stage by default). */
  const shoot = async (selector = PRESENT, n = 0): Promise<Shot> => {
    const box = await page.evaluate(([sel, i]) => window.qa.box(sel, i), [selector, n] as const);

    if (!box) {
      throw new Error(`nothing to shoot at ${selector} #${n}`);
    }

    const { data } = await cdp.send("Page.captureScreenshot", {
      format: "png",
      clip: { x: box.x, y: box.y, width: box.width, height: box.height * KEEP_HEIGHT, scale: SHOT_WIDTH / box.width },
      // A print page is wider than the window. The overview scrolls inside itself, so its thumbnails are shot in view: faster.
      captureBeyondViewport: selector.includes("print"),
    });

    const png = Buffer.from(data, "base64");

    return { png, grid: luminanceGrid(decodePng(png), COLS, ROWS) };
  };

  return { qa, shoot };
}

const key = (a: At) => `${a.slide}.${a.step}`;
const where = (a: At | null) => (a ? `${a.slide}.${a.step} (${a.id})` : "nowhere");

/** A seeded shuffle, so a failing order can be run again. */
function shuffled<T>(items: Array<T>, seed: string): Array<T> {
  let s = 2_166_136_261;

  for (let i = 0; i < seed.length; i++) {
    s = Math.imul(s ^ (seed.codePointAt(i) ?? 0), 16_777_619) >>> 0;
  }

  const random = () => {
    s = (s + 1_831_565_813) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };

  const out = [...items];

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

/** A frame of a move: when (ms into it; before and after are -1 and end + 1), and its picture. */
interface Frame extends Shot {
  t: number;
  label: string;
}

/** What one move did, for the report and the pictures. */
interface Move {
  from: string;
  to: string;
  back: boolean;
  kind: string;
  end: number;
  start: number;
  finish: number;
  pops: Array<string>;
  flashes: Array<string>;
  frames?: Array<Frame>;
}

/**
 * Flashes, as WCAG 2.3.1 counts them: a flash is a pair of opposing changes in a tile's luminance,
 * each at least SWING, with the darker side below 0.8. More than MAX_FLASHES_PER_SECOND within any
 * one second fails. The slide is cut into 4×4 tiles, each about the area the guideline names.
 */
function flashes(frames: Array<Frame>): Array<string> {
  const series = frames.map((f) => tiles(f.grid, 4));
  const found: Array<string> = [];

  for (let tile = 0; tile < 16; tile++) {
    // The times of each change, once it has gone SWING from the last turn.
    const changes: Array<number> = [];
    let turn = series[0][tile];
    let dir = 0;

    for (const [i, f] of frames.entries()) {
      const v = series[i][tile];
      const d = v - turn;

      if (Math.abs(d) >= SWING && Math.min(v, turn) < 0.8 && Math.sign(d) !== dir) {
        changes.push(f.t);
        dir = Math.sign(d);
        turn = v;
      } else if (Math.sign(d) === dir) {
        // Still going the same way: the turn moves with it.
        turn = dir > 0 ? Math.max(turn, v) : Math.min(turn, v);
      }
    }

    // A flash ends on its second change: count pairs whose second change is within the second.
    const ends = changes.filter((_, i) => i % 2 === 1);
    const from = ends.find((t) => ends.filter((u) => u >= t - 1000 && u <= t).length > MAX_FLASHES_PER_SECOND);

    if (from !== undefined) {
      found.push(
        `tile ${tile % 4},${Math.floor(tile / 4)}: ${ends.length} flashes, more than ${MAX_FLASHES_PER_SECOND} in the second up to ${Math.round(from)} ms`,
      );
    }
  }

  return found;
}

/** Intervals between frames of a move in which a lot of the picture moves far: candidates for a pop. */
function jumpy(frames: Array<Frame>): Array<number> {
  return frames.slice(1).flatMap((f, i) => (gridDiff(frames[i].grid, f.grid, JUMP).changed > POP ? [i] : []));
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** Where on the 1920×1080 slide two pictures differ, as "x 120–480, y 300–360". */
function area(a: Grid, b: Grid, big = 0.1): string {
  const box = changedBox(a, b, big);

  return box
    ? `x ${Math.round(box.left * 1920)}–${Math.round(box.right * 1920)}, y ${Math.round(box.top * 1080 * KEEP_HEIGHT)}–${Math.round(box.bottom * 1080 * KEEP_HEIGHT)}`
    : "nowhere";
}

/** Frames in a row of a film strip, and how wide each is. */
const PER_ROW = 8;
const FRAME_WIDTH = 240;
const STRIP_WIDTH = PER_ROW * (FRAME_WIDTH + 8);

/** A film strip of a move's frames, read left to right, row by row, with each frame's time and change; a red frame is where a check failed. */
function stripHtml(title: string, frames: Array<Frame>, bad: Set<number>): string {
  const lum = frames.map((f) => f.grid.cells.reduce((a, b) => a + b, 0) / f.grid.cells.length);
  const points = lum.map((l, i) => `${(i / Math.max(1, lum.length - 1)) * STRIP_WIDTH},${60 - l * 56}`).join(" ");

  const cells = frames
    .map((f, i) => {
      const d = i ? gridDiff(frames[i - 1].grid, f.grid).changed : 0;

      return `<figure style="margin:0;width:${FRAME_WIDTH}px"><img src="data:image/png;base64,${f.png.toString("base64")}" style="width:${FRAME_WIDTH}px;display:block;outline:${bad.has(i) ? "4px solid #e00" : "1px solid #555"}"><figcaption>${i}: ${f.label} · L ${lum[i].toFixed(2)} · Δ ${pct(d)}</figcaption></figure>`;
    })
    .join("");

  return `<h2>${title}</h2><p>Mean luminance, frame by frame:</p><svg width="${STRIP_WIDTH}" height="64" style="display:block;background:#222;margin-bottom:8px"><polyline points="${points}" fill="none" stroke="#fc0" stroke-width="2"/></svg><div style="display:flex;flex-wrap:wrap;gap:8px">${cells}</div>`;
}

const page = (body: string, width: number) =>
  `<!doctype html><meta charset="utf-8"><body style="margin:16px;background:#111;color:#ddd;font:12px/1.4 ui-monospace,monospace;width:${width}px">${body}</body>`;

/** Lays out `html` in a page of its own and saves it as one tall picture. */
async function savePicture(lab: Page, html: string, path: string) {
  await lab.setContent(html);
  await lab.screenshot({ path, fullPage: true });
}

/** Where a step was on the walk: its place, picture and signature. */
interface Seen {
  at: At;
  shot: Shot;
  signature: string;
}

/** A page of the deck with the helpers installed, at `hash`, settled. */
async function openDeck(open: OpenContext, file: string, hash: string, options: { reduced?: boolean; print?: boolean } = {}) {
  const ctx = await open(Boolean(options.reduced), VIEWPORT);
  await ctx.addInitScript(installQa);

  if (options.print) {
    // As `npm run pdf` prints it: the print view stays, with no dialog.
    await ctx.addInitScript(() => {
      window.print = () => {};
    });
  }

  const tab = await ctx.newPage();
  const errors: Array<string> = [];
  tab.on("pageerror", (e) => errors.push(String(e)));
  const { qa, shoot } = driver(tab, await ctx.newCDPSession(tab));

  const load = async (h: string) => {
    // A WebGL backdrop moves for as long as its slide is shown; held at one time, a slide is one picture.
    await tab.goto(`file://${file}?backdrop-time=0${h}`);
    await tab.waitForSelector(PRESENT);
    await tab.evaluate(async () => {
      await document.fonts.ready;
    });
    await qa.settle();
  };

  await load(hash);

  const record = async (): Promise<Seen> => {
    const at = await qa.at();

    if (!at) {
      throw new Error("no slide on the stage");
    }

    return { at, shot: await shoot(), signature: await qa.signature() };
  };

  return { ctx, tab, qa, shoot, errors, load, record };
}

/** How a step differs from the walk's picture of it, or "" when it looks the same. */
function differs(now: Seen, want: Seen): string {
  if (key(now.at) !== key(want.at)) {
    return `landed on ${where(now.at)}`;
  }

  const d = gridDiff(now.shot.grid, want.shot.grid).changed;

  if (now.signature !== want.signature) {
    return `shows other elements or text (${pct(d)} of cells differ)`;
  }

  return d > SAME ? `looks different (${pct(d)} of cells, ${area(now.shot.grid, want.shot.grid)})` : "";
}

const hashOf = (a: At) => `#${a.slide}${a.step ? `.${a.step}` : ""}`;

/** All the checks above, on one built deck (an absolute path). `name` is its file name in dist/. */
export async function walkDeck(open: OpenContext, file: string, name: string, check: Check, qaDir: string) {
  const out = resolve(qaDir, name.replace(/\.html$/u, ""));
  rmSync(out, { recursive: true, force: true });
  mkdirSync(resolve(out, "motion"), { recursive: true });
  const started = performance.now();
  const seconds: Record<string, number> = {};

  const timed = async <T>(label: string, run: () => Promise<T>): Promise<T> => {
    const from = performance.now();

    try {
      return await run();
    } finally {
      seconds[label] = Math.round((performance.now() - from) / 100) / 10;
    }
  };

  // Reduced motion and print need nothing from the walk: they start with it and are compared after.
  const reducedRun = timed("reduced motion", () => reducedMotion(open, file));
  const printRun = timed("print", () => printed(open, file));

  const deck = await openDeck(open, file, "#1");

  // The visible slides, from the overview.
  await deck.tab.keyboard.press("g");

  const slides = await deck.tab.$$eval("[data-deck-mode=overview] [data-slide]", (els) =>
    els.map((e) => ({ slide: Number(e.dataset.slide), id: e.dataset.slideId ?? "", hidden: e.classList.contains("opacity-40") })),
  );

  await deck.tab.keyboard.press("Escape");
  const visible = slides.filter((s) => !s.hidden);
  const shotKinds = new Set<string>();
  const leftBehind: Array<string> = [];

  /** The moves made on one page: `move` presses, holds and shoots one, and keeps it in `moves`. */
  const mover = (on: Awaited<ReturnType<typeof openDeck>>) => {
    const { tab, qa, shoot, record } = on;
    const moves: Array<Move> = [];

    /** One press, held at its first and last frame (every frame, the first time its kind shows up), then settled. */
    const move = async (dir: 1 | -1, before: Seen): Promise<Seen> => {
      await tab.keyboard.press(dir === 1 ? "ArrowRight" : "ArrowLeft");
      await qa.started();
      const hold = await qa.hold();
      const now = await qa.at();
      const slideChange = now?.slide !== before.at.slide;
      const direction = DIRECTIONAL.has(hold.transition ?? "") ? ` ${DIRECTION_NAMES.get(hold.direction) ?? hold.direction}` : "";
      const moving = hold.what.filter((w) => !w.startsWith("transition width")).join(", ");
      const kind = slideChange ? `${hold.transition ?? "cut"}${direction}` : `build: ${moving || "no motion"}`;

      // Every frame the first time a move shows up: forwards by what moves (each kind of entrance), back by its transition.
      const sample = dir === 1 ? `${kind} forward ${hold.what.join(",")}` : `${kind} back`;
      const full = !shotKinds.has(sample);
      shotKinds.add(sample);
      const count = full ? Math.min(MAX_FRAMES, Math.max(2, Math.ceil((hold.end / 1000) * FPS))) : 1;
      const frames: Array<Frame> = [{ ...before.shot, t: -1, label: "before" }];

      for (let i = 0; i < count; i++) {
        const t = (hold.end * i) / count;
        await qa.seek(t);
        frames.push({ ...(await shoot()), t, label: `${Math.round(t)} ms` });
      }

      // Script motion (a count-up) can run past the CSS: follow the clock until it stops asking for frames.
      let { end } = hold;
      await qa.seek(end);

      while (end < MAX_MOVE && (await qa.scripted())) {
        if (full) {
          frames.push({ ...(await shoot()), t: end, label: `${Math.round(end)} ms` });
        }

        end += 1000 / FPS;
        await qa.seek(end);
      }

      frames.push({ ...(await shoot()), t: end, label: `${Math.round(end)} ms` });
      const pops: Array<string> = [];

      // Where the picture moves far between two frames of a build, shoot every display frame (60 a second)
      // in between: a fast fade spreads over several, a pop happens in one. Not for a slide transition:
      // it is declared motion, and a push moves everything every frame.
      const candidates = full && !hold.transition ? jumpy(frames.slice(1)).slice(0, 4) : [];

      for (const i of candidates) {
        const [from, to] = [frames[i + 1], frames[i + 2]];
        let prev = from;

        for (let t = from.t + DISPLAY_FRAME; t < to.t + DISPLAY_FRAME / 2; t += DISPLAY_FRAME) {
          await qa.seek(Math.min(t, to.t));
          const next = { ...(await shoot()), t, label: `${Math.round(t)} ms` };
          const d = gridDiff(prev.grid, next.grid, JUMP).changed;

          if (d > POP) {
            pops.push(
              `${pct(d)} of the picture jumps in one frame, between ${prev.label} and ${next.label} (${area(prev.grid, next.grid, JUMP)})`,
            );
            break;
          }

          prev = next;
        }
      }

      await qa.settle();
      const after = await record();
      const [first] = frames.slice(1);
      const held = frames.at(-1) ?? first;
      const lastHeld = after.shot;
      frames.push({ ...after.shot, t: end + 1, label: "after" });

      // A view transition's snapshot is drawn a little differently from the live page (text edges move by
      // under a pixel, up to 0.14 in a cell), so where a move meets a still picture a cell must change by EDGE.
      const start = gridDiff(before.shot.grid, first.grid, EDGE).changed;
      const finish = gridDiff(held.grid, lastHeld.grid, EDGE).changed;

      // A cut changes the slide at once on purpose, and so does a step back within a slide: it lands settled.
      const cut = (slideChange && !hold.transition) || (!slideChange && dir === -1);

      if (start > POP && !cut) {
        pops.push(`${pct(start)} of the picture jumps as the move starts (${area(before.shot.grid, first.grid, EDGE)})`);
      }

      if (finish > POP) {
        pops.push(`${pct(finish)} of the picture jumps as the move ends (${area(held.grid, lastHeld.grid, EDGE)})`);
      }

      const m: Move = {
        from: where(before.at),
        to: where(after.at),
        back: dir === -1,
        kind,
        end: Math.round(end),
        start: cut ? 0 : start,
        finish,
        pops,
        flashes: full ? flashes(frames) : [],
        frames: full || pops.length > 0 ? frames : undefined,
      };

      moves.push(m);
      const left = await qa.leftovers();

      if (left.length > 0) {
        leftBehind.push(`${m.from} → ${m.to}: ${left.join(", ")}`);
      }

      return after;
    };

    return { moves, move };
  };

  // 1. Walk, in segments of SEGMENT slides on pages of their own, at the same time. A segment opens on
  // its first slide by hash (settled, as a jump lands) and walks on to the first step of the next one,
  // so every move between two slides is made once.
  const starts = visible.filter((_, i) => i % SEGMENT === 0).map((s) => s.slide);
  const walkProblems: Array<string> = [];

  const segments = await timed("walk", () =>
    Promise.all(
      starts.map(async (first, n) => {
        const on = n === 0 ? deck : await openDeck(open, file, `#${first}`);
        const { moves, move } = mover(on);
        const stop = starts[n + 1];
        const seen = [await on.record()];

        for (
          let [current] = seen;
          stop === undefined
            ? !(current.at.slide === visible.at(-1)?.slide && current.at.step >= current.at.count)
            : current.at.slide < stop;
        ) {
          const next = await move(1, current);
          const nextSlide = visible.find((s) => s.slide > current.at.slide)?.slide;
          const expected = current.at.step < current.at.count ? `${current.at.slide}.${current.at.step + 1}` : `${nextSlide}.0`;

          if (key(next.at) !== expected) {
            walkProblems.push(`→ from ${where(current.at)} went to ${where(next.at)}, not ${expected}`);
            break;
          }

          current = next;
          seen.push(current);
        }

        return { on, moves, seen };
      }),
    ),
  );

  // Each segment's last step is the next one's first: the walked picture is kept.
  const walk = segments.flatMap(({ seen }, n) => (n < segments.length - 1 ? seen.slice(0, -1) : seen));
  check("→ goes through every step of every visible slide, one at a time", walkProblems.length === 0, walkProblems.join("; "));

  // The overview, while the walk's pictures are fresh: each thumbnail against the slide's last step.
  const overview = await timed("overview", async () => {
    await deck.tab.keyboard.press("g");
    await deck.tab.waitForSelector("[data-deck-mode=overview]");
    await deck.qa.settle();
    const thumbs = new Map<number, Shot>();

    for (const [i, s] of slides.entries()) {
      if (!s.hidden) {
        thumbs.set(s.slide, await deck.shoot("[data-deck-mode=overview] [data-stage]", i));
      }
    }

    await deck.tab.keyboard.press("Escape");

    return thumbs;
  });

  // 2. Back, segment by segment, each from its last step to its first; 3. jumps and 4. bursts on pages of their own; all at once.
  const backs = segments.map(({ on, seen }) => ({ on, seen, ...mover(on) }));

  const [backProblems, jumpProblems, burstProblems] = await Promise.all([
    timed("back", async () => {
      const lists = await Promise.all(
        backs.map(async ({ on, seen, move }) => {
          const problems: Array<string> = [];
          await on.load(hashOf(seen.at(-1)?.at ?? seen[0].at));
          let now = await on.record();

          for (let i = seen.length - 1; i > 0; i--) {
            // A step reached by hash is settled, so the first press starts from where the deck is.
            now = await move(-1, i === seen.length - 1 ? now : seen[i]);
            const wrong = differs(now, seen[i - 1]);

            if (wrong) {
              problems.push(`← from ${where(seen[i].at)} to ${where(seen[i - 1].at)} ${wrong}`);
            }

            if (key(now.at) !== key(seen[i - 1].at)) {
              break;
            }
          }

          return problems;
        }),
      );

      return lists.flat();
    }),
    timed("jump", () => jumps(open, file, walk, name)),
    timed("burst", () => bursts(open, file, walk)),
  ]);

  const moves = [...segments.flatMap((g) => g.moves), ...backs.toReversed().flatMap((g) => g.moves)];
  const errors = segments.flatMap(({ on }) => on.errors);

  const kinds = [...new Set(moves.flatMap((m) => (m.back && !m.kind.startsWith("build") ? [m.kind] : [])))];
  check(
    `← retraces every step, across every transition in the deck (${kinds.join(", ") || "none"})`,
    backProblems.length === 0,
    backProblems.slice(0, 4).join("; "),
  );
  check(
    "no transition leaves anything behind (data-transition, styles on <html>, view-transition-name)",
    leftBehind.length === 0,
    leftBehind.slice(0, 4).join("; "),
  );
  check(
    "a jump to any step (#n.s, or opening the file there) looks like walking there",
    jumpProblems.length === 0,
    jumpProblems.slice(0, 4).join("; "),
  );
  check(
    "fast presses and clicks during transitions land on the exact step, forwards and back",
    burstProblems.length === 0,
    burstProblems.slice(0, 4).join("; "),
  );
  check("no page errors while walking", errors.length === 0, errors.slice(0, 3).join(" | "));

  for (const { on } of segments) {
    await on.ctx.close();
  }

  const reduced = await reducedRun;
  const print = await printRun;
  check(
    "with reduced motion, nothing animates on any step (no transition, build or entrance)",
    reduced.moving.length === 0,
    reduced.moving.slice(0, 4).join("; "),
  );

  // 5. Final states, side by side.
  const problems = { reduced: new Array<string>(), overview: new Array<string>(), print: new Array<string>() };
  const sheet: Array<string> = [];
  const finals = new Map(walk.flatMap((w) => (w.at.step === w.at.count ? [[w.at.slide, w] as const] : [])));

  for (const s of visible) {
    const ref = finals.get(s.slide);

    if (!ref) {
      continue;
    }

    const row = [figure(ref.shot, `${s.slide} ${s.id} · walk, step ${ref.at.step}`, true)];

    for (const [mode, shots, limit] of [
      ["reduced", reduced.shots, SAME],
      ["overview", overview, SAME_ELSEWHERE],
      ["print", print, SAME_ELSEWHERE],
    ] as const) {
      const shot = shots.get(s.slide);

      // A thumbnail's text is a few pixels high: it is compared on a coarse grid.
      const coarse = (x: Shot) => (mode === "overview" ? luminanceGrid(decodePng(x.png), COARSE_COLS, COARSE_ROWS) : x.grid);
      const d = shot ? gridDiff(coarse(shot), coarse(ref.shot)).changed : 1;

      if (d > limit) {
        problems[mode].push(`${s.slide} ${s.id} (${shot ? `${pct(d)} of cells, ${area(coarse(shot), coarse(ref.shot))}` : "missing"})`);
      }

      row.push(shot ? figure(shot, `${mode} · Δ ${pct(d)}`, d <= limit) : `<figure style="margin:0;width:240px">${mode}: missing</figure>`);
    }

    sheet.push(`<div style="display:flex;gap:8px;margin-bottom:12px">${row.join("")}</div>`);
  }

  check(
    "with reduced motion, every slide ends as it does with motion",
    problems.reduced.length === 0,
    problems.reduced.slice(0, 4).join("; "),
  );
  check("the overview shows every slide in its final state", problems.overview.length === 0, problems.overview.slice(0, 4).join("; "));
  check(
    "print (and so npm run pdf) shows every slide in its final state",
    problems.print.length === 0,
    problems.print.slice(0, 4).join("; "),
  );

  const popped = moves.filter((m) => m.pops.length > 0);
  const flashed = moves.filter((m) => m.flashes.length > 0);
  const strips = moves.filter((m) => m.frames);
  check(
    `no single-frame pops: every move starts and ends where the picture is (${moves.length} moves; every frame of ${strips.length} of them)`,
    popped.length === 0,
    popped
      .slice(0, 4)
      .map((m) => `${m.from} → ${m.to} (${m.kind}): ${m.pops.join(", ")}`)
      .join("; "),
  );
  check(
    `no flashes: at most ${MAX_FLASHES_PER_SECOND} a second (a pair of big opposing luminance changes) in any part of the slide`,
    flashed.length === 0,
    flashed
      .slice(0, 4)
      .map((m) => `${m.from} → ${m.to}: ${m.flashes.join(", ")}`)
      .join("; "),
  );

  await timed("pictures", () => pictures(open, out, name, walk, sheet, moves));

  const report = {
    deck: name,
    seconds: Math.round((performance.now() - started) / 100) / 10,
    phases: seconds,
    steps: walk.map((w) => key(w.at)),
    moves: moves.map(({ frames, ...m }) => ({
      ...m,
      start: Number(m.start.toFixed(4)),
      finish: Number(m.finish.toFixed(4)),
      frames: frames?.length ?? 2,
    })),
    problems: { back: backProblems, leftBehind, jump: jumpProblems, burst: burstProblems, moving: reduced.moving, ...problems },
  };

  writeFileSync(resolve(out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
}

/** Every step by its URL hash, in a shuffled order, then two opened fresh: each must look like the walk there. */
async function jumps(open: OpenContext, file: string, walk: Array<Seen>, seed: string): Promise<Array<string>> {
  const deck = await openDeck(open, file, "#1");
  const problems: Array<string> = [];

  for (const w of shuffled(walk, seed)) {
    await deck.tab.evaluate((h) => (location.hash = h), hashOf(w.at));
    await deck.qa.started();
    await deck.qa.settle();
    const wrong = differs(await deck.record(), w);

    if (wrong) {
      problems.push(`${hashOf(w.at)} (by hash) ${wrong}`);
    }
  }

  for (const w of [walk[Math.floor(walk.length / 2)], walk.at(-1) ?? walk[0]]) {
    await deck.tab.goto("about:blank");
    await deck.load(hashOf(w.at));
    const wrong = differs(await deck.record(), w);

    if (wrong) {
      problems.push(`opening ${hashOf(w.at)} ${wrong}`);
    }
  }

  problems.push(...deck.errors);
  await deck.ctx.close();

  return problems;
}

/**
 * The whole deck in bursts: presses 30 ms apart, faster than the transitions, to the step before the
 * end, then one more; then right-clicks back to a third of the way, and the rest. Each must land on the
 * exact step, settled, with nothing left behind.
 */
async function bursts(open: OpenContext, file: string, walk: Array<Seen>): Promise<Array<string>> {
  const deck = await openDeck(open, file, "#1");
  const { tab, qa } = deck;
  const problems: Array<string> = [];
  const box = await tab.evaluate((sel) => window.qa.box(sel, 0), PRESENT);

  const burst = async (presses: number, dir: 1 | -1, want: Seen) => {
    for (let i = 0; i < presses; i++) {
      if (dir === 1) {
        await tab.keyboard.press(["ArrowRight", "Space", "PageDown"][i % 3]);
      } else if (box) {
        await tab.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
      }

      await tab.waitForTimeout(30);
    }

    await tab.waitForFunction(() => !document.documentElement.dataset.transition, undefined, { timeout: 5000 }).catch(() => {});
    await qa.settle();
    const now = await deck.record();

    if (key(now.at) !== key(want.at) || now.signature !== want.signature) {
      problems.push(
        `${presses} × ${dir === 1 ? "→" : "right-click"} landed on ${where(now.at)}${key(now.at) === key(want.at) ? ", not settled like the walk" : `, not ${where(want.at)}`}`,
      );
    }

    const left = await qa.leftovers();

    if (left.length > 0) {
      problems.push(`left behind: ${left.join(", ")}`);
    }
  };

  const n = walk.length - 1;
  const third = Math.floor(n / 3);
  await burst(n - 1, 1, walk[n - 1]);
  await burst(1, 1, walk[n]);
  await burst(n - third, -1, walk[third]);
  await burst(third, -1, walk[0]);
  problems.push(...deck.errors);
  await deck.ctx.close();

  return problems;
}

/** With reduced motion, → through the deck: what animates on each step, and a picture of each slide's last step. */
async function reducedMotion(open: OpenContext, file: string) {
  const deck = await openDeck(open, file, "#1", { reduced: true });
  const { tab, qa } = deck;
  const moving: Array<string> = [];
  const shots = new Map<number, Shot>();

  for (let previous = ""; ;) {
    const at = await qa.at();

    if (!at || key(at) === previous) {
      break;
    }

    if (at.step === at.count) {
      shots.set(at.slide, await deck.shoot());
    }

    previous = key(at);
    await tab.keyboard.press("ArrowRight");
    // Two frames: past anything that took its 1 ms.
    await tab.evaluate(() => window.qa.frames(2));
    const now = [...new Set(await qa.moving())];

    if (now.length > 0) {
      moving.push(`${where(await qa.at())}: ${now.slice(0, 3).join(", ")}`);
    }

    await tab.evaluate(() => window.qa.frames(2));
  }

  moving.push(...deck.errors);
  await deck.ctx.close();

  return { moving, shots };
}

/** Print (P), in print media: a picture of every page, by slide number. */
async function printed(open: OpenContext, file: string) {
  const deck = await openDeck(open, file, "#1", { print: true });
  const { tab } = deck;
  await tab.keyboard.press("p");
  await tab.waitForSelector("[data-deck-mode=print]");
  await tab.emulateMedia({ media: "print" });
  await deck.qa.settle();
  const pages = await tab.$$eval(".print-page", (els) => els.map((e) => Number(e.dataset.slide)));
  const shots = new Map<number, Shot>();

  for (const [i, slide] of pages.entries()) {
    shots.set(slide, await deck.shoot("[data-deck-mode=print] [data-stage]", i));
  }

  await deck.ctx.close();

  return shots;
}

/** A picture with its caption, outlined red when a check failed on it. */
const figure = (shot: Shot, caption: string, ok: boolean) =>
  `<figure style="margin:0"><img src="data:image/png;base64,${shot.png.toString("base64")}" width="240" style="display:block;outline:${ok ? "1px solid #555" : "4px solid #e00"}"><figcaption>${caption}</figcaption></figure>`;

/** dist/qa/<deck>/: steps.png, final-states.png and a film strip per move in motion/. */
async function pictures(open: OpenContext, out: string, name: string, walk: Array<Seen>, sheet: Array<string>, moves: Array<Move>) {
  const ctx = await open(false, { width: 1200, height: 800 });
  const lab = await ctx.newPage();
  const steps = walk.map((w) => figure(w.shot, `${w.at.slide}.${w.at.step} ${w.at.id}`, true)).join("");
  await savePicture(
    lab,
    page(`<h1>${name}: every step, walked with →</h1><div style="display:flex;flex-wrap:wrap;gap:8px">${steps}</div>`, 1160),
    resolve(out, "steps.png"),
  );
  await savePicture(
    lab,
    page(`<h1>${name}: each slide's final state (walk · reduced motion · overview · print)</h1>${sheet.join("")}`, 1000),
    resolve(out, "final-states.png"),
  );

  for (const [i, m] of moves.entries()) {
    if (!m.frames) {
      continue;
    }

    const bad = new Set<number>();

    if (m.start > POP) {
      bad.add(1);
    }

    if (m.finish > POP) {
      bad.add(m.frames.length - 1);
    }

    for (const p of m.pops) {
      const t = Number(/between (?<from>\d+) ms/u.exec(p)?.groups?.from ?? Number.NaN);
      const at = m.frames.findIndex((f) => f.t > t);

      if (at !== -1) {
        bad.add(at);
      }
    }

    const slug = `${m.from}-${m.kind}`.replaceAll(/[^\w.-]+/gu, "_").replaceAll(/_+/gu, "_");
    const verdict = [...m.pops, ...m.flashes].join("; ") || "ok";
    const html = stripHtml(`${m.from} → ${m.to} · ${m.kind} · ${m.end} ms · ${verdict}`, m.frames, bad);
    await savePicture(
      lab,
      page(html, STRIP_WIDTH),
      resolve(out, "motion", `${String(i).padStart(3, "0")}-${m.back ? "back" : "forward"}-${slug}.png`),
    );
  }

  await ctx.close();
}
