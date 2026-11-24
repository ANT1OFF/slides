import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { DisplayContext, StepContext, type Display } from "./context.ts";
import { Overview } from "./Overview.tsx";
import { Print } from "./Print.tsx";
import { Stage, fitScale, useWindowSize } from "./Stage.tsx";
import { isMessage, postTarget, presenterUrl, sameOrigin, type Message, type Position } from "./sync.ts";
import { Help } from "./Help.tsx";
import { DeckContext, deckLook } from "./theme.ts";
import { entries, slideLabel, slideNumber, slideTags, type DeckDefinition } from "./types.ts";

/** The motion tokens a slide transition reads. It runs on <html>, above the stage where a theme sets them. */
const TRANSITION_TOKENS = ["--duration-base", "--ease-in-out"];
const TRANSITION_STATE = ["--transition-in", "--transition-out", "--transition-direction", ...TRANSITION_TOKENS];

function indexFromHash(count: number): number {
  const n = Number.parseInt(window.location.hash.slice(1), 10);
  return Number.isFinite(n) ? Math.min(Math.max(n - 1, 0), count - 1) : 0;
}

/**
 * Presents a deck on a fixed 1920×1080 stage scaled to the window. The URL hash is the
 * 1-based slide number. Keys: → / Space / ← step through builds and slides, Home / End,
 * a number then Enter to jump, F fullscreen, N presenter window, G overview, P print to PDF,
 * B blank screen, M raw numbers or growth, ? the list of keys. See KEYS in Help.tsx.
 * A deck or a slide can name a `transition`; it runs as a view transition (see motion.css).
 * `name` is the deck's folder, which the page-review tags carry.
 */
export function Deck({ deck, name }: { deck: DeckDefinition; name: string }) {
  const slides = useMemo(() => entries(deck), [deck]);
  const look = useMemo(() => deckLook(deck), [deck]);
  const count = slides.length;
  const [pos, setPos] = useState<Position>(() => ({ index: indexFromHash(count), step: 0 }));
  const [mode, setMode] = useState<"present" | "overview" | "print">("present");
  const [display, setDisplay] = useState<Display>(() => {
    const asked = new URLSearchParams(location.search).get("display");
    return asked === "relative" || asked === "absolute" ? asked : (deck.display ?? "absolute");
  });
  const [toast, setToast] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [blank, setBlank] = useState(false);
  const typed = useRef("");
  const steps = useRef(0);
  // The same count as `steps`, for the page-review tags, which render once the Builds register.
  const [built, setBuilt] = useState({ index: -1, count: 0 });
  const presenter = useRef<Window | null>(null);
  const { width, height } = useWindowSize();

  const register = useCallback(
    (at: number) => {
      steps.current = Math.max(steps.current, at);
      setBuilt((b) =>
        b.index === pos.index && b.count >= at ? b : { index: pos.index, count: b.index === pos.index ? Math.max(b.count, at) : at },
      );
    },
    [pos.index],
  );

  // The latest move asked for. A transition applies its move a frame later, and another key may
  // land in between, so every apply, immediate or delayed, applies this one.
  const target = useRef(pos);
  // The newest transition, so an older one finishing doesn't clear its state.
  const run = useRef(0);
  // True when the current slide arrived without a transition: it then plays the plain entrance.
  const plain = useRef(true);

  const goto = useCallback(
    (index: number, step = 0) => {
      const i = Math.min(Math.max(index, 0), count - 1);
      const from = target.current.index;
      target.current = { index: i, step };
      const apply = () =>
        setPos((p) => {
          if (p.index !== target.current.index) steps.current = 0;
          return target.current;
        });
      if (i === from) return apply();
      // Going back plays the transition the slide being left arrived with, reversed.
      const back = i < from;
      const name = (back ? slides[from] : slides[i]).transition ?? deck.transition;
      // Without a transition, without browser support or with reduced motion, the slide just changes.
      plain.current =
        !name || name === "none" || !document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (plain.current) return apply();
      const root = document.documentElement;
      const stage = document.querySelector("[data-deck-mode=present] [data-stage]");
      root.dataset.transition = name;
      root.toggleAttribute("data-transition-back", back);
      root.style.setProperty("--transition-in", back ? `${name}-out` : `${name}-in`);
      root.style.setProperty("--transition-out", back ? `${name}-in` : `${name}-out`);
      root.style.setProperty("--transition-direction", back ? "reverse" : "normal");
      if (stage) for (const t of TRANSITION_TOKENS) root.style.setProperty(t, getComputedStyle(stage).getPropertyValue(t));
      const mine = ++run.current;
      const done = () => {
        if (mine !== run.current) return;
        delete root.dataset.transition;
        root.removeAttribute("data-transition-back");
        for (const p of TRANSITION_STATE) root.style.removeProperty(p);
      };
      const transition = document.startViewTransition(() => flushSync(apply));
      // A newer transition skips this one, which rejects `ready`: expected, not an error.
      transition.ready.catch(() => {});
      transition.finished.then(done, done);
    },
    [count, slides, deck.transition],
  );

  const neighbour = useCallback(
    (from: number, dir: 1 | -1) => {
      for (let i = from + dir; i >= 0 && i < count; i += dir) if (!slides[i].hidden) return i;
      return from;
    },
    [count, slides],
  );

  const nav = useCallback(
    (dir: 1 | -1) => {
      const step = Math.min(pos.step, steps.current);
      if (dir === 1 && step < steps.current) return goto(pos.index, step + 1);
      if (dir === -1 && step > 0) return goto(pos.index, step - 1);
      const next = neighbour(pos.index, dir);
      if (next !== pos.index) goto(next, dir === -1 ? Number.POSITIVE_INFINITY : 0);
    },
    [pos, goto, neighbour],
  );

  useEffect(() => {
    document.title = deck.title;
  }, [deck.title]);

  useEffect(() => {
    history.replaceState(null, "", `${location.pathname}${location.search}#${pos.index + 1}`);
    presenter.current?.postMessage({ type: "slides:state", position: pos, display } satisfies Message, postTarget());
  }, [pos, display]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onHashChange = () => goto(indexFromHash(count));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [count, goto]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Only the presenter window this deck opened (N), from the same origin, may drive it.
      if (!presenter.current || e.source !== presenter.current || !sameOrigin(e) || !isMessage(e.data)) return;
      const m = e.data;
      if (m.type === "slides:hello")
        presenter.current.postMessage({ type: "slides:state", position: pos, display } satisfies Message, postTarget());
      else if (m.type === "slides:nav") nav(m.dir);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [pos, display, nav]);

  // While a transition runs the browser sends every click to <html>, not to the deck under it.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.target !== document.documentElement || !document.documentElement.dataset.transition) return;
      if (mode === "present" && !help && !blank) nav(e.clientX > window.innerWidth / 3 ? 1 : -1);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [mode, help, blank, nav]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Letter keys work with Shift or Caps Lock too.
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (mode === "overview") {
        if (key === "Escape" || key === "g") setMode("present");
        return;
      }
      if (help) {
        if (e.key === "Escape" || e.key === "?") setHelp(false);
        return;
      }
      if (blank) {
        setBlank(false);
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        typed.current = (typed.current + e.key).slice(-4);
        setToast(`Go to ${typed.current} ⏎`);
        return;
      }
      if (e.key === "Enter" && typed.current) {
        const n = Number(typed.current);
        typed.current = "";
        setToast(null);
        goto(n - 1);
        return;
      }
      typed.current = "";
      switch (key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          nav(1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          nav(-1);
          break;
        case "Home":
          goto(neighbour(-1, 1));
          break;
        case "End":
          goto(neighbour(count, -1), Number.POSITIVE_INFINITY);
          break;
        case "f":
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen();
          break;
        case "n":
          presenter.current = window.open(presenterUrl(), "slides-presenter", "width=1280,height=800");
          break;
        case "g":
          setMode("overview");
          break;
        case "p":
          setMode("print");
          break;
        case "b":
        case ".":
          setBlank((b) => !b);
          break;
        case "?":
          setHelp(true);
          break;
        case "Escape":
          setBlank(false);
          break;
        case "m": {
          const next = display === "absolute" ? "relative" : "absolute";
          setDisplay(next);
          setToast(next === "relative" ? "Growth and shares" : "Raw numbers");
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, help, blank, display, nav, goto, neighbour, count]);

  if (mode === "print") {
    return (
      <DeckContext.Provider value={look}>
        <DisplayContext.Provider value={display}>
          <Print slides={slides} name={name} onDone={() => setMode("present")} />
        </DisplayContext.Provider>
      </DeckContext.Provider>
    );
  }

  const current = slides[pos.index];
  const scale = fitScale(width, height);
  const { progress } = slideLabel(slides, pos.index);
  const buildCount = built.index === pos.index ? built.count : 0;

  return (
    <DeckContext.Provider value={look}>
      <DisplayContext.Provider value={display}>
        <div
          data-deck={name}
          data-deck-mode="present"
          className="fixed inset-0 grid place-items-center overflow-hidden bg-black"
          onClick={(e) => nav(e.clientX > window.innerWidth / 3 ? 1 : -1)}
        >
          <Stage scale={scale} number={slideNumber(slides, pos.index)}>
            <StepContext.Provider value={{ step: pos.step, register }}>
              <div
                key={pos.index}
                {...slideTags(current, pos.index)}
                data-build={Math.min(pos.step, buildCount)}
                data-build-count={buildCount}
                className={`absolute inset-0 ${plain.current ? "slide-enter" : ""}`}
                style={{ viewTransitionName: "slide" }}
              >
                {current.content}
              </div>
            </StepContext.Provider>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-rule">
              <div className="h-full bg-accent transition-[width] duration-500 ease-out-expo" style={{ width: `${progress * 100}%` }} />
            </div>
          </Stage>
        </div>
        {mode === "overview" && (
          <Overview
            slides={slides}
            name={name}
            current={pos.index}
            onPick={(i) => {
              goto(i);
              setMode("present");
            }}
            onClose={() => setMode("present")}
          />
        )}
        {toast && (
          <div className="pointer-events-none fixed top-6 left-1/2 -translate-x-1/2 rounded-full bg-ink/90 px-6 py-2 font-mono text-sm tracking-widest text-canvas uppercase">
            {toast}
          </div>
        )}
        {blank && <div className="fixed inset-0 bg-black" onClick={() => setBlank(false)} />}
        {help && <Help onClose={() => setHelp(false)} />}
      </DisplayContext.Provider>
    </DeckContext.Provider>
  );
}
